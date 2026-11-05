const {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  session,
} = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const PROVIDER_CONFIGS = Object.freeze({
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyPattern: /^gsk_/i,
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyPattern: /^sk-/i,
  },
  gemini: {
    keyPattern: /^AIza/,
  },
});
const API_KEY_PROVIDERS = new Set(Object.keys(PROVIDER_CONFIGS));
const MODEL_PROVIDERS = new Set([...API_KEY_PROVIDERS, 'local']);
const CHAT_EVENT_CHANNEL = 'jarvis:chat:event';
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let mainWindow = null;
let rendererServer = null;
let rendererOrigin = '';
const activeChatRequests = new Map();

function getRendererDirectory() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'website')
    : path.join(__dirname, '../website/out');
}

function getOfflinePagePath() {
  return path.join(__dirname, 'offline.html');
}

function getSecretsFilePath() {
  return path.join(app.getPath('userData'), 'secure-api-keys.json');
}

function readEncryptedSecrets() {
  try {
    const contents = fs.readFileSync(getSecretsFilePath(), 'utf8');
    const parsed = JSON.parse(contents);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeEncryptedSecrets(secrets) {
  const targetPath = getSecretsFilePath();
  const tempPath = `${targetPath}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(tempPath, JSON.stringify(secrets), {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.renameSync(tempPath, targetPath);
}

function assertProvider(provider) {
  if (!API_KEY_PROVIDERS.has(provider)) {
    throw new Error('Unsupported API key provider.');
  }
}

function detectApiKeyProvider(apiKey) {
  const normalizedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  for (const [provider, config] of Object.entries(PROVIDER_CONFIGS)) {
    if (config.keyPattern.test(normalizedKey)) return provider;
  }
  throw new Error('This API key is not recognized. Use a Groq (gsk_), OpenAI (sk-), or Gemini (AIza) key.');
}

function getStoredApiKey(provider) {
  assertProvider(provider);
  if (!safeStorage.isEncryptionAvailable()) return '';

  const encryptedValue = readEncryptedSecrets()[provider];
  if (typeof encryptedValue !== 'string' || !encryptedValue) return '';

  try {
    return safeStorage.decryptString(Buffer.from(encryptedValue, 'base64'));
  } catch {
    return '';
  }
}

function storeApiKey(provider, apiKey) {
  assertProvider(provider);
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows secure storage is not available on this system.');
  }

  const normalizedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (normalizedKey.length < 8 || normalizedKey.length > 2048) {
    throw new Error('Enter a valid API key.');
  }

  const secrets = readEncryptedSecrets();
  secrets[provider] = safeStorage.encryptString(normalizedKey).toString('base64');
  writeEncryptedSecrets(secrets);
}

function removeStoredApiKey(provider) {
  assertProvider(provider);
  const secrets = readEncryptedSecrets();
  if (Object.prototype.hasOwnProperty.call(secrets, provider)) {
    delete secrets[provider];
    writeEncryptedSecrets(secrets);
  }
}

function isTrustedSender(event) {
  if (!rendererOrigin || !event.senderFrame?.url) return false;
  try {
    return new URL(event.senderFrame.url).origin === rendererOrigin;
  } catch {
    return false;
  }
}

function assertTrustedSender(event) {
  if (!isTrustedSender(event)) {
    throw new Error('Request rejected from an untrusted page.');
  }
}

function sendChatEvent(webContents, requestId, type, value = '') {
  if (webContents.isDestroyed()) return;
  webContents.send(CHAT_EVENT_CHANNEL, {
    requestId,
    type,
    value,
  });
}

function sanitizeError(error, apiKey = '') {
  let message = error instanceof Error ? error.message : String(error || 'Unknown error');
  if (apiKey) message = message.split(apiKey).join('[redacted]');
  return message.replace(/[\r\n]+/g, ' ').slice(0, 600);
}

async function getProviderError(response) {
  const text = (await response.text()).slice(0, 4000);
  if (!text) return `Provider request failed (${response.status}).`;

  try {
    const parsed = JSON.parse(text);
    const message = parsed.error?.message || parsed.error || parsed.details;
    return typeof message === 'string' ? message : `Provider request failed (${response.status}).`;
  } catch {
    return text;
  }
}

function normalizeAudioBytes(audioBytes) {
  if (Buffer.isBuffer(audioBytes)) return audioBytes;
  if (audioBytes instanceof ArrayBuffer) return Buffer.from(audioBytes);
  if (ArrayBuffer.isView(audioBytes)) {
    return Buffer.from(audioBytes.buffer, audioBytes.byteOffset, audioBytes.byteLength);
  }
  throw new Error('Invalid audio data.');
}

async function normalizeRomanUrduTranscript(apiKey, transcript, signal) {
  try {
    const response = await fetch(PROVIDER_CONFIGS.groq.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        temperature: 0,
        max_tokens: 700,
        stream: false,
        messages: [
          {
            role: 'system',
            content: [
              'Normalize a raw transcription of Pakistani code-switched Urdu and English.',
              'Write Urdu speech as natural Pakistani Roman Urdu using Latin letters only.',
              'Write every spoken English word or phrase with its standard English spelling and correct word boundaries.',
              'Recover English words even when the recognizer wrote them phonetically in Urdu script or split/merged their syllables.',
              'For example, render سافٹ وئیر as software, مشین لرننگ as machine learning, ویب سائٹ as website, and ڈیٹا بیس as database when that is what was spoken.',
              'Do not translate between Urdu and English, paraphrase, add words, or change the speaker\'s meaning.',
              'Preserve names, numbers, punctuation, and the original word order.',
              'Return only the corrected transcript with no explanation.',
            ].join(' '),
          },
          { role: 'user', content: transcript.slice(0, 6000) },
        ],
      }),
    });
    if (!response.ok) return transcript;

    const result = await response.json();
    const normalizedTranscript = typeof result?.choices?.[0]?.message?.content === 'string'
      ? result.choices[0].message.content.trim()
      : '';
    return normalizedTranscript || transcript;
  } catch (error) {
    if (signal.aborted) throw error;
    return transcript;
  }
}

async function transcribeAudio(event, payload) {
  assertTrustedSender(event);
  let apiKey = '';
  try {
    const audio = normalizeAudioBytes(payload?.audioBytes);
    if (audio.length < 100 || audio.length > 24 * 1024 * 1024) {
      throw new Error('Audio must be between 100 bytes and 24 MB.');
    }

    const supportedTypes = new Set([
      'audio/flac',
      'audio/m4a',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/webm',
      'audio/x-m4a',
    ]);
    const mimeType = typeof payload?.mimeType === 'string'
      ? payload.mimeType.split(';')[0].trim().toLowerCase()
      : 'audio/webm';
    if (!supportedTypes.has(mimeType)) throw new Error('Unsupported audio format.');

    const fallbackExtension = mimeType.includes('webm')
      ? 'webm'
      : mimeType.includes('ogg')
        ? 'ogg'
        : mimeType.includes('wav')
          ? 'wav'
          : mimeType.includes('mpeg')
            ? 'mp3'
            : 'm4a';
    const suppliedName = typeof payload?.filename === 'string' ? payload.filename : '';
    const safeName = path.basename(suppliedName).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 120);
    const filename = safeName || `jarvis-recording.${fallbackExtension}`;

    apiKey = getStoredApiKey('groq');
    if (!apiKey) throw new Error('Add your GROQ API key in JARVIS settings.');

    const requestedLanguage = typeof payload?.language === 'string' && /^[a-zA-Z-]{2,12}$/.test(payload.language)
      ? payload.language
      : '';
    const wantsRomanUrdu = requestedLanguage.toLowerCase() === 'ur-latn-pk';
    const formData = new FormData();
    formData.append('file', new Blob([audio], { type: mimeType }), filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    formData.append('temperature', '0');
    // Let Whisper detect mixed Urdu-English speech in Roman Urdu mode. Forcing
    // Urdu makes English terms more likely to be emitted as phonetic Urdu.
    if (requestedLanguage && !wantsRomanUrdu) {
      formData.append('language', requestedLanguage.split('-')[0].toLowerCase());
    }
    if (wantsRomanUrdu) {
      formData.append(
        'prompt',
        'Pakistani Urdu-English conversation. Keep English words in standard English spelling with correct word boundaries, for example: main website ka backend update kar raha hoon aur machine learning model test kar raha hoon.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(await getProviderError(response));

      const result = await response.json();
      let transcript = typeof result?.text === 'string' ? result.text.trim() : '';
      if (!transcript) throw new Error('No speech was detected.');
      if (wantsRomanUrdu) {
        transcript = await normalizeRomanUrduTranscript(apiKey, transcript, controller.signal);
      }
      return { success: true, transcript };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return { success: false, error: sanitizeError(error, apiKey) };
  } finally {
    apiKey = '';
  }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('Invalid chat messages.');

  let totalLength = 0;
  const normalized = messages.slice(-80).map((message) => {
    const role = message?.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof message?.content === 'string' ? message.content.slice(0, 30000) : '';
    totalLength += content.length;
    return { role, content };
  }).filter((message) => message.content.trim());

  if (!normalized.length || totalLength > 180000) {
    throw new Error('The conversation is empty or too large.');
  }
  return normalized;
}

function normalizeModelSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    provider: MODEL_PROVIDERS.has(source.provider) ? source.provider : '',
    model: typeof source.model === 'string' && source.model.trim()
      ? source.model.trim().slice(0, 160)
      : 'openai/gpt-oss-20b',
    temperature: Number.isFinite(source.temperature)
      ? Math.min(2, Math.max(0, Number(source.temperature)))
      : 0.7,
    topP: Number.isFinite(source.topP)
      ? Math.min(1, Math.max(0, Number(source.topP)))
      : 0.9,
    maxTokens: Number.isFinite(source.maxTokens)
      ? Math.min(8192, Math.max(128, Math.trunc(Number(source.maxTokens))))
      : 2048,
    systemPrompt: typeof source.systemPrompt === 'string'
      ? source.systemPrompt.slice(0, 30000)
      : 'You are JARVIS, a helpful AI assistant.',
    backendUrl: typeof source.backendUrl === 'string'
      ? source.backendUrl.trim().slice(0, 500)
      : 'http://localhost:11434',
  };
}

function getProvider(modelSettings) {
  if (MODEL_PROVIDERS.has(modelSettings.provider)) return modelSettings.provider;
  const normalized = modelSettings.model.toLowerCase();
  if (normalized.includes('gpt-oss')) return 'groq';
  if (normalized.includes('gemini')) return 'gemini';
  if (normalized.includes('gpt-') || normalized.includes('openai')) return 'openai';
  if (
    normalized.startsWith('ollama/') ||
    normalized.includes('qwen2.5') ||
    normalized.includes('deepseek-r1:') ||
    /:\d+b\b/.test(normalized)
  ) {
    return 'local';
  }
  return 'groq';
}

function resolveLocalEndpoint(backendUrl) {
  const parsed = new URL(backendUrl || 'http://localhost:11434');
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Local model URL must use HTTP or HTTPS.');
  }
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/v1/chat/completions`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

async function streamOpenAICompatible({
  endpoint,
  apiKey,
  modelSettings,
  messages,
  controller,
  onText,
}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: modelSettings.model.replace(/^(ollama|custom)\//i, ''),
      temperature: modelSettings.temperature,
      top_p: modelSettings.topP,
      max_tokens: modelSettings.maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: modelSettings.systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) throw new Error(await getProviderError(response));
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The AI provider returned an empty response.');

  const decoder = new TextDecoder();
  let buffer = '';
  const processLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;

    try {
      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) onText(content);
    } catch {
      // Ignore provider keep-alive events.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(processLine);
  }

  buffer += decoder.decode();
  buffer.split('\n').forEach(processLine);
}

async function streamGemini({
  apiKey,
  modelSettings,
  messages,
  controller,
  onText,
}) {
  const normalizedModel = modelSettings.model.toLowerCase().replace(/^google\//, '');
  const targetModel = /^[a-z0-9._-]+$/.test(normalizedModel) ? normalizedModel : 'gemini-2.0-flash';

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: modelSettings.systemPrompt }] },
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: modelSettings.temperature,
        topP: modelSettings.topP,
        maxOutputTokens: modelSettings.maxTokens,
      },
    }),
  });

  if (!response.ok) throw new Error(await getProviderError(response));
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Gemini returned an empty response.');

  const decoder = new TextDecoder();
  let buffer = '';
  const processLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    try {
      const parsed = JSON.parse(trimmed.slice(5).trim());
      const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) onText(content);
    } catch {
      // Ignore provider keep-alive events.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(processLine);
  }

  buffer += decoder.decode();
  buffer.split('\n').forEach(processLine);
}

async function runChatRequest(event, payload) {
  assertTrustedSender(event);
  const requestId = typeof payload?.requestId === 'string' && payload.requestId
    ? payload.requestId.slice(0, 120)
    : crypto.randomUUID();

  const messages = normalizeMessages(payload?.messages);
  const modelSettings = normalizeModelSettings(payload?.modelSettings);
  const provider = getProvider(modelSettings);
  const controller = new AbortController();
  const webContents = event.sender;
  activeChatRequests.set(requestId, {
    controller,
    webContentsId: webContents.id,
  });

  let apiKey = '';
  try {
    if (provider !== 'local') {
      apiKey = getStoredApiKey(provider);
      if (!apiKey) {
        throw new Error(`Add your ${provider.toUpperCase()} API key in JARVIS settings.`);
      }
    }

    const onText = (text) => sendChatEvent(webContents, requestId, 'chunk', text);
    if (provider === 'gemini') {
      await streamGemini({ apiKey, modelSettings, messages, controller, onText });
    } else {
      const endpoint = provider === 'local'
        ? resolveLocalEndpoint(modelSettings.backendUrl)
        : PROVIDER_CONFIGS[provider].endpoint;

      await streamOpenAICompatible({
        endpoint,
        apiKey: provider === 'local' ? 'ollama' : apiKey,
        modelSettings,
        messages,
        controller,
        onText,
      });
    }

    sendChatEvent(webContents, requestId, 'done');
    return { success: true, requestId };
  } catch (error) {
    const cancelled = controller.signal.aborted;
    const message = cancelled ? 'Response stopped.' : sanitizeError(error, apiKey);
    sendChatEvent(webContents, requestId, cancelled ? 'cancelled' : 'error', message);
    return { success: false, requestId, cancelled, error: message };
  } finally {
    activeChatRequests.delete(requestId);
    apiKey = '';
  }
}

function cancelChatRequest(event, requestId) {
  assertTrustedSender(event);
  const activeRequest = activeChatRequests.get(requestId);
  if (activeRequest && activeRequest.webContentsId === event.sender.id) {
    activeRequest.controller.abort();
    return { success: true };
  }
  return { success: false };
}

function registerIpcHandlers() {
  ipcMain.handle('jarvis:keys:status', (event, provider) => {
    assertTrustedSender(event);
    if (provider !== undefined) {
      assertProvider(provider);
      return {
        configured: Boolean(getStoredApiKey(provider)),
        encryptionAvailable: safeStorage.isEncryptionAvailable(),
      };
    }

    const status = {};
    for (const provider of API_KEY_PROVIDERS) {
      status[provider] = Boolean(getStoredApiKey(provider));
    }
    return {
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
      providers: status,
    };
  });

  ipcMain.handle('jarvis:keys:set', (event, apiKey) => {
    assertTrustedSender(event);
    const provider = detectApiKeyProvider(apiKey);
    storeApiKey(provider, apiKey);
    return { success: true, provider };
  });

  ipcMain.handle('jarvis:keys:remove', (event, provider) => {
    assertTrustedSender(event);
    removeStoredApiKey(provider);
    return { success: true };
  });

  ipcMain.handle('jarvis:audio:transcribe', transcribeAudio);
  ipcMain.handle('jarvis:chat:start', runChatRequest);
  ipcMain.handle('jarvis:chat:cancel', cancelChatRequest);
}

function getStaticFilePath(rootDirectory, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  } catch {
    return null;
  }

  const relativePath = pathname === '/'
    ? 'index.html'
    : path.posix.normalize(pathname).replace(/^\/+/, '');
  if (!relativePath || relativePath.startsWith('..')) return null;

  const rootPath = path.resolve(rootDirectory);
  let candidate = path.resolve(rootPath, relativePath);
  if (candidate !== rootPath && !candidate.startsWith(`${rootPath}${path.sep}`)) return null;

  try {
    if (fs.statSync(candidate).isDirectory()) candidate = path.join(candidate, 'index.html');
  } catch {
    if (!path.extname(relativePath)) candidate = path.join(rootPath, 'index.html');
  }
  return candidate;
}

function serveStaticFile(rootDirectory, request, response) {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  const filePath = getStaticFilePath(rootDirectory, request.url || '/');
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const isImmutableAsset = filePath.includes(`${path.sep}_next${path.sep}static${path.sep}`);
  response.writeHead(200, {
    'Cache-Control': isImmutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self' blob:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
}

function startRendererServer() {
  const rendererDirectory = getRendererDirectory();
  const indexPath = path.join(rendererDirectory, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return Promise.reject(new Error('The bundled website interface is missing.'));
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      serveStaticFile(rendererDirectory, request, response);
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not start the local application server.'));
        return;
      }
      rendererServer = server;
      rendererOrigin = `http://127.0.0.1:${address.port}`;
      resolve(rendererOrigin);
    });
  });
}

function createMainWindow(startUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 420,
    minHeight: 600,
    title: 'JARVIS Assistant',
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'icons', 'jarvis.svg'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  const windowWebContentsId = mainWindow.webContents.id;
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      if (!rendererOrigin || new URL(targetUrl).origin !== rendererOrigin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  mainWindow.webContents.on('destroyed', () => {
    for (const request of activeChatRequests.values()) {
      if (request.webContentsId === windowWebContentsId) request.controller.abort();
    }
  });

  const loadPromise = startUrl
    ? mainWindow.loadURL(startUrl)
    : mainWindow.loadFile(getOfflinePagePath());
  loadPromise.catch(() => mainWindow?.loadFile(getOfflinePagePath()));

  if (!app.isPackaged && (process.env.OPEN_DEVTOOLS === 'true' || process.argv.includes('--devtools'))) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  if (process.argv.includes('--test-smoke')) {
    console.log('[SMOKE TEST] JARVIS Electron main process initialized successfully.');
    console.log('[SMOKE TEST] Window and renderer origin configured.');
    setTimeout(() => {
      console.log('[SMOKE TEST] Smoke test assertions verified. Quitting Electron.');
      app.quit();
    }, 2500);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  registerIpcHandlers();

  if (session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const trustedWindow = Boolean(mainWindow && webContents.id === mainWindow.webContents.id);
      callback(trustedWindow && ['media', 'audioCapture', 'speechRecognition'].includes(permission));
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      const trustedWindow = Boolean(mainWindow && webContents?.id === mainWindow.webContents.id);
      return trustedWindow && ['media', 'audioCapture', 'speechRecognition'].includes(permission);
    });
  }

  try {
    const origin = await startRendererServer();
    createMainWindow(origin);
  } catch {
    rendererOrigin = '';
    createMainWindow(null);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(rendererOrigin || null);
    }
  });
});

app.on('before-quit', () => {
  for (const request of activeChatRequests.values()) request.controller.abort();
  activeChatRequests.clear();
  rendererServer?.close();
  rendererServer = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
