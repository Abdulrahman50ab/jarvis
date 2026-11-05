import { NextRequest } from 'next/server';

export const maxDuration = 60;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_MESSAGES = 40;
const MAX_TOTAL_MESSAGE_CHARS = 80_000;

type RateLimitEntry = { count: number; resetAt: number };
const globalForRateLimit = globalThis as typeof globalThis & {
  jarvisRateLimit?: Map<string, RateLimitEntry>;
};
const rateLimit = globalForRateLimit.jarvisRateLimit ?? new Map<string, RateLimitEntry>();
globalForRateLimit.jarvisRateLimit = rateLimit;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isRateLimited(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientId = forwardedFor || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const current = rateLimit.get(clientId);

  if (!current || current.resetAt <= now) {
    rateLimit.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return jsonError('Cross-origin requests are not allowed.', 403);
      } catch {
        return jsonError('Invalid request origin.', 400);
      }
    }

    if (isRateLimited(req)) return jsonError('Too many requests. Please wait a moment.', 429);

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 1_000_000) return jsonError('Request is too large.', 413);

    const { messages, modelSettings } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return jsonError('Invalid message history.', 400);
    }

    const safeMessages = messages.map((message: any) => ({
      role: message?.role === 'assistant' || message?.role === 'jarvis' ? 'assistant' : 'user',
      content: typeof message?.content === 'string' ? message.content : '',
    }));
    const totalMessageChars = safeMessages.reduce((total: number, message: any) => total + message.content.length, 0);
    if (totalMessageChars > MAX_TOTAL_MESSAGE_CHARS) return jsonError('Conversation is too large.', 413);

    const systemPrompt = String(
      modelSettings?.systemPrompt ||
        "You are JARVIS, a capable and thoughtful AI assistant. Give clear, accurate, and practical answers.",
    ).slice(0, 12_000);

    const rawModel = String(modelSettings?.model || 'openai/gpt-oss-20b').toLowerCase();
    const temperature = Math.min(2, Math.max(0, Number(modelSettings?.temperature ?? 0.7)));
    const topP = Math.min(1, Math.max(0, Number(modelSettings?.topP ?? 0.9)));
    const maxTokens = Math.min(4096, Math.max(128, Number(modelSettings?.maxTokens ?? 2048)));

    const requestedProvider = String(modelSettings?.provider || '').toLowerCase();
    const supportedProviders = new Set(['groq', 'openai', 'gemini', 'local', 'custom']);
    const detectedProvider = rawModel.includes('gpt-oss')
      ? 'groq'
      : rawModel.includes('gemini')
        ? 'gemini'
        : rawModel.includes('gpt-') || rawModel.includes('openai')
          ? 'openai'
        : rawModel.includes('ollama') || rawModel.includes('qwen2.5') || /:\d+b\b/.test(rawModel)
          ? 'local'
          : 'groq';
    const provider = supportedProviders.has(requestedProvider) ? requestedProvider : detectedProvider;
    const isGemini = provider === 'gemini';
    const isOpenAI = provider === 'openai';
    const isOllama = provider === 'local';
    const isCustom = provider === 'custom';

    if (isOllama) {
      return jsonError('Local models are available through the Windows application only.', 400);
    }

    // 1. Google Gemini Handler
    if (isGemini) {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return jsonError('The Gemini connection is not configured on this website. Use the desktop app for personal credentials.', 503);
      }

      // Map model name to valid Gemini model identifier
      let targetGeminiModel = 'gemini-1.5-flash';
      if (rawModel.includes('pro')) targetGeminiModel = 'gemini-1.5-pro';
      if (rawModel.includes('2.0')) targetGeminiModel = 'gemini-2.0-flash';
      if (rawModel.includes('3.6') || rawModel.includes('flash-high')) targetGeminiModel = 'gemini-1.5-flash'; // stable alias

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetGeminiModel}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

      const contents = safeMessages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || '' }]
        }));

      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: req.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature,
            topP,
            maxOutputTokens: maxTokens,
          }
        })
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(`Gemini API error: ${errText}`, { status: geminiRes.status });
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = geminiRes.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  try {
                    const json = JSON.parse(trimmed.slice(6));
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) controller.enqueue(encoder.encode(text));
                  } catch {}
                }
              }
            }
          } catch (e) {
            console.error('Gemini stream error:', e);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 2. OpenAI / Custom OpenAI compatible Handler
    let apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    let apiKey = process.env.GROQ_API_KEY;

    if (isOpenAI) {
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (isCustom) {
      apiEndpoint = process.env.CUSTOM_API_ENDPOINT || '';
      apiKey = process.env.CUSTOM_API_KEY;
      if (!apiEndpoint) {
        return jsonError('CUSTOM_API_ENDPOINT is not configured on the server.', 503);
      }
      try {
        const customUrl = new URL(apiEndpoint);
        if (customUrl.protocol !== 'https:') return jsonError('The custom API endpoint must use HTTPS.', 503);
      } catch {
        return jsonError('CUSTOM_API_ENDPOINT is invalid.', 503);
      }
    }

    if (!apiKey) {
      const name = isCustom ? 'custom provider' : isOpenAI ? 'OpenAI' : 'Groq';
      return jsonError(`The ${name} connection is not configured on this website. Use the desktop app for personal credentials.`, 503);
    }

    const apiRes = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: req.signal,
      body: JSON.stringify({
        model: modelSettings?.model || 'openai/gpt-oss-20b',
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeMessages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        ],
      }),
    });

    if (!apiRes.ok) {
      console.error('AI provider request failed with status:', apiRes.status);
      return jsonError('The AI provider could not complete the request.', 502);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = apiRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {}
            }
          }
        } catch (err) {
          console.error('Stream read error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return jsonError('Failed to process chat request.', 500);
  }
}
