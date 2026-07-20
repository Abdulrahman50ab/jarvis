"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, X, Copy, Settings, Cpu, Phone, PhoneOff, FolderOpen, File, ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ModelSettings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
}

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "deepseek-r1-distill-llama-70b",
  "qwen-qwq-32b",
];

const LANGUAGES = [
  { code: "en-US", label: "English", prompt: "You are JARVIS, an advanced AI Operating System. You are polite, extremely smart, efficient, and loyal. Address the user as 'Sir' or 'Ma'am' when appropriate. Provide concise, system-oriented answers." },
  { code: "hi-IN", label: "Hindi", prompt: "Tum JARVIS ho, ek advanced AI Operating System. Tum bahut polite, smart, efficient aur loyal ho. User ko 'Sir' ya 'Ma'am' bolo jab appropriate ho. Hindi mein chote aur clear jawaab do." },
  { code: "ur-PK", label: "Urdu", prompt: "Tum JARVIS ho, ek advanced AI Operating System. Tum bahut polite, smart, efficient aur loyal ho. User ko 'Sir' ya 'Ma'am' bolo jab appropriate ho. Urdu mein chote aur clear jawaab do." },
  { code: "ar-SA", label: "Arabic", prompt: "أنت JARVIS، نظام تشغيل ذكاء اصطناعي متقدم. أنت مهذب للغاية وذكي وفعال ومخلص. خاطب المستخدم بـ 'سيدي' أو 'سيدتي' عند الاقتضاء. قدّم إجابات مختصرة ومنظمة." },
  { code: "fr-FR", label: "French", prompt: "Tu es JARVIS, un système d'exploitation IA avancé. Tu es poli, extrêmement intelligent, efficace et loyal. Adresse-toi à l'utilisateur avec 'Monsieur' ou 'Madame' quand c'est approprié. Fournis des réponses concises et orientées système." },
  { code: "es-ES", label: "Spanish", prompt: "Eres JARVIS, un sistema operativo de IA avanzado. Eres educado, extremadamente inteligente, eficiente y leal. Dirígete al usuario como 'Señor' o 'Señora' cuando sea apropiado. Proporciona respuestas concisas y orientadas al sistema." },
  { code: "de-DE", label: "German", prompt: "Du bist JARVIS, ein fortschrittliches KI-Betriebssystem. Du bist höflich, äußerst intelligent, effizient und loyal. Sprich den Benutzer mit 'Herr' oder 'Frau' an, wenn es angemessen ist. Gib kurze, systemorientierte Antworten." },
  { code: "ja-JP", label: "Japanese", prompt: "あなたはJARVIS、高度なAIオペレーティングシステムです。礼儀正しく、非常に賢く、効率的で忠実です。適切な場合はユーザーを「様」付けで呼びます。簡潔でシステム志向の回答を提供してください。" },
  { code: "zh-CN", label: "Chinese", prompt: "你是JARVIS，一个先进的AI操作系统。你非常有礼貌、聪明、高效且忠诚。适当时称呼用户为'先生'或'女士'。提供简洁的、面向系统的回答。" },
];

const WELCOME_MESSAGES: Record<string, string> = {
  "en-US": "Online and ready, sir. How can I assist you today?",
  "hi-IN": "Main online hoon aur taiyar hoon, sir. Aaj main aapki kaise madad kar sakta hoon?",
  "ur-PK": "Main online hoon aur tayyar hoon, sir. Aaj main aapki kaise madad kar sakta hoon?",
  "ar-SA": "متصل وجاهز يا سيدي. كيف يمكنني مساعدتك اليوم؟",
  "fr-FR": "En ligne et prêt, monsieur. Comment puis-je vous aider aujourd'hui?",
  "es-ES": "En línea y listo, señor. ¿Cómo puedo ayudarle hoy?",
  "de-DE": "Online und bereit, wie kann ich Ihnen heute helfen?",
  "ja-JP": "オンラインで準備完了です、様。本日はどのようにお手伝いできますか？",
  "zh-CN": "已上线并准备就绪，先生。今天我能为您做什么？",
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

function FileTree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div>
      {nodes.map((node) => (
        <div key={node.name}>
          <div
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-[var(--accent-bg)] rounded cursor-pointer text-xs font-mono"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => node.type === "folder" && toggle(node.name)}
          >
            {node.type === "folder" ? (
              expanded[node.name] ? <ChevronDown className="w-3 h-3 text-[var(--muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--muted)]" />
            ) : (
              <File className="w-3 h-3 text-[var(--muted)]" />
            )}
            <span className={node.type === "folder" ? "text-[var(--accent)]" : "text-[var(--foreground)]"}>{node.name}</span>
          </div>
          {node.type === "folder" && expanded[node.name] && node.children && (
            <FileTree nodes={node.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function JarvisChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MESSAGES["en-US"] },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [voiceName, setVoiceName] = useState("");
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showFileTree, setShowFileTree] = useState(true);
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    systemPrompt: LANGUAGES[0].prompt,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const continuousModeRef = useRef(false);
  const isLoadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  continuousModeRef.current = continuousMode;
  isLoadingRef.current = isLoading;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      setAvailableVoices(v);
      if (!voiceName && v.length > 0) {
        const defaultVoice = v.find((v) => v.lang.startsWith(language.split("-")[0]) && (v.name.includes("Google") || v.name.includes("Natural")));
        if (defaultVoice) setVoiceName(defaultVoice.name);
      }
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, [language, voiceName]);

  const restartMic = useCallback(() => {
    if (continuousModeRef.current && recognitionRef.current && !isLoadingRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {}
      }, 300);
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`~-]/g, "").replace(/```[\s\S]*?```/g, "[Code block skipped]").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = language.split("-")[0];
    const selected = voices.find((v) => v.name === voiceName) ||
      voices.find((v) => v.lang.startsWith(langPrefix) && (v.name.includes("Google") || v.name.includes("Natural"))) ||
      voices.find((v) => v.lang.startsWith(langPrefix)) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (selected) utterance.voice = selected;
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.onstart = () => { isSpeakingRef.current = true; };
    utterance.onend = () => {
      isSpeakingRef.current = false;
      restartMic();
    };
    window.speechSynthesis.speak(utterance);
  }, [isMuted, restartMic, language, voiceName, voiceRate, voicePitch]);

  const handleSend = useCallback(async (customText?: string) => {
    const textToSubmit = customText || input;
    if (!textToSubmit.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSubmit };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    const placeholderIdx = updatedMessages.length;

    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: modelSettings.model,
          temperature: modelSettings.temperature,
          top_p: modelSettings.topP,
          max_tokens: modelSettings.maxTokens,
          stream: true,
          messages: [
            { role: "system", content: modelSettings.systemPrompt },
            ...updatedMessages.map((msg) => ({
              role: msg.role === "assistant" ? "assistant" : msg.role,
              content: msg.content,
            })),
          ],
        }),
      });

      if (!groqRes.ok) {
        const err = await groqRes.text();
        console.error("Groq API error:", err);
        throw new Error("API error");
      }

      const reader = groqRes.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) accumulated += content;
            } catch {}
          }
          const current = accumulated;
          setMessages((prev) => {
            const copy = [...prev];
            copy[placeholderIdx] = { role: "assistant", content: current };
            return copy;
          });
        }

        speakText(accumulated);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "System Error: Sir, I could not establish a connection to the core." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, modelSettings, speakText]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => {
        setIsListening(false);
        if (continuousModeRef.current && !isSpeakingRef.current && !isLoadingRef.current) {
          restartMic();
        }
      };
      rec.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          setIsListening(false);
        }
      };
      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript?.trim();
          if (!transcript) continue;
          if (event.results[i].isFinal) {
            if (continuousModeRef.current) {
              handleSend(transcript);
            } else {
              setInput(transcript);
              handleSend(transcript);
            }
          } else {
            setInput(transcript);
          }
        }
      };
      recognitionRef.current = rec;
    }
  }, [handleSend, restartMic, language]);

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    const langData = LANGUAGES.find((l) => l.code === newLang);
    if (langData) {
      setModelSettings((prev) => ({ ...prev, systemPrompt: langData.prompt }));
    }
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported. Try Chrome/Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setContinuousMode(false);
    } else {
      window.speechSynthesis?.cancel();
      setContinuousMode(false);
      recognitionRef.current.start();
    }
  };

  const toggleContinuousMode = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported. Try Chrome/Edge.");
      return;
    }

    if (continuousMode) {
      setContinuousMode(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      setContinuousMode(true);
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const newChat = () => {
    setMessages([{ role: "assistant", content: WELCOME_MESSAGES[language] || WELCOME_MESSAGES["en-US"] }]);
    setInput("");
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const tree: FileNode[] = [];

    for (const file of Array.from(files)) {
      const text = await file.text();
      tree.push({ name: file.name, type: "file", content: text });
    }

    setProjectFiles(tree);
    setShowFileTree(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex h-screen bg-[var(--background)]" style={{
      color: "var(--accent, #00ffcc)",
      fontFamily: "var(--jarvis-font, ui-monospace, SFMono-Regular, Menlo, monospace)",
      fontSize: "var(--jarvis-font-size, 14px)",
      lineHeight: "var(--jarvis-line-height, 1.6)",
    }}>
      {/* Left Sidebar - Controls */}
      <aside className="w-16 border-r border-[var(--accent-border)] bg-[var(--card-bg)] flex flex-col items-center py-4 gap-2 shrink-0">
        <div className="mb-4">
          <Cpu className="w-7 h-7 animate-pulse text-[var(--accent)]" />
        </div>

        <button onClick={newChat}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--accent-border-strong)] text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all"
          title="New Chat">
          <Plus className="w-4 h-4" />
        </button>

        <button onClick={() => setIsMuted(!isMuted)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
            isMuted ? "border-red-500/30 text-red-400 bg-red-950/10" : "border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-bg)]"
          }`}
          title={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button onClick={toggleListening}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
            isListening && !continuousMode ? "border-emerald-500 bg-emerald-950/40 text-emerald-400 animate-pulse" : "border-[var(--accent-border-strong)] text-[var(--accent)] hover:bg-[var(--accent-bg)]"
          }`}
          title={isListening ? "Stop Mic" : "Start Mic"}>
          {isListening && !continuousMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button onClick={toggleContinuousMode}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
            continuousMode ? "border-emerald-500 bg-emerald-950/40 text-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border-[var(--accent-border-strong)] text-[var(--accent)] hover:bg-[var(--accent-bg)]"
          }`}
          title={continuousMode ? "End Voice Call" : "Start Voice Call"}>
          {continuousMode ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
        </button>

        <div className="w-8 border-t border-[var(--accent-border)] my-2" />

        <button onClick={() => setShowSettings(!showSettings)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
            showSettings ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]" : "border-[var(--accent-border-strong)] text-[var(--accent)] hover:bg-[var(--accent-bg)]"
          }`}
          title="Settings">
          <Settings className="w-4 h-4" />
        </button>

        <button onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-[var(--accent-border-strong)] text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all"
          title="Open Project Folder">
          <FolderOpen className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFolderUpload} />

        <button onClick={() => setShowFileTree(!showFileTree)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all mt-auto ${
            showFileTree ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]" : "border-[var(--accent-border-strong)] text-[var(--muted)] hover:bg-[var(--accent-bg)]"
          }`}
          title="Toggle File Tree">
          <File className="w-4 h-4" />
        </button>
      </aside>

      {/* Center - Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-12 border-b border-[var(--accent-border)] flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-widest uppercase">JARVIS OS</span>
            <span className="text-xs px-2 py-0.5 rounded border border-[var(--accent-border)] bg-[var(--card-bg)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-[var(--muted)] font-mono uppercase tracking-widest text-[10px]">Groq Core</span>
            </span>

            <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-[var(--accent-border)] bg-[var(--background)] text-[var(--accent)] outline-none font-mono">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div className="text-xs text-[var(--muted)] font-mono">CORE v2.0</div>
        </header>

        {/* Continuous Mode Overlay */}
        {continuousMode && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none" style={{ left: "64px" }}>
            <div className="relative flex items-center justify-center mb-8">
              <div className={`absolute rounded-full border transition-all duration-700 ${
                isSpeakingRef.current ? "w-72 h-72 animate-ping bg-[var(--accent-bg)] border-[var(--accent-border-strong)]" : isListening ? "w-64 h-64 animate-pulse bg-emerald-500/5 border-emerald-500/20" : "w-56 h-56 border-[var(--card-border)]"
              }`} />
              <div className={`absolute rounded-full border border-dashed transition-all duration-500 ${
                isSpeakingRef.current ? "w-48 h-48 border-[var(--accent-border-strong)] animate-[spin_8s_linear_infinite]" : isListening ? "w-44 h-44 border-emerald-500/40 animate-[spin_12s_linear_infinite]" : "w-40 h-40 border-[var(--card-border)] animate-[spin_20s_linear_infinite]"
              }`} />
              <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-[0_0_30px_rgba(0,255,204,0.3)] relative ${
                isSpeakingRef.current ? "bg-[var(--accent)] scale-110 shadow-[0_0_50px_var(--accent)]" : isLoading ? "bg-amber-500 animate-bounce shadow-[0_0_40px_#f59e0b]" : isListening ? "bg-emerald-500 scale-105 shadow-[0_0_40px_#10b981]" : "bg-[var(--card-bg)] border border-[var(--accent-border-strong)]"
              }`}>
                <div className="w-4 h-4 rounded-full bg-white animate-ping" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className={`text-sm tracking-widest uppercase font-bold ${isSpeakingRef.current ? "text-[var(--accent)]" : isLoading ? "text-amber-400" : isListening ? "text-emerald-400" : "text-[var(--muted)]"}`}>
                {isSpeakingRef.current ? "JARVIS is Speaking..." : isLoading ? "Processing..." : isListening ? "Listening..." : "Link Active"}
              </p>
            </div>
            <button onClick={toggleContinuousMode}
              className="mt-12 pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-full border border-red-500/60 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-mono uppercase tracking-widest transition-all hover:scale-105">
              <PhoneOff className="w-4 h-4 animate-pulse" />
              <span>End Voice Link</span>
            </button>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-12 left-16 z-50 bg-[var(--card-bg)] border border-[var(--accent-border)] rounded-r-lg p-4 min-w-[280px] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--accent)]">Config</h3>
              <button onClick={() => setShowSettings(false)} className="text-[var(--muted)] hover:text-[var(--accent)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">Model</label>
                <select value={modelSettings.model} onChange={(e) => setModelSettings({ ...modelSettings, model: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-[var(--accent-border)] bg-[var(--background)] text-[var(--accent)] outline-none">
                  {GROQ_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">Temperature: {modelSettings.temperature.toFixed(1)}</label>
                <input type="range" min="0" max="2" step="0.1" value={modelSettings.temperature}
                  onChange={(e) => setModelSettings({ ...modelSettings, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--accent)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">Top P: {modelSettings.topP.toFixed(1)}</label>
                <input type="range" min="0" max="1" step="0.1" value={modelSettings.topP}
                  onChange={(e) => setModelSettings({ ...modelSettings, topP: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--accent)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">Max Tokens: {modelSettings.maxTokens}</label>
                <input type="range" min="256" max="8192" step="256" value={modelSettings.maxTokens}
                  onChange={(e) => setModelSettings({ ...modelSettings, maxTokens: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">System Prompt</label>
                <textarea value={modelSettings.systemPrompt} rows={3}
                  onChange={(e) => setModelSettings({ ...modelSettings, systemPrompt: e.target.value })}
                  className="w-full px-2 py-1 text-xs rounded border border-[var(--accent-border)] bg-[var(--background)] text-[var(--accent)] outline-none font-mono resize-none" />
              </div>

              <div className="border-t border-[var(--accent-border)] pt-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] mb-3">Voice</h4>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">Voice</label>
                <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)}
                  className="w-full px-2 py-1 text-sm rounded border border-[var(--accent-border)] bg-[var(--background)] text-[var(--accent)] outline-none max-h-32 overflow-y-auto">
                  {availableVoices.length === 0 && <option value="">Loading...</option>}
                  {availableVoices.map((v) => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">Speed: {voiceRate.toFixed(1)}x</label>
                <input type="range" min="0.5" max="2" step="0.1" value={voiceRate}
                  onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] font-mono block mb-1">Pitch: {voicePitch.toFixed(1)}</label>
                <input type="range" min="0" max="2" step="0.1" value={voicePitch}
                  onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent)]" />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 border ${
                msg.role === "user"
                  ? "bg-[var(--accent-bg)] border-[var(--accent-border-strong)]"
                  : "bg-[var(--card-bg)] border-[var(--card-border)]"
              } group relative`}>
                <div className="text-xs text-[var(--muted)] font-mono uppercase tracking-wider mb-1 flex items-center gap-2">
                  <span>{msg.role === "user" ? "USER" : "JARVIS"}</span>
                  {msg.role === "assistant" && (
                    <button onClick={() => copyMessage(msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[var(--accent-bg)] rounded">
                      <Copy className="w-3 h-3 text-[var(--muted)] hover:text-[var(--accent)]" />
                    </button>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-[var(--card-bg)] border border-[var(--card-border)]">
                <div className="text-xs text-[var(--muted)] font-mono uppercase tracking-wider mb-1">JARVIS</div>
                <div className="flex items-center gap-2 text-sm font-mono text-[var(--accent)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing neural pathways...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input */}
        <footer className="border-t border-[var(--accent-border)] p-4 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3 max-w-4xl mx-auto">
            <input ref={inputRef} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isLoading ? "Processing..." : isListening ? "Listening..." : "Enter command, sir..."}
              disabled={isLoading}
              autoFocus
              className="flex-1 px-4 py-3 rounded-lg border border-[var(--accent-border-strong)] bg-[var(--background)] text-[var(--accent)] outline-none focus:border-[var(--accent)] font-mono text-sm placeholder-[var(--muted)] disabled:opacity-50" />
            <button type="submit" disabled={isLoading || !input.trim()}
              className="px-6 py-3 rounded-lg bg-[var(--accent)] text-black font-mono text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>TRANSMIT</span>
            </button>
          </form>
        </footer>
      </div>

      {/* Right Sidebar - File Tree */}
      {showFileTree && (
        <aside className="w-64 border-l border-[var(--accent-border)] bg-[var(--card-bg)] flex flex-col shrink-0">
          <div className="p-3 border-b border-[var(--accent-border)] flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)]">Project Explorer</span>
            <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-[var(--accent-bg)] rounded transition-all" title="Open Folder">
              <FolderOpen className="w-3.5 h-3.5 text-[var(--muted)] hover:text-[var(--accent)]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {projectFiles.length === 0 ? (
              <div className="p-4 text-center">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-[var(--muted)] opacity-50" />
                <p className="text-xs text-[var(--muted)] font-mono">No project open</p>
                <p className="text-[10px] text-[var(--muted)] font-mono mt-1">Click folder icon to open</p>
              </div>
            ) : (
              <FileTree nodes={projectFiles} />
            )}
          </div>

          {selectedFile && (
            <div className="border-t border-[var(--accent-border)] p-2 max-h-48 overflow-y-auto">
              <div className="text-[10px] text-[var(--muted)] font-mono mb-1">{selectedFile.name}</div>
              <pre className="text-[10px] text-[var(--foreground)] font-mono whitespace-pre-wrap">{selectedFile.content?.slice(0, 500)}</pre>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}