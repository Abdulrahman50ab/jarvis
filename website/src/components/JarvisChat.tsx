"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  History,
  Loader2,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  PanelLeftClose,
  Plus,
  Send,
  Settings,
  Square,
  X,
} from "lucide-react";
import SettingsModal from "@/components/settings/SettingsModal";
import JarvisLogo from "@/components/JarvisLogo";
import { DESKTOP_APP_DOWNLOAD_URL } from "@/lib/desktop-app";
import { romanizeUrduText } from "@/lib/roman-urdu";
import { useSettingsStore } from "@/lib/settings-store";

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
}

interface LanguageOption {
  code: string;
  label: string;
  instruction: string;
  welcome: string;
  recognitionCode?: string;
}

interface ChatModelSettings {
  provider: "groq" | "openai" | "gemini" | "local";
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  backendUrl: string;
  requestTimeout: number;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: "en-US",
    label: "English",
    instruction: "Reply in clear, natural English unless the user asks for another language.",
    welcome: "Hello! I am JARVIS, your AI assistant. How can I help you today?",
  },
  {
    code: "ur-PK",
    label: "Urdu",
    instruction: "Reply in clear, natural Urdu using Urdu script unless the user asks for another style.",
    welcome: "السلام علیکم! میں جاروس ہوں۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟",
  },
  {
    code: "ur-Latn-PK",
    label: "Roman Urdu",
    instruction: "Always reply in natural Pakistani Roman Urdu using English/Latin letters only. Keep the language Urdu rather than Hindi or Hinglish, while allowing common English technical words. Match the user's spelling and casual or formal tone, and do not use Urdu script or Devanagari unless asked.",
    welcome: "Assalam-o-alaikum! Main JARVIS hoon. Aaj main aap ki kya madad kar sakta hoon?",
    recognitionCode: "ur-PK",
  },
  {
    code: "hi-IN",
    label: "Hindi",
    instruction: "Reply in clear, natural Hindi using Devanagari script unless the user asks for another style.",
    welcome: "नमस्ते! मैं JARVIS हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
  },
  {
    code: "hi-Latn-IN",
    label: "Hinglish",
    instruction: "Always reply in natural Hinglish using the Latin alphabet, mixing conversational Hindi and English in the same style as the user.",
    welcome: "Namaste! Main JARVIS hoon. Aaj main aapki kya help kar sakta hoon?",
    recognitionCode: "hi-IN",
  },
  {
    code: "ar-SA",
    label: "Arabic",
    instruction: "Reply in clear, natural Arabic unless the user asks for another language.",
    welcome: "مرحباً! أنا جارفيس، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟",
  },
  {
    code: "fr-FR",
    label: "French",
    instruction: "Reply in clear, natural French unless the user asks for another language.",
    welcome: "Bonjour ! Je suis JARVIS, votre assistant IA. Comment puis-je vous aider ?",
  },
  {
    code: "es-ES",
    label: "Spanish",
    instruction: "Reply in clear, natural Spanish unless the user asks for another language.",
    welcome: "¡Hola! Soy JARVIS, tu asistente de IA. ¿Cómo puedo ayudarte hoy?",
  },
  {
    code: "de-DE",
    label: "German",
    instruction: "Reply in clear, natural German unless the user asks for another language.",
    welcome: "Hallo! Ich bin JARVIS, dein KI-Assistent. Wie kann ich dir heute helfen?",
  },
  {
    code: "ja-JP",
    label: "Japanese",
    instruction: "Reply in clear, natural Japanese unless the user asks for another language.",
    welcome: "こんにちは。AIアシスタントのJARVISです。今日はどのようにお手伝いできますか？",
  },
  {
    code: "zh-CN",
    label: "Chinese",
    instruction: "Reply in clear, natural Simplified Chinese unless the user asks for another language.",
    welcome: "你好！我是你的 AI 助手 JARVIS。今天需要我帮你做什么？",
  },
];

function getLanguage(code: string) {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

const STARTER_PROMPTS = [
  { title: "Plan my day", prompt: "Help me make a realistic plan for today. Ask me what I need to get done first." },
  { title: "Draft a reply", prompt: "Help me draft a clear, professional reply. Ask me for the message and the tone I want." },
  { title: "Explain a topic", prompt: "Teach me a difficult topic step by step, starting by asking what I want to learn." },
  { title: "Debug a problem", prompt: "Help me debug a technical problem. Ask for the symptoms, code, and expected behavior." },
];

const PROVIDER_LABELS: Record<ChatModelSettings["provider"], string> = {
  groq: "Groq",
  openai: "OpenAI",
  gemini: "Gemini",
  local: "Local",
};

async function getResponseError(response: Response) {
  const text = await response.text();
  if (!text) return `Request failed with status ${response.status}.`;

  try {
    const parsed = JSON.parse(text);
    return parsed.error?.message || parsed.error || parsed.details || text;
  } catch {
    return text;
  }
}

async function requestAssistantResponse({
  messages,
  modelSettings,
  languageInstruction,
  signal,
  onText,
}: {
  messages: Message[];
  modelSettings: ChatModelSettings;
  languageInstruction: string;
  signal: AbortSignal;
  onText: (text: string) => void;
}) {
  const systemPrompt = `${modelSettings.systemPrompt}\n\n${languageInstruction}\nBe honest about your capabilities and never claim access you do not have.`;
  const resolvedModelSettings = { ...modelSettings, systemPrompt };

  if (window.electronAPI?.streamChat) {
    let ipcError = "";
    const cancelDesktopRequest = () => {
      void window.electronAPI?.cancelChat();
    };
    signal.addEventListener("abort", cancelDesktopRequest, { once: true });

    try {
      const result = await window.electronAPI.streamChat(
        { messages, modelSettings: resolvedModelSettings },
        (event) => {
          if (event.type === "chunk" && event.value) onText(event.value);
          if (event.type === "error") ipcError = event.value;
        },
      );

      if (!result.success) {
        if (result.cancelled || signal.aborted) throw new DOMException("Response stopped.", "AbortError");
        throw new Error(ipcError || result.error || "The desktop AI provider request failed.");
      }
      return;
    } finally {
      signal.removeEventListener("abort", cancelDesktopRequest);
    }
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      messages,
      modelSettings: resolvedModelSettings,
    }),
  });

  if (!response.ok) throw new Error(await getResponseError(response));
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The assistant returned an empty response.");

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onText(text);
  }
  const tail = decoder.decode();
  if (tail) onText(tail);
}

function MessageContent({ content }: { content: string }) {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  const parts: Array<{ type: "text" | "code"; text: string; language?: string; title?: string }> = [];
  const codePattern = /```([a-zA-Z0-9_-]*)(?::([^\n]+))?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codePattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "code",
      text: match[3],
      language: match[1] || "text",
      title: match[2]?.trim(),
    });
    lastIndex = codePattern.lastIndex;
  }

  if (lastIndex < content.length || parts.length === 0) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  const copyCode = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedBlock(index);
    window.setTimeout(() => setCopiedBlock(null), 1600);
  };

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div key={index} className="whitespace-pre-wrap break-words leading-7">
              {part.text.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")}
            </div>
          );
        }

        return (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#05080d] font-mono text-xs shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-zinc-300">
              <span className="truncate uppercase tracking-wider">
                {part.title || part.language || "code"}
              </span>
              <button
                type="button"
                onClick={() => copyCode(part.text, index)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                {copiedBlock === index ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedBlock === index ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 text-left leading-6 text-zinc-100">
              <code>{part.text}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-[var(--muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
      aria-label="Copy response"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function JarvisChat() {
  const settings = useSettingsStore();
  const initialLanguage = getLanguage(settings.voice.language);
  const [language, setLanguage] = useState(initialLanguage.code);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopApp, setIsDesktopApp] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const recordingTimeoutRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const handleSendRef = useRef<(text?: string) => void>(() => undefined);

  const activeLanguage = useMemo(() => getLanguage(language), [language]);

  useEffect(() => {
    const selected = getLanguage(settings.voice.language);
    setLanguage(selected.code);
  }, [settings.voice.language]);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
    setIsDesktopApp(Boolean(window.electronAPI));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const resolvedTheme = settings.themeMode === "system"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : settings.themeMode;
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    };
    applyTheme();
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", applyTheme);

    if (/^#[0-9a-f]{6}$/i.test(settings.accentColor)) {
      root.style.setProperty("--accent", settings.accentColor);
    }
    const font = settings.fontFamily === "monospace"
      ? "ui-monospace, SFMono-Regular, Consolas, monospace"
      : settings.fontFamily === "custom"
        ? "Georgia, Cambria, serif"
        : "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    root.style.setProperty("--jarvis-font", font);
    root.style.setProperty("--jarvis-font-size", `${settings.fontSize}px`);
    root.style.setProperty("--jarvis-line-height", String(settings.lineHeight));
    root.classList.toggle("reduce-motion", settings.reducedMotion);

    return () => media.removeEventListener("change", applyTheme);
  }, [settings.accentColor, settings.fontFamily, settings.fontSize, settings.lineHeight, settings.reducedMotion, settings.themeMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: settings.reducedMotion ? "auto" : "smooth", block: "end" });
  }, [isLoading, messages, settings.reducedMotion]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    if (!settings.voice.autoSpeak && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  }, [settings.voice.autoSpeak]);

  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const currentSettings = useSettingsStore.getState();
    if (!currentSettings.voice.autoSpeak || currentSettings.voice.volume === 0) {
      setIsSpeaking(false);
      return;
    }

    const withoutCode = currentSettings.voice.skipCodeBlocks
      ? text.replace(/```[\s\S]*?```/g, " Code block omitted. ")
      : text;
    const cleanText = withoutCode.replace(/[*#_`~>-]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const selectedLanguage = getLanguage(currentSettings.voice.language);
    const speechLanguage = selectedLanguage.recognitionCode || selectedLanguage.code;
    const languagePrefix = speechLanguage.split("-")[0];
    const selectedVoice =
      voices.find((voice) => voice.name === currentSettings.voice.voice) ||
      voices.find((voice) => voice.lang.startsWith(languagePrefix)) ||
      voices.find((voice) => voice.lang.startsWith("en"));

    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = speechLanguage;
    utterance.rate = currentSettings.voice.rate;
    utterance.pitch = currentSettings.voice.pitch;
    utterance.volume = currentSettings.voice.volume;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopListening = useCallback((discardRecording = true) => {
    isListeningRef.current = false;
    setIsListening(false);

    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      discardRecordingRef.current = discardRecording;
      mediaRecorderRef.current.stop();
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // Recognition may already be stopped.
    }
  }, []);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleSend = useCallback(
    async (customText?: string) => {
      const textToSend = (customText ?? input).trim();
      if (!textToSend || isLoadingRef.current) return;

      stopListening(true);
      setNotice("");
      setInput("");
      setIsLoading(true);
      isLoadingRef.current = true;

      const userMessage: Message = { role: "user", content: textToSend, createdAt: Date.now() };
      const requestMessages = [...messages, userMessage];
      const providerMessages = requestMessages.filter(
        (message, index) => !(index === 0 && message.role === "assistant"),
      );
      const assistantIndex = requestMessages.length;
      const requestId = ++requestIdRef.current;
      setMessages([...requestMessages, { role: "assistant", content: "", createdAt: Date.now() }]);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeout = window.setTimeout(
        () => controller.abort(),
        Math.max(5000, settings.aiModel.requestTimeout || 60000),
      );
      let accumulated = "";

      try {
        await requestAssistantResponse({
          messages: providerMessages,
          modelSettings: settings.aiModel,
          languageInstruction: activeLanguage.instruction,
          signal: controller.signal,
          onText: (chunk) => {
            accumulated += chunk;
            setMessages((current) => {
              if (requestIdRef.current !== requestId) return current;
              const next = [...current];
              next[assistantIndex] = { ...next[assistantIndex], role: "assistant", content: accumulated };
              return next;
            });
          },
        });

        if (!accumulated.trim()) {
          accumulated = "I received an empty response. Please try again.";
          setMessages((current) => {
            if (requestIdRef.current !== requestId) return current;
            const next = [...current];
            next[assistantIndex] = { ...next[assistantIndex], role: "assistant", content: accumulated };
            return next;
          });
        }
        if (requestIdRef.current === requestId) speakText(accumulated);
      } catch (error) {
        const wasAborted = error instanceof DOMException && error.name === "AbortError";
        const errorMessage = wasAborted
          ? accumulated || "Response stopped."
          : `I could not connect to the AI service. ${error instanceof Error ? error.message : "Please try again."}`;

        setMessages((current) => {
          if (requestIdRef.current !== requestId) return current;
          const next = [...current];
          next[assistantIndex] = { ...next[assistantIndex], role: "assistant", content: errorMessage };
          return next;
        });
        if (!wasAborted && requestIdRef.current === requestId) {
          setNotice("Connection problem. Please try again or check the server configuration.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (requestIdRef.current === requestId) {
          abortControllerRef.current = null;
          setIsLoading(false);
          isLoadingRef.current = false;
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }
      }
    },
    [activeLanguage.instruction, input, messages, settings.aiModel, speakText, stopListening],
  );

  useEffect(() => {
    handleSendRef.current = (text?: string) => void handleSend(text);
  }, [handleSend]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeLanguage.recognitionCode || activeLanguage.code;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setNotice("");
    };
    recognition.onend = () => {
      if (isListeningRef.current && !isLoadingRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Restart failed
        }
      }
      isListeningRef.current = false;
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      isListeningRef.current = false;
      setIsListening(false);
      setNotice(`Microphone error: ${event.error || "speech recognition failed"}.`);
    };
    recognition.onresult = (event: any) => {
      let fullTranscript = "";
      let hasFinal = false;

      for (let i = 0; i < event.results.length; i += 1) {
        const item = event.results[i];
        if (item?.[0]?.transcript) {
          fullTranscript += item[0].transcript;
          if (item.isFinal) {
            hasFinal = true;
          }
        }
      }

      const trimmed = fullTranscript.trim();
      if (!trimmed) return;

      const formatted = activeLanguage.code === "ur-Latn-PK"
        ? romanizeUrduText(trimmed)
        : trimmed;

      // Live real-time typing into the chat field as the user speaks
      setInput(formatted);

      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (hasFinal && !isLoadingRef.current) {
        silenceTimerRef.current = window.setTimeout(() => {
          if (isListeningRef.current && !isLoadingRef.current) {
            stopListening(false);
            handleSendRef.current(formatted);
          }
        }, 1500);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      isListeningRef.current = false;
      recognition.onend = null;
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      try {
        recognition.abort();
      } catch {
        // Recognition may not have started.
      }
      recognitionRef.current = null;
    };
  }, [activeLanguage.code, activeLanguage.recognitionCode, stopListening]);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) window.clearTimeout(recordingTimeoutRef.current);
      discardRecordingRef.current = true;
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startDesktopRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find(
      (type) => MediaRecorder.isTypeSupported(type),
    );
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    recordingStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    recordingChunksRef.current = [];
    discardRecordingRef.current = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordingChunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      stream.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
      isListeningRef.current = false;
      setIsListening(false);

      const chunks = recordingChunksRef.current;
      recordingChunksRef.current = [];
      if (discardRecordingRef.current || chunks.length === 0) {
        discardRecordingRef.current = false;
        return;
      }

      setIsTranscribing(true);
      setNotice("");
      try {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const result = await window.electronAPI?.transcribeAudio(
          await audioBlob.arrayBuffer(),
          audioBlob.type || "audio/webm",
          "jarvis-recording.webm",
          activeLanguage.code,
        );
        if (!result?.success || !result.transcript) {
          throw new Error(result?.error || "I could not understand that recording.");
        }
        const transcript = activeLanguage.code === "ur-Latn-PK"
          ? romanizeUrduText(result.transcript)
          : result.transcript;
        setInput(transcript);
        handleSendRef.current(transcript);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Voice transcription failed.");
      } finally {
        setIsTranscribing(false);
      }
    };

    recorder.start();
    isListeningRef.current = true;
    setIsListening(true);
    setNotice("");
    recordingTimeoutRef.current = window.setTimeout(() => stopListening(false), 30_000);
  }

  async function toggleListening() {
    if (isListeningRef.current) {
      stopListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const stream = await navigator.mediaDevices?.getUserMedia({ audio: true });
        stream?.getTracks().forEach((track) => track.stop());
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        setNotice("");
        recognitionRef.current?.start();
        return;
      } catch (error) {
        setNotice(
          error instanceof Error
            ? `Microphone access failed: ${error.message}`
            : "Please allow microphone access and try again.",
        );
        return;
      }
    }

    if (window.electronAPI?.transcribeAudio && typeof MediaRecorder !== "undefined") {
      try {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        await startDesktopRecording();
      } catch (error) {
        setNotice(
          error instanceof Error
            ? `Microphone access failed: ${error.message}`
            : "Please allow microphone access and try again.",
        );
      }
      return;
    }

    setNotice("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
  }

  const startNewChat = useCallback(() => {
    requestIdRef.current += 1;
    stopGeneration();
    stopListening(true);
    abortControllerRef.current = null;
    isLoadingRef.current = false;
    setIsLoading(false);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setMessages([]);
    setInput("");
    setNotice("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [stopGeneration, stopListening]);

  const changeLanguage = (nextLanguage: string) => {
    const selected = getLanguage(nextLanguage);
    setLanguage(selected.code);
    settings.setVoiceProperty("language", selected.code);
    if (recognitionRef.current) {
      const recognitionLang = selected.recognitionCode || selected.code;
      recognitionRef.current.lang = recognitionLang;
      if (isListeningRef.current) {
        try {
          recognitionRef.current.stop();
          window.setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 100);
        } catch {}
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        startNewChat();
      } else if (modifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarOpen((current) => !current);
      } else if (modifier && event.key === ",") {
        event.preventDefault();
        setShowSettings(true);
      } else if (modifier && event.shiftKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void toggleListening();
      } else if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startNewChat]);

  const firstUserMessage = messages.find((message) => message.role === "user")?.content;
  const conversationTitle = firstUserMessage
    ? `${firstUserMessage.slice(0, 34)}${firstUserMessage.length > 34 ? "…" : ""}`
    : "New conversation";
  const providerLabel = PROVIDER_LABELS[settings.aiModel.provider] || "AI provider";

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={
          (sidebarOpen ? "translate-x-0 lg:ml-0" : "-translate-x-full lg:-ml-[280px] lg:translate-x-0") +
          " fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-all duration-300 lg:relative lg:inset-auto lg:z-auto"
        }
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
          <div className="flex items-center gap-3">
            <JarvisLogo className="h-10 w-10 shadow-[0_8px_24px_var(--accent-glow)]" />
            <div>
              <p className="text-sm font-semibold tracking-[0.18em]">JARVIS</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">AI workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              startNewChat();
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_10px_32px_var(--accent-glow)] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            New conversation
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Conversations">
          <div className="mb-2 flex items-center justify-between px-2 pt-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Current session</span>
            <History className="h-3.5 w-3.5 text-[var(--muted)]" />
          </div>
          <button
            type="button"
            onClick={() => {
              inputRef.current?.focus();
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="w-full rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] p-3 text-left"
          >
            <div className="flex items-start gap-3">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{conversationTitle}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {messages.length ? messages.length + " messages" : "Ready when you are"}
                </p>
              </div>
            </div>
          </button>
        </nav>

        <div className="space-y-2 border-t border-[var(--sidebar-border)] p-3">
          {isDesktopApp === false && (
            <a
              href={DESKTOP_APP_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] p-3 transition hover:border-[var(--accent-border-strong)] hover:bg-[var(--accent-bg-strong)]"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                <Download className="h-4 w-4" />
                Get the desktop app
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">Secure API keys, automatic provider detection, and local models.</p>
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--muted-strong)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
          >
            <Settings className="h-4 w-4" />
            {isDesktopApp ? "Settings and credentials" : "Settings"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--card-border)] bg-[var(--glass-bg)] px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--input-border)] text-[var(--muted-strong)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <Menu className="h-5 w-5" />}
            </button>
            <JarvisLogo className="h-8 w-8 shadow-[0_6px_20px_var(--accent-glow)] sm:h-9 sm:w-9" alt="" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-[var(--foreground)] sm:text-base">{conversationTitle}</h1>
              <p className="truncate text-[10px] uppercase tracking-[0.13em] text-[var(--muted)]">
                {isLoading ? "Generating response" : isListening ? "Listening now" : isDesktopApp === false ? "Website session" : "Private desktop session"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isDesktopApp === false && (
              <a
                href={DESKTOP_APP_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="hidden min-h-10 items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-bg-strong)] sm:flex"
              >
                <Download className="h-4 w-4" />
                Desktop app
              </a>
            )}
            <label className="relative">
              <Globe2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent)]" />
              <select
                value={language}
                onChange={(event) => changeLanguage(event.target.value)}
                className="h-10 w-10 appearance-none rounded-xl border border-[var(--input-border)] bg-[var(--card-bg)] pl-8 pr-1 text-transparent outline-none transition focus:border-[var(--accent-border-strong)] sm:w-auto sm:pr-3 sm:text-xs sm:text-[var(--foreground-soft)]"
                aria-label="Response language"
              >
                {LANGUAGES.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--input-border)] text-[var(--muted-strong)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_-15%,var(--accent-bg-strong),transparent_36%),var(--background)]">
          <div className="jarvis-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-7 sm:py-8">
            {messages.length === 0 ? (
              <section className="m-auto flex w-full max-w-2xl flex-col items-center py-6 text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                  What can I help you accomplish?
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  {activeLanguage.welcome} Type a request, choose a starting point, or use your voice.
                </p>

                {isDesktopApp === false && (
                  <a
                    href={DESKTOP_APP_DOWNLOAD_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--accent-border-strong)] hover:bg-[var(--accent-bg-strong)]"
                  >
                    <Download className="h-4 w-4" />
                    Download the app for secure credentials and local models
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-2">
                  {STARTER_PROMPTS.map((starter) => (
                    <button
                      key={starter.title}
                      type="button"
                      onClick={() => void handleSend(starter.prompt)}
                      className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent-border-strong)] hover:bg-[var(--card-bg-strong)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.14)]"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                        <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
                        {starter.title}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{starter.prompt}</p>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <section className={settings.compactMode ? "space-y-4 pb-3" : "space-y-7 pb-4"} aria-live="polite">
                {messages.map((message, index) => {
                  const assistant = message.role === "assistant";
                  const pending = assistant && isLoading && index === messages.length - 1 && !message.content;
                  const timestamp = new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <article key={index} className={(assistant ? "items-start" : "items-start flex-row-reverse") + " animate-slide-up flex gap-3"}>
                      <div className={(assistant ? "border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent)]" : "border-[var(--input-border)] bg-[var(--card-bg)] text-[var(--muted-strong)]") + " grid h-9 w-9 shrink-0 place-items-center rounded-xl border"}>
                        {assistant ? <Bot className="h-4 w-4" /> : <span className="text-[10px] font-bold">YOU</span>}
                      </div>
                      <div className={(assistant ? "items-start" : "items-end") + " flex min-w-0 max-w-[calc(100%-52px)] flex-col sm:max-w-[82%]"}>
                        <div className="mb-1.5 flex items-center gap-2 px-1">
                          <span className="text-[11px] font-semibold text-[var(--muted-strong)]">{assistant ? "JARVIS" : "You"}</span>
                          {settings.showTimestamps && <time className="text-[10px] text-[var(--muted)]">{timestamp}</time>}
                        </div>
                        <div
                          className={
                            (assistant
                              ? "rounded-tl-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground-soft)]"
                              : "rounded-tr-md bg-[var(--accent)] text-[var(--accent-foreground)]") +
                            " w-full rounded-2xl px-4 py-3 text-sm shadow-sm sm:px-5 " +
                            (settings.compactMode ? "leading-6" : "leading-7")
                          }
                        >
                          {pending ? (
                            <div className="status-wave flex h-7 items-center gap-1" aria-label="JARVIS is thinking">
                              {[0, 1, 2, 3].map((bar) => <span key={bar} className="w-1 rounded-full bg-[var(--accent)]" />)}
                            </div>
                          ) : assistant ? (
                            <MessageContent content={message.content} />
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{message.content}</div>
                          )}
                        </div>
                        {assistant && message.content && (
                          <div className="mt-1 flex items-center gap-2">
                            <CopyMessageButton content={message.content} />
                            {settings.showMessageMetadata && <span className="text-[10px] text-[var(--muted)]">{providerLabel} · {settings.aiModel.model}</span>}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
                <div ref={messagesEndRef} className="h-1" />
              </section>
            )}
          </div>
        </main>

        <footer className="shrink-0 border-t border-[var(--card-border)] bg-[var(--glass-bg)] px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto w-full max-w-4xl">
            {notice && (
              <div className="mb-2 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2.5 text-xs leading-5 text-[var(--danger)]">
                <span className="flex-1">{notice}</span>
                <button type="button" onClick={() => setNotice("")} className="grid h-6 w-6 place-items-center rounded-md hover:bg-rose-500/10" aria-label="Dismiss notice">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
              className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition focus-within:border-[var(--accent-border-strong)] focus-within:shadow-[0_18px_70px_var(--accent-glow)]"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                disabled={isLoading || isTranscribing}
                autoFocus
                placeholder={isListening ? "Listening…" : "Message JARVIS"}
                className="max-h-40 min-h-12 w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleListening()}
                    disabled={isLoading || isTranscribing}
                    className={(isListening ? "border-[var(--accent-border-strong)] bg-[var(--accent-bg-strong)] text-[var(--accent)]" : "border-[var(--input-border)] text-[var(--muted-strong)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]") + " grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40"}
                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  >
                    {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <span className="truncate text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {isListening ? "Listening" : isTranscribing ? "Transcribing" : "Enter to send · Shift+Enter for a line break"}
                  </span>
                </div>

                <button
                  type={isLoading ? "button" : "submit"}
                  onClick={isLoading ? stopGeneration : undefined}
                  disabled={!isLoading && !input.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_8px_26px_var(--accent-glow-strong)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={isLoading ? "Stop response" : "Send message"}
                >
                  {isLoading ? <Square className="h-3.5 w-3.5 fill-current" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </form>

            <p className="mt-2 text-center text-[10px] text-[var(--muted)]">
              JARVIS may make mistakes. Verify important information.
            </p>
          </div>
        </footer>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
