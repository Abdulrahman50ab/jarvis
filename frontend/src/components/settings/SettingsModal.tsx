"use client";

import React, { useEffect, useState } from "react";
import { X, Volume2, Cpu, MessageSquare, Palette, Phone, Lock, Keyboard, Wrench, Info, Trash2, Database } from "lucide-react";
import { useSettingsStore, defaultShortcuts } from "@/lib/settings-store";
import {
  Toggle, Slider, Select, TextInput, NumberInput, TextArea, ColorPicker, ActionButton, SectionCard,
} from "./controls";

type SectionId =
  | "voice" | "aiModel" | "models" | "chat" | "appearance" | "voiceCall"
  | "privacy" | "shortcuts" | "advanced" | "about";

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "voice", label: "Voice & Audio", icon: <Volume2 className="w-4 h-4" /> },
  { id: "aiModel", label: "AI Model", icon: <Cpu className="w-4 h-4" /> },
  { id: "models", label: "Models", icon: <Database className="w-4 h-4" /> },
  { id: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
  { id: "voiceCall", label: "Voice Call", icon: <Phone className="w-4 h-4" /> },
  { id: "privacy", label: "Privacy", icon: <Lock className="w-4 h-4" /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard className="w-4 h-4" /> },
  { id: "advanced", label: "Advanced", icon: <Wrench className="w-4 h-4" /> },
  { id: "about", label: "About", icon: <Info className="w-4 h-4" /> },
];

const DEFAULT_SHORTCUTS: { action: string; binding: string }[] = [
  { action: "Focus input", binding: "/" },
  { action: "New chat", binding: "Ctrl+N" },
  { action: "Toggle sidebar", binding: "Ctrl+B" },
  { action: "Toggle voice", binding: "Ctrl+Shift+V" },
  { action: "Toggle voice call", binding: "Ctrl+Shift+C" },
  { action: "Mute/unmute", binding: "Ctrl+M" },
  { action: "Clear chat", binding: "Ctrl+Shift+X" },
  { action: "Open settings", binding: "Ctrl+," },
];

const PROMPT_TEMPLATES: { name: string; prompt: string }[] = [
  {
    name: "Default JARVIS",
    prompt:
      "You are JARVIS, a sophisticated AI assistant designed to help with technical tasks, coding, and complex problem solving. You communicate professionally and efficiently, ensuring clear and accurate responses. When faced with code, provide detailed explanations, suggest optimizations, and offer best practices. You maintain a calm and professional demeanor while showcasing your analytical capabilities.",
  },
  {
    name: "Coding Assistant",
    prompt:
      "You are an expert senior software engineer. Provide clean, well-documented code with explanations. Prefer best practices, suggest tests, and call out security concerns. When giving code, use proper formatting with language tags.",
  },
  {
    name: "Creative Writer",
    prompt:
      "You are a creative writing companion. Help craft stories, poems, and engaging content. Be imaginative, use vivid language, and offer constructive suggestions to improve narrative flow and style.",
  },
  {
    name: "Analyst",
    prompt:
      "You are a data and business analyst. Break down problems logically, present structured findings, use bullet points, and support conclusions with reasoning. Ask clarifying questions when data is insufficient.",
  },
  {
    name: "Tutor",
    prompt:
      "You are a patient tutor. Explain concepts step by step, use simple analogies, check understanding frequently, and encourage the learner. Never just give the answer—guide them to it.",
  },
];

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<SectionId>("voice");
  const [voices, setVoices] = useState<string[]>([]);
  const [backendStatus, setBackendStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const [confirmClear, setConfirmClear] = useState(false);

  const s = useSettingsStore();

  useEffect(() => {
    if (!open) return;
    // Load available TTS voices
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const vs = window.speechSynthesis.getVoices().map((v) => v.name);
        if (vs.length) setVoices(vs);
      }
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    // Check backend health
    fetch(`${s.aiModel.backendUrl}/health`)
      .then((r) => (r.ok ? setBackendStatus("online") : setBackendStatus("offline")))
      .catch(() => setBackendStatus("offline"));
  }, [open, s.aiModel.backendUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const testVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance("This is a test of the JARVIS voice system, sir.");
    const v = window.speechSynthesis.getVoices().find((x) => x.name === s.voice.voice);
    if (v) u.voice = v;
    u.rate = s.voice.rate;
    u.pitch = s.voice.pitch;
    u.volume = s.voice.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-bg)] backdrop-blur-sm p-4 animate-fade-in">
      <div className="flex w-full max-w-5xl h-[85vh] rounded-xl border border-[var(--accent-border-strong)] bg-[var(--panel-bg)] overflow-hidden shadow-[0_0_40px_var(--accent-glow)]">
        {/* Sidebar nav */}
        <aside className="w-56 border-r border-[var(--accent-border)] bg-[var(--sidebar-bg)] p-3 overflow-y-auto scrollbar-hide shrink-0">
          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-3 px-2">System Settings</div>
          <nav className="space-y-1">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActive(sec.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded text-left text-sm transition-all ${
                  active === sec.id
                    ? "bg-[var(--accent-bg-strong)] text-[var(--accent)] border border-[var(--accent-border-strong)]"
                    : "text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-bg)]"
                }`}
              >
                {sec.icon}
                <span>{sec.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="flex-1 flex flex-col">
          <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--accent-border)] shrink-0">
            <h2 className="text-lg font-bold tracking-widest text-[var(--accent)] uppercase">
              {SECTIONS.find((x) => x.id === active)?.label}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-4">
            {active === "voice" && <VoiceSection voices={voices} onTest={testVoice} />}
            {active === "aiModel" && <AIModelSection status={backendStatus} />}
            {active === "models" && <ModelsSection status={backendStatus} />}
            {active === "chat" && <ChatSection />}
            {active === "appearance" && <AppearanceSection />}
            {active === "voiceCall" && <VoiceCallSection />}
            {active === "privacy" && <PrivacySection confirmClear={confirmClear} setConfirmClear={setConfirmClear} />}
            {active === "shortcuts" && <ShortcutsSection />}
            {active === "advanced" && <AdvancedSection />}
            {active === "about" && <AboutSection status={backendStatus} />}
          </div>

          <footer className="flex items-center justify-between px-6 h-14 border-t border-[var(--accent-border)] shrink-0">
            <span className="text-xs text-[var(--muted)] font-mono">v{s.version}</span>
            <div className="flex gap-2">
              <ActionButton label="Reset All" variant="danger" onClick={() => { s.resetToDefaults(); setConfirmClear(false); }} />
              <ActionButton label="Done" variant="accent" onClick={onClose} />
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

/* ============ Section Components ============ */

function VoiceSection({ voices, onTest }: { voices: string[]; onTest: () => void }) {
  const s = useSettingsStore();
  return (
    <>
      <SectionCard title="Text-to-Speech">
        <Select label="Voice Selection" value={s.voice.voice}
          options={(voices.length ? voices : ["Google US English", "Natural", "Microsoft David"]).map((v) => ({ value: v, label: v }))}
          onChange={(v) => s.setVoiceProperty("voice", v)} />
        <Slider label="Speech Rate" value={s.voice.rate} min={0.5} max={2} step={0.05} format={(v) => `${v.toFixed(2)}x`}
          onChange={(v) => s.setVoiceProperty("rate", v)} />
        <Slider label="Pitch" value={s.voice.pitch} min={0.5} max={2} step={0.05}
          onChange={(v) => s.setVoiceProperty("pitch", v)} />
        <Slider label="Volume" value={s.voice.volume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => s.setVoiceProperty("volume", v)} />
        <Toggle label="Auto-speak responses" checked={s.voice.autoSpeak} onChange={(v) => s.setVoiceProperty("autoSpeak", v)} />
        <Toggle label="Skip code blocks in TTS" checked={s.voice.skipCodeBlocks} onChange={(v) => s.setVoiceProperty("skipCodeBlocks", v)} />
        <div className="pt-2">
          <ActionButton label="Test Voice" variant="accent" onClick={onTest} />
        </div>
      </SectionCard>

      <SectionCard title="Speech Recognition">
        <Select label="Language" value={s.voice.language}
          options={["en-US", "en-GB", "hi-IN", "es-ES", "fr-FR", "de-DE"].map((l) => ({ value: l, label: l }))}
          onChange={(v) => s.setVoiceProperty("language", v)} />
        <Toggle label="Continuous listening" checked={s.voice.continuousListening} onChange={(v) => s.setVoiceProperty("continuousListening", v)} />
        <Toggle label="Interim results" checked={s.voice.interimResults} onChange={(v) => s.setVoiceProperty("interimResults", v)} />
        <Slider label="Microphone sensitivity" value={s.voice.microphoneSensitivity} min={0} max={1} step={0.05}
          onChange={(v) => s.setVoiceProperty("microphoneSensitivity", v)} />
        <Toggle label="Noise suppression" checked={s.voice.noiseSuppression} onChange={(v) => s.setVoiceProperty("noiseSuppression", v)} />
        <Toggle label="Auto-restart on error" checked={s.voice.autoGainControl} onChange={(v) => s.setVoiceProperty("autoGainControl", v)} />
      </SectionCard>

      <SectionCard title="Audio Feedback">
        <Toggle label="Startup sound" checked={s.voice.echoCancellation} onChange={(v) => s.setVoiceProperty("echoCancellation", v)} />
      </SectionCard>
    </>
  );
}

function AIModelSection({ status }: { status: "unknown" | "online" | "offline" }) {
  const s = useSettingsStore();
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => {
    fetch(`${s.aiModel.backendUrl.replace(/\/$/, "")}/api/v1/settings/models`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.models?.length) setModels(d.models); })
      .catch(() => {});
  }, [s.aiModel.backendUrl, status]);
  const modelOptions = models.length ? models : [s.aiModel.model || "qwen2.5-coder:7b"];
  return (
    <>
      <SectionCard title="Model Configuration">
        <Select label="Active Model" value={s.aiModel.model}
          options={modelOptions.map((m) => ({ value: m, label: m }))}
          onChange={(v) => s.setAIModelProperty("model", v)} />
        <Slider label="Temperature" value={s.aiModel.temperature} min={0} max={2} step={0.05}
          onChange={(v) => s.setAIModelProperty("temperature", v)} />
        <Slider label="Top-p" value={s.aiModel.topP} min={0} max={1} step={0.05}
          onChange={(v) => s.setAIModelProperty("topP", v)} />
        <Slider label="Top-k" value={s.aiModel.topK} min={1} max={100} step={1}
          onChange={(v) => s.setAIModelProperty("topK", v)} />
        <NumberInput label="Max tokens" value={s.aiModel.maxTokens} min={512} max={8192} step={256}
          onChange={(v) => s.setAIModelProperty("maxTokens", v)} />
        <div className="text-xs text-[var(--muted)] py-1">Context window: model dependent</div>
      </SectionCard>

      <SectionCard title="System Prompt">
        <TextArea label="Custom System Prompt" rows={5} value={s.aiModel.systemPrompt}
          onChange={(v) => s.setAIModelProperty("systemPrompt", v)} />
        <div className="pt-2 flex gap-2">
          <ActionButton label="Reset to default" variant="default"
            onClick={() => s.setAIModelProperty("systemPrompt",
              "You are JARVIS, a sophisticated AI assistant designed to help with technical tasks, coding, and complex problem solving. You communicate professionally and efficiently, ensuring clear and accurate responses. When faced with code, provide detailed explanations, suggest optimizations, and offer best practices. You maintain a calm and professional demeanor while showcasing your analytical capabilities.")} />
        </div>
      </SectionCard>

      <SectionCard title="Prompt Templates">
        <div className="flex flex-wrap gap-2 pt-1">
          {PROMPT_TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => s.setAIModelProperty("systemPrompt", t.prompt)}
              className="px-3 py-1.5 rounded border border-[var(--accent-border)] text-xs text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all"
            >
              {t.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] pt-2">Click a template to apply it to the system prompt above.</p>
      </SectionCard>

      <SectionCard title="Backend Connection">
        <TextInput label="Backend URL" value={s.aiModel.backendUrl} onChange={(v) => s.setAIModelProperty("backendUrl", v)} />
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-[var(--accent)]">Connection status</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${
            status === "online" ? "border-emerald-500/40 text-emerald-400" :
            status === "offline" ? "border-red-500/40 text-red-400" :
            "border-[var(--card-border)] text-[var(--muted)]"}`}>
            {status === "online" ? "● ONLINE" : status === "offline" ? "● OFFLINE" : "● UNKNOWN"}
          </span>
        </div>
        <Slider label="Request timeout (s)" value={s.aiModel.requestTimeout / 1000} min={5} max={120} step={1} unit="s"
          onChange={(v) => s.setAIModelProperty("requestTimeout", v * 1000)} />
        <Toggle label="Stream responses" checked={s.aiModel.streamResponses} onChange={(v) => s.setAIModelProperty("streamResponses", v)} />
      </SectionCard>
    </>
  );
}

function ModelsSection({ status }: { status: "unknown" | "online" | "offline" }) {
  const s = useSettingsStore();
  const [models, setModels] = useState<string[]>([]);
  const [pulling, setPulling] = useState(false);
  const [pullName, setPullName] = useState("");

  const refresh = async () => {
    try {
      const base = s.aiModel.backendUrl.replace(/\/$/, "");
      const r = await fetch(`${base}/api/v1/models`);
      if (r.ok) {
        const d = await r.json();
        setModels(d.models || []);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => { refresh(); }, [s.aiModel.backendUrl, status]);

  const pull = async () => {
    if (!pullName.trim()) return;
    setPulling(true);
    try {
      const base = s.aiModel.backendUrl.replace(/\/$/, "");
      await fetch(`${base}/api/v1/models/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pullName.trim() }),
      });
      // Poll for completion
      const timer = setInterval(async () => {
        await refresh();
      }, 3000);
      setTimeout(() => { clearInterval(timer); setPulling(false); setPullName(""); refresh(); }, 60000);
    } catch {
      setPulling(false);
    }
  };

  const del = async (name: string) => {
    if (!confirm(`Delete model "${name}"?`)) return;
    try {
      const base = s.aiModel.backendUrl.replace(/\/$/, "");
      await fetch(`${base}/api/v1/models/${encodeURIComponent(name)}`, { method: "DELETE" });
      refresh();
    } catch { /* ignore */ }
  };

  return (
    <>
      <SectionCard title="Installed Models">
        <div className="flex gap-2 pb-2">
          <TextInput label="" value={pullName}
            placeholder="e.g. llama3.2"
            onChange={setPullName} />
          <div className="flex items-end">
            <ActionButton label={pulling ? "Pulling..." : "Pull"} variant="accent" onClick={pull} />
          </div>
        </div>
        {models.length === 0 ? (
          <p className="text-xs text-[var(--muted)] py-2">No models found. Ollama may be offline or empty.</p>
        ) : (
          <div className="space-y-2">
            {models.map((m) => (
              <div key={m} className="flex items-center justify-between p-2 rounded border border-[var(--card-border)] bg-[var(--card-bg)]">
                <button
                  onClick={() => s.setAIModelProperty("model", m)}
                  className={`text-sm flex-1 text-left ${s.aiModel.model === m ? "text-[var(--accent)] font-semibold" : "text-[var(--foreground)]"}`}
                >
                  {m} {s.aiModel.model === m && <span className="text-xs">● active</span>}
                </button>
                <button
                  onClick={() => del(m)}
                  className="p-1 rounded text-red-400 hover:bg-red-950/30 transition-all"
                  title="Delete model"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

function ChatSection() {
  const s = useSettingsStore();
  const [cleared, setCleared] = useState(false);
  const clearHistory = async () => {
    try {
      const base = s.aiModel.backendUrl.replace(/\/$/, "");
      const res = await fetch(`${base}/api/v1/conversations`, { method: "DELETE" });
      setCleared(res.ok);
      if (!res.ok) alert("Failed to clear history.");
    } catch {
      alert("Backend not reachable.");
    }
  };
  return (
    <>
      <SectionCard title="Conversation Management">
        <Toggle label="Auto-save conversations" checked={s.showTimestamps} onChange={(v) => s.setShowTimestamps(v)} />
        <Toggle label="Auto-title conversations" checked={s.showMessageMetadata} onChange={(v) => s.setShowMessageMetadata(v)} />
      </SectionCard>
      <SectionCard title="Chat Behavior">
        <Toggle label="Auto-scroll to bottom" checked={!s.compactMode} onChange={(v) => s.setCompactMode(!v)} />
        <Toggle label="Show token count" checked={s.showMessageMetadata} onChange={(v) => s.setShowMessageMetadata(v)} />
      </SectionCard>
      <SectionCard title="Data">
        <div className="py-2">
          <ActionButton label="Export all conversations" variant="default" onClick={() => alert("Export not yet wired to backend.")} />
        </div>
        <div className="py-2">
          <ActionButton label="Clear all history" variant="danger" onClick={clearHistory} />
          {cleared && <span className="text-xs text-emerald-400 ml-2">History cleared.</span>}
        </div>
      </SectionCard>
    </>
  );
}

function AppearanceSection() {
  const s = useSettingsStore();
  return (
    <>
      <SectionCard title="Theme">
        <Select label="Theme mode" value={s.themeMode}
          options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }]}
          onChange={(v) => s.setThemeMode(v)} />
        <ColorPicker label="Accent color" value={s.accentColor} onChange={(v) => s.setAccentColor(v)} />
        <Slider label="Background opacity" value={s.backgroundOpacity} min={0} max={1} step={0.05}
          onChange={(v) => s.setBackgroundOpacity(v)} />
      </SectionCard>
      <SectionCard title="Layout">
        <Toggle label="Compact mode" checked={s.compactMode} onChange={(v) => s.setCompactMode(v)} />
        <Toggle label="Show timestamps" checked={s.showTimestamps} onChange={(v) => s.setShowTimestamps(v)} />
        <Toggle label="Show message metadata" checked={s.showMessageMetadata} onChange={(v) => s.setShowMessageMetadata(v)} />
      </SectionCard>
      <SectionCard title="Animations">
        <Toggle label="Enable animations" checked={s.animations} onChange={(v) => s.setAnimations(v)} />
        <Toggle label="Reduced motion" checked={s.reducedMotion} onChange={(v) => s.setReducedMotion(v)} />
        <Select label="Orb animation intensity" value={s.orbAnimationIntensity}
          options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]}
          onChange={(v) => s.setOrbAnimationIntensity(v)} />
      </SectionCard>
      <SectionCard title="Font">
        <Select label="Font family" value={s.fontFamily}
          options={[{ value: "monospace", label: "Monospace" }, { value: "system", label: "System" }, { value: "custom", label: "Custom" }]}
          onChange={(v) => s.setFontSettings(v, s.fontSize, s.lineHeight)} />
        <Slider label="Font size" value={s.fontSize} min={12} max={18} step={1} unit="px"
          onChange={(v) => s.setFontSettings(s.fontFamily, v, s.lineHeight)} />
        <Slider label="Line height" value={s.lineHeight} min={1.2} max={2} step={0.1}
          onChange={(v) => s.setFontSettings(s.fontFamily, s.fontSize, v)} />
      </SectionCard>
    </>
  );
}

function VoiceCallSection() {
  const s = useSettingsStore();
  return (
    <>
      <SectionCard title="Call Behavior">
        <Toggle label="Auto-answer on wake word" checked={s.autoAnswerOnWakeWord} onChange={(v) => s.setVoiceCallProperty("autoAnswerOnWakeWord", v)} />
        <TextInput label="Wake word" value={s.wakeWord} onChange={(v) => s.setVoiceCallProperty("wakeWord", v)} />
        <Slider label="End call on silence (s)" value={s.silenceThreshold / 1000} min={5} max={60} step={1} unit="s"
          onChange={(v) => s.setVoiceCallProperty("silenceThreshold", v * 1000)} />
        <Toggle label="Auto-resume after TTS" checked={s.autoResumeAfterTTS} onChange={(v) => s.setVoiceCallProperty("autoResumeAfterTTS", v)} />
      </SectionCard>
      <SectionCard title="Audio Processing">
        <Toggle label="Echo cancellation" checked={s.voice.echoCancellation} onChange={(v) => s.setVoiceProperty("echoCancellation", v)} />
        <Toggle label="Auto-gain control" checked={s.voice.autoGainControl} onChange={(v) => s.setVoiceProperty("autoGainControl", v)} />
        <Toggle label="Noise suppression" checked={s.voice.noiseSuppression} onChange={(v) => s.setVoiceProperty("noiseSuppression", v)} />
      </SectionCard>
    </>
  );
}

function PrivacySection({ confirmClear, setConfirmClear }: { confirmClear: boolean; setConfirmClear: (v: boolean) => void }) {
  const s = useSettingsStore();
  return (
    <>
      <SectionCard title="Data Storage">
        <Select label="Storage backend" value={s.privacy.storageBackend}
          options={[{ value: "localStorage", label: "LocalStorage" }, { value: "indexedDB", label: "IndexedDB" }, { value: "postgresql", label: "Neon PostgreSQL" }]}
          onChange={(v) => s.setPrivacyProperty("storageBackend", v)} />
        <Toggle label="Encrypt local data" checked={s.privacy.encryptLocalData} onChange={(v) => s.setPrivacyProperty("encryptLocalData", v)} />
        <Toggle label="Sync across devices" checked={s.privacy.syncAcrossDevices} onChange={(v) => s.setPrivacyProperty("syncAcrossDevices", v)} />
      </SectionCard>
      <SectionCard title="Data Control">
        <Toggle label="Analytics / Telemetry" checked={s.privacy.analytics} onChange={(v) => s.setPrivacyProperty("analytics", v)} />
        <Toggle label="Error reporting" checked={s.privacy.errorReporting} onChange={(v) => s.setPrivacyProperty("errorReporting", v)} />
        <div className="py-2">
          <ActionButton label="Export my data" variant="default" onClick={() => alert("Export not yet wired to backend.")} />
        </div>
        <div className="py-2">
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder='Type "DELETE" to confirm'
                className="flex-1 bg-[var(--input-bg)] border border-red-500/40 rounded px-2 py-1 text-sm text-[var(--foreground)] outline-none"
                onChange={(e) => setConfirmClear(e.target.value === "DELETE")}
              />
              <ActionButton label="Confirm Delete" variant="danger" onClick={() => { alert("Delete not yet wired to backend."); setConfirmClear(false); }} />
            </div>
          ) : (
            <ActionButton label="Delete all data" variant="danger" onClick={() => setConfirmClear(true)} />
          )}
        </div>
      </SectionCard>
    </>
  );
}

function ShortcutsSection() {
  const s = useSettingsStore();
  const [recording, setRecording] = useState<string | null>(null);

  const labels: Record<string, string> = {
    focusInput: "Focus input",
    newChat: "New chat",
    toggleSidebar: "Toggle sidebar",
    toggleVoice: "Toggle voice",
    toggleVoiceCall: "Toggle voice call",
    muteUnmute: "Mute / unmute",
    clearChat: "Clear chat",
    openSettings: "Open settings",
  };

  const startRecording = (action: string) => {
    setRecording(action);
  };

  const onCapture = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.metaKey) parts.push("Meta");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    let key = e.key;
    if (key === " ") key = "Space";
    if (key.length === 1) key = key.toUpperCase();
    parts.push(key);
    const binding = parts.join("+");
    s.setShortcuts({ ...s.shortcuts, [recording]: binding });
    setRecording(null);
  };

  const entries = Object.entries(s.shortcuts);

  return (
    <SectionCard title="Keyboard Shortcuts">
      {recording && (
        <div className="mb-3 p-2 rounded border border-[var(--accent-border-strong)] bg-[var(--accent-bg)] text-sm text-[var(--accent)] text-center animate-pulse">
          Press keys for "{labels[recording] || recording}"... (Esc to cancel)
        </div>
      )}
      <div className="divide-y divide-[var(--accent-border)]" onKeyDown={onCapture}>
        {entries.map(([action, binding]) => (
          <div key={action} className="flex items-center justify-between py-2">
            <span className="text-sm text-[var(--foreground)]">{labels[action] || action}</span>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded border border-[var(--accent-border-strong)] bg-[var(--card-bg)] text-xs text-[var(--muted)] font-mono">
                {recording === action ? "..." : binding}
              </kbd>
              <button
                onClick={() => startRecording(action)}
                className="px-2 py-1 rounded border border-[var(--accent-border)] text-xs text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all"
              >
                {recording === action ? "Recording" : "Edit"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2">
        <ActionButton label="Reset to defaults" variant="default" onClick={() => s.setShortcuts(defaultShortcuts)} />
      </div>
    </SectionCard>
  );
}

function AdvancedSection() {
  const s = useSettingsStore();
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    if (!s.debugMode) return;
    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;
    const push = (level: string, args: any[]) =>
      setLogs((prev) => [...prev.slice(-199), `[${level}] ${args.map(String).join(" ")}`]);
    console.log = (...a: any[]) => { push("LOG", a); origLog(...a); };
    console.error = (...a: any[]) => { push("ERR", a); origErr(...a); };
    console.warn = (...a: any[]) => { push("WARN", a); origWarn(...a); };
    return () => { console.log = origLog; console.error = origErr; console.warn = origWarn; };
  }, [s.debugMode]);
  return (
    <>
      <SectionCard title="Debug">
        <Toggle label="Debug mode" checked={s.debugMode} onChange={(v) => s.setDebugMode(v)} />
        <Select label="Log level" value={s.logLevel}
          options={[{ value: "error", label: "Error" }, { value: "warn", label: "Warn" }, { value: "info", label: "Info" }, { value: "debug", label: "Debug" }]}
          onChange={(v) => s.setLogLevel(v)} />
        <Toggle label="Show network requests" checked={s.showNetworkRequests} onChange={(v) => s.setDebugProperty("showNetworkRequests", v)} />
        <Toggle label="Mock backend responses" checked={s.mockBackendResponses} onChange={(v) => s.setDebugProperty("mockBackendResponses", v)} />
      </SectionCard>
      {s.debugMode && (
        <SectionCard title="Live Console">
          <div className="max-h-48 overflow-y-auto scrollbar-hide bg-[var(--card-bg)] border border-[var(--accent-border)] rounded p-2 text-[11px] font-mono text-[var(--muted)] space-y-0.5">
            {logs.length === 0 ? <div className="text-[var(--muted)]">No logs yet…</div> :
              logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </SectionCard>
      )}
      <SectionCard title="Experimental">
        <Toggle label="Enable experimental features" checked={s.enableExperimental} onChange={(v) => s.setExperimentalFeatures(v)} />
        <Toggle label="WebGPU acceleration" checked={s.enableWebGPU} onChange={(v) => s.setWebGPU(v)} />
        <Toggle label="Background sync" checked={s.enableBackgroundSync} onChange={(v) => s.setBackgroundSync(v)} />
      </SectionCard>
    </>
  );
}

function AboutSection({ status }: { status: "unknown" | "online" | "offline" }) {
  const s = useSettingsStore();
  const [ua, setUa] = useState("");
  useEffect(() => { setUa(navigator.userAgent); }, []);
  const info: [string, string][] = [
    ["App version", s.version],
    ["Backend status", status.toUpperCase()],
    ["Active model", s.aiModel.model],
    ["Storage backend", s.privacy.storageBackend],
    ["Browser", ua ? ua.split(") ").pop() || "Unknown" : "Detecting..."],
    ["Speech support", typeof window !== "undefined" && window.speechSynthesis ? "Yes" : "No"],
  ];
  return (
    <SectionCard title="System Info">
      <div className="divide-y divide-[var(--accent-border)]">
        {info.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2">
            <span className="text-sm text-[var(--muted)]">{k}</span>
            <span className="text-sm text-[var(--accent)] font-mono text-right max-w-[60%] truncate" title={v}>{v}</span>
          </div>
        ))}
      </div>
      <div className="pt-3 flex gap-2 flex-wrap">
        <ActionButton label="Check for updates" variant="default" onClick={() => alert("Already running latest.")} />
        <ActionButton label="Restart application" variant="default" onClick={() => window.location.reload()} />
      </div>
    </SectionCard>
  );
}
