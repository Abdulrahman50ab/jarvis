"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Keyboard,
  LockKeyhole,
  MessageSquare,
  Palette,
  PlugZap,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { DESKTOP_APP_DOWNLOAD_URL } from "@/lib/desktop-app";
import JarvisLogo from "@/components/JarvisLogo";
import { defaultShortcuts, useSettingsStore } from "@/lib/settings-store";
import {
  ActionButton,
  ColorPicker,
  NumberInput,
  SectionCard,
  Select,
  Slider,
  TextArea,
  TextInput,
  Toggle,
} from "./controls";

type SectionId =
  | "connections"
  | "model"
  | "voice"
  | "chat"
  | "appearance"
  | "privacy"
  | "shortcuts"
  | "advanced"
  | "about";

type CredentialProvider = "groq" | "openai" | "gemini";
type ModelProvider = CredentialProvider | "local";

const SECTIONS: Array<{ id: SectionId; label: string; description: string; icon: typeof PlugZap }> = [
  { id: "connections", label: "Connections", description: "API keys and providers", icon: PlugZap },
  { id: "model", label: "Model", description: "AI behavior and output", icon: Cpu },
  { id: "voice", label: "Voice", description: "Speech and microphone", icon: Volume2 },
  { id: "chat", label: "Chat", description: "Conversation display", icon: MessageSquare },
  { id: "appearance", label: "Appearance", description: "Theme and accessibility", icon: Palette },
  { id: "privacy", label: "Privacy", description: "Local data controls", icon: ShieldCheck },
  { id: "shortcuts", label: "Shortcuts", description: "Keyboard commands", icon: Keyboard },
  { id: "advanced", label: "Advanced", description: "Endpoints and timeouts", icon: SlidersHorizontal },
  { id: "about", label: "About", description: "Application information", icon: Info },
];

const PROVIDERS: Array<{ id: CredentialProvider; label: string; hint: string; placeholder: string }> = [
  { id: "groq", label: "Groq", hint: "Llama models and voice transcription.", placeholder: "gsk_..." },
  { id: "openai", label: "OpenAI", hint: "GPT models through the OpenAI API.", placeholder: "sk-..." },
  { id: "gemini", label: "Google Gemini", hint: "Gemini models through Google AI Studio.", placeholder: "AIza..." },
];

const MODEL_OPTIONS: Record<ModelProvider, Array<{ value: string; label: string }>> = {
  groq: [
    { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B (Fast)" },
    { value: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    { value: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B" },
    { value: "allam-2-7b", label: "Allam 2 7B" },
  ],
  openai: [
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  local: [
    { value: "llama3.2:3b", label: "Llama 3.2 3B" },
    { value: "qwen2.5:7b", label: "Qwen 2.5 7B" },
    { value: "deepseek-r1:7b", label: "DeepSeek R1 7B" },
  ],
};

const DEFAULT_PROMPT = "You are JARVIS, a capable and thoughtful AI assistant. Help with everyday questions, planning, writing, learning, technical work, and problem solving. Give clear, accurate, and practical answers, adapt to the user's language and level of detail, and ask a concise clarifying question only when it is genuinely needed.";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<SectionId>("connections");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const settings = useSettingsStore();

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  const currentSection = SECTIONS.find((section) => section.id === active) ?? SECTIONS[0];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-bg)] p-0 backdrop-blur-md sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="animate-slide-up flex h-[100dvh] w-full overflow-hidden border-[var(--card-border)] bg-[var(--panel-bg)] shadow-2xl sm:h-[min(820px,92vh)] sm:max-w-6xl sm:rounded-3xl sm:border"
      >
        <aside className="hidden w-64 shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 md:flex md:flex-col md:min-h-0">
          <div className="mb-4 flex shrink-0 items-center gap-3 px-2 pt-1">
            <JarvisLogo className="h-10 w-10 shadow-[0_6px_20px_var(--accent-glow)]" />
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] text-[var(--foreground)]">JARVIS</p>
              <p className="text-xs text-[var(--muted)]">Control center</p>
            </div>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Settings sections">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const selected = active === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? "bg-[var(--accent-bg-strong)] text-[var(--accent)]" : "text-[var(--muted-strong)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"}`}
                  aria-current={selected ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{section.label}</span>
                    <span className="block truncate text-[10px] opacity-70">{section.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-3 shrink-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-xs leading-5 text-[var(--muted)]">
            Settings save automatically on this device.
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <JarvisLogo className="h-9 w-9 shadow-[0_6px_18px_var(--accent-glow)]" alt="" />
              <div className="min-w-0">
                <h2 id="settings-title" className="truncate text-base font-semibold text-[var(--foreground)]">{currentSection.label}</h2>
                <p className="truncate text-xs text-[var(--muted)]">{currentSection.description}</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--input-border)] text-[var(--muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="shrink-0 overflow-x-auto border-b border-[var(--card-border)] px-3 py-2 md:hidden">
            <div className="flex min-w-max gap-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActive(section.id)}
                    className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium ${active === section.id ? "bg-[var(--accent-bg-strong)] text-[var(--accent)]" : "text-[var(--muted)]"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-3xl space-y-4 pb-8">
              {active === "connections" && <ConnectionsSection />}
              {active === "model" && <ModelSection />}
              {active === "voice" && <VoiceSection />}
              {active === "chat" && <ChatSection />}
              {active === "appearance" && <AppearanceSection />}
              {active === "privacy" && <PrivacySection />}
              {active === "shortcuts" && <ShortcutsSection />}
              {active === "advanced" && <AdvancedSection />}
              {active === "about" && <AboutSection />}
            </div>
          </main>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--card-border)] px-4 py-3 sm:px-6">
            <span className="hidden text-xs text-[var(--muted)] sm:block">JARVIS v{settings.version}</span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => settings.resetToDefaults()}
                className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-[var(--muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset preferences
              </button>
              <ActionButton label="Done" variant="accent" onClick={onClose} />
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function ConnectionsSection() {
  const settings = useSettingsStore();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState<Record<CredentialProvider, boolean>>({ groq: false, openai: false, gemini: false });
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    try {
      const result = await window.electronAPI?.getApiKeyStatus();
      if (result && "providers" in result) setConfigured(result.providers);
    } catch {
      setConfigured({ groq: false, openai: false, gemini: false });
    }
  };

  useEffect(() => {
    const desktop = Boolean(window.electronAPI);
    setIsDesktop(desktop);
    if (desktop) void refresh();
  }, []);

  const save = async () => {
    const value = draft.trim();
    if (value.length < 8) {
      setMessage("Enter a valid API key with at least 8 characters.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await window.electronAPI?.setApiKey(value);
      if (!result?.success || !result.provider) throw new Error(result?.error || "The API key could not be saved.");
      const provider = result.provider;
      setDraft("");
      await refresh();
      settings.setAIModelSettings({ provider, model: MODEL_OPTIONS[provider][0].value });
      setMessage(`${PROVIDERS.find((item) => item.id === provider)?.label} detected. Its API endpoint and default model are ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The API key could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (provider: CredentialProvider) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await window.electronAPI?.removeApiKey(provider);
      if (!result?.success) throw new Error(result?.error || "The credential could not be removed.");
      await refresh();
      setMessage(`${PROVIDERS.find((item) => item.id === provider)?.label} credential removed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The credential could not be removed.");
    } finally {
      setBusy(false);
    }
  };

  if (isDesktop === null) {
    return (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-border)] border-t-[var(--accent)]" />
          <p className="mt-3 text-xs text-[var(--muted)]">Checking desktop capabilities…</p>
        </div>
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <>
        <section className="overflow-hidden rounded-3xl border border-[var(--accent-border)] bg-[radial-gradient(circle_at_top_right,var(--accent-bg-strong),transparent_52%),var(--card-bg)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border-strong)] bg-[var(--accent-bg)] text-[var(--accent)] shadow-[0_0_40px_var(--accent-glow)]">
              <Download className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                Desktop app feature
              </span>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Bring your own AI credentials in the JARVIS app</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                For your security, personal API keys cannot be entered on this website. Install the desktop application to unlock the encrypted credential vault, automatic provider detection, and local models.
              </p>
              <div className="mt-5 grid gap-2 text-sm text-[var(--foreground-soft)] sm:grid-cols-2">
                {[
                  "Operating-system encrypted key storage",
                  "Automatic Groq, OpenAI, and Gemini detection",
                  "Local Ollama and OpenAI-compatible models",
                  "Desktop voice transcription",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    {item}
                  </div>
                ))}
              </div>
              <a
                href={DESKTOP_APP_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_12px_34px_var(--accent-glow)] transition hover:brightness-110"
              >
                <Download className="h-4 w-4" />
                Download desktop app
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        <SectionCard title="Website connection" description="The public website uses credentials configured securely on its server.">
          <div className="py-4 text-sm leading-6 text-[var(--muted)]">
            Website visitors can use the provider selected by the site owner, but cannot add, view, replace, or remove private API credentials here.
          </div>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-bg)] p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Automatic provider setup</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Paste one API key. JARVIS detects Groq, OpenAI, or Gemini, encrypts it with the operating system, and uses the configured API endpoint automatically.
            </p>
          </div>
        </div>
      </div>

      <SectionCard title="Connect an AI provider" description="No URL is required. Supported API keys are matched to a configured provider endpoint.">
        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Paste a Groq, OpenAI, or Gemini API key"
            autoComplete="new-password"
            disabled={busy}
            aria-label="AI provider API key"
            className="h-11 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent-border-strong)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover-bg)]"
            aria-label={visible ? "Hide API key" : "Show API key"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="pt-4">
          <ActionButton label={busy ? "Detecting provider…" : "Detect and save API key"} variant="accent" disabled={busy || !draft.trim()} onClick={() => void save()} />
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <section key={provider.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{provider.label}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{provider.hint}</p>
              </div>
              {configured[provider.id] && <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success)]" aria-label="Configured" />}
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              {configured[provider.id] ? "Connected" : `Detected from ${provider.placeholder}`}
            </p>
            {configured[provider.id] && (
              <button
                type="button"
                onClick={() => void remove(provider.id)}
                disabled={busy}
                className="mt-3 min-h-9 w-full rounded-xl border border-rose-500/25 px-3 text-xs font-semibold text-[var(--danger)] hover:bg-rose-500/10 disabled:opacity-40"
              >
                Remove
              </button>
            )}
          </section>
        ))}
      </div>

      {message && <div role="status" className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-3 text-xs leading-5 text-[var(--foreground-soft)]">{message}</div>}
    </>
  );
}

function ModelSection() {
  const settings = useSettingsStore();
  const provider = settings.aiModel.provider as ModelProvider;
  const options = MODEL_OPTIONS[provider];

  const changeProvider = (nextProvider: ModelProvider) => {
    const firstModel = MODEL_OPTIONS[nextProvider][0].value;
    settings.setAIModelSettings({ provider: nextProvider, model: firstModel });
  };

  return (
    <>
      <SectionCard title="Provider and model" description="Choose where JARVIS sends requests. Desktop credentials are managed in Connections; the website uses its server configuration.">
        <Select<ModelProvider>
          label="Provider"
          value={provider}
          options={[
            { value: "groq", label: "Groq" },
            { value: "openai", label: "OpenAI" },
            { value: "gemini", label: "Google Gemini" },
            { value: "local", label: "Local / Ollama" },
          ]}
          onChange={changeProvider}
        />
        <Select label="Model" value={settings.aiModel.model} options={options} onChange={(value) => settings.setAIModelProperty("model", value)} />
      </SectionCard>

      <SectionCard title="Response style" description="Balance creativity, focus, and response length.">
        <Slider label="Temperature" value={settings.aiModel.temperature} min={0} max={2} step={0.05} format={(value) => value.toFixed(2)} onChange={(value) => settings.setAIModelProperty("temperature", value)} />
        <Slider label="Top P" value={settings.aiModel.topP} min={0} max={1} step={0.05} format={(value) => value.toFixed(2)} onChange={(value) => settings.setAIModelProperty("topP", value)} />
        <NumberInput label="Maximum output tokens" value={settings.aiModel.maxTokens} min={128} max={8192} step={128} onChange={(value) => settings.setAIModelProperty("maxTokens", value)} />
      </SectionCard>

      <SectionCard title="System instructions" description="Define how JARVIS should behave in every conversation.">
        <TextArea label="System prompt" rows={7} value={settings.aiModel.systemPrompt} onChange={(value) => settings.setAIModelProperty("systemPrompt", value)} />
        <div className="pt-4"><ActionButton label="Restore default prompt" onClick={() => settings.setAIModelProperty("systemPrompt", DEFAULT_PROMPT)} /></div>
      </SectionCard>
    </>
  );
}

const STANDARD_VOICE_LIST = [
  "Google US English",
  "Google UK English Female",
  "Google UK English Male",
  "Microsoft David - English (United States)",
  "Microsoft Zira - English (United States)",
  "Microsoft Mark - English (United States)",
  "Microsoft George - English (United Kingdom)",
  "Microsoft Susan - English (United Kingdom)",
  "Microsoft Hazel - English (United Kingdom)",
  "Microsoft Ravi - English (India)",
  "Microsoft Heera - English (India)",
  "Microsoft Asma - Arabic (Saudi Arabia)",
  "Microsoft Hoda - Arabic (Egypt)",
  "Microsoft Paul - French (France)",
  "Microsoft Julie - French (France)",
  "Microsoft Helena - Spanish (Spain)",
  "Microsoft Laura - Spanish (Spain)",
  "Microsoft Hedda - German (Germany)",
  "Microsoft Stefan - German (Germany)",
  "Microsoft Haruka - Japanese (Japan)",
  "Microsoft Ichiro - Japanese (Japan)",
  "Microsoft Huihui - Chinese (Simplified)",
  "Microsoft Yaoyao - Chinese (Simplified)",
  "Microsoft Kangkang - Chinese (Simplified)",
  "Google Español",
  "Google Français",
  "Google Deutsch",
  "Google Italiano",
  "Google 日本語",
  "Google 한국의",
  "Google 普通话 (中国大陆)",
  "Google हिन्दी",
  "Natural - Studio English",
  "Samantha",
  "Daniel",
  "Karen",
  "Alex",
];

function VoiceSection() {
  const settings = useSettingsStore();
  const [voices, setVoices] = useState<string[]>(STANDARD_VOICE_LIST);

  useEffect(() => {
    const load = () => {
      const sysVoices = (window.speechSynthesis?.getVoices() || []).map((voice) => voice.name);
      const combined = Array.from(new Set([...sysVoices, ...STANDARD_VOICE_LIST]));
      setVoices(combined);
    };
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  const testVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance("JARVIS voice systems are online and fully operational.");
    const available = window.speechSynthesis.getVoices();
    if (available.length > 0) {
      const target = settings.voice.voice.toLowerCase();
      const voice =
        available.find((item) => item.name === settings.voice.voice) ||
        available.find((item) => item.name.toLowerCase().includes(target) || target.includes(item.name.toLowerCase())) ||
        available.find((item) => item.lang.toLowerCase().startsWith(settings.voice.language.toLowerCase().split("-")[0])) ||
        available.find((item) => item.lang.toLowerCase().startsWith("en")) ||
        available[0];
      if (voice) utterance.voice = voice;
    }
    utterance.rate = settings.voice.rate;
    utterance.pitch = settings.voice.pitch;
    utterance.volume = settings.voice.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      <SectionCard title="Speech output" description="Control how assistant replies are spoken aloud.">
        <Select label="Voice" value={settings.voice.voice} options={(voices.length ? voices : [settings.voice.voice]).map((voice) => ({ value: voice, label: voice }))} onChange={(value) => settings.setVoiceProperty("voice", value)} />
        <Slider label="Rate" value={settings.voice.rate} min={0.5} max={2} step={0.05} format={(value) => `${value.toFixed(2)}x`} onChange={(value) => settings.setVoiceProperty("rate", value)} />
        <Slider label="Pitch" value={settings.voice.pitch} min={0.5} max={2} step={0.05} format={(value) => value.toFixed(2)} onChange={(value) => settings.setVoiceProperty("pitch", value)} />
        <Slider label="Volume" value={settings.voice.volume} min={0} max={1} step={0.05} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => settings.setVoiceProperty("volume", value)} />
        <Toggle label="Speak responses automatically" description="Read completed responses aloud." checked={settings.voice.autoSpeak} onChange={(value) => settings.setVoiceProperty("autoSpeak", value)} />
        <Toggle label="Skip code blocks" description="Do not read source code during speech playback." checked={settings.voice.skipCodeBlocks} onChange={(value) => settings.setVoiceProperty("skipCodeBlocks", value)} />
        <div className="pt-4"><ActionButton label="Test voice" variant="accent" onClick={testVoice} /></div>
      </SectionCard>

      <SectionCard title="Speech input" description="Choose the recognition language and microphone behavior.">
        <Select label="Recognition language" value={settings.voice.language} options={[
          { value: "en-US", label: "English (US)" }, { value: "ur-PK", label: "Urdu" }, { value: "ur-Latn-PK", label: "Roman Urdu (English letters)" },
          { value: "hi-IN", label: "Hindi" }, { value: "hi-Latn-IN", label: "Hinglish" },
          { value: "ar-SA", label: "Arabic" }, { value: "fr-FR", label: "French" }, { value: "es-ES", label: "Spanish" },
          { value: "de-DE", label: "German" }, { value: "ja-JP", label: "Japanese" }, { value: "zh-CN", label: "Chinese" },
        ]} onChange={(value) => settings.setVoiceProperty("language", value)} />
        <Toggle label="Continuous browser listening" checked={settings.voice.continuousListening} onChange={(value) => settings.setVoiceProperty("continuousListening", value)} />
        <Toggle label="Noise suppression" checked={settings.voice.noiseSuppression} onChange={(value) => settings.setVoiceProperty("noiseSuppression", value)} />
      </SectionCard>
    </>
  );
}

function ChatSection() {
  const settings = useSettingsStore();
  return (
    <SectionCard title="Conversation display" description="Tune the workspace for your preferred information density.">
      <Toggle label="Compact messages" description="Reduce spacing around chat messages." checked={settings.compactMode} onChange={settings.setCompactMode} />
      <Toggle label="Show timestamps" checked={settings.showTimestamps} onChange={settings.setShowTimestamps} />
      <Toggle label="Show model metadata" description="Display the active provider beneath assistant replies." checked={settings.showMessageMetadata} onChange={settings.setShowMessageMetadata} />
    </SectionCard>
  );
}

function AppearanceSection() {
  const settings = useSettingsStore();
  return (
    <>
      <SectionCard title="Theme" description="Appearance changes apply immediately across the application.">
        <Select label="Color mode" value={settings.themeMode} options={[
          { value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "Follow system" },
        ]} onChange={settings.setThemeMode} />
        <ColorPicker label="Interface accent" value={settings.accentColor} onChange={settings.setAccentColor} />
      </SectionCard>
      <SectionCard title="Typography and motion">
        <Select label="Font style" value={settings.fontFamily} options={[
          { value: "system", label: "System sans-serif" }, { value: "monospace", label: "Monospace" }, { value: "custom", label: "Readable serif" },
        ]} onChange={(value) => settings.setFontSettings(value, settings.fontSize, settings.lineHeight)} />
        <Slider label="Text size" value={settings.fontSize} min={12} max={18} step={1} unit="px" onChange={(value) => settings.setFontSettings(settings.fontFamily, value, settings.lineHeight)} />
        <Slider label="Line height" value={settings.lineHeight} min={1.35} max={2} step={0.05} format={(value) => value.toFixed(2)} onChange={(value) => settings.setFontSettings(settings.fontFamily, settings.fontSize, value)} />
        <Toggle label="Reduce motion" description="Minimize interface animation and pulsing effects." checked={settings.reducedMotion} onChange={settings.setReducedMotion} />
      </SectionCard>
    </>
  );
}

function PrivacySection() {
  const settings = useSettingsStore();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <>
      <SectionCard title="How your data is handled">
        <div className="space-y-3 py-4 text-sm leading-6 text-[var(--muted)]">
          <p>Chat messages stay in application memory and are cleared when you start a new conversation or close the app.</p>
          <p>Non-secret preferences are saved locally. Desktop credentials are stored separately using operating-system encryption. The website never accepts personal provider credentials.</p>
          <p>Messages are sent only to the provider selected in Model settings.</p>
        </div>
      </SectionCard>
      <SectionCard title="Local preferences" description="This does not remove desktop credentials; remove those individually in Connections.">
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Reset all preferences</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Restore theme, voice, model, and chat settings.</p>
          </div>
          {confirmReset ? (
            <div className="flex gap-2">
              <ActionButton label="Cancel" onClick={() => setConfirmReset(false)} />
              <ActionButton label="Confirm reset" variant="danger" onClick={() => { settings.resetToDefaults(); setConfirmReset(false); }} />
            </div>
          ) : <ActionButton label="Reset preferences" variant="danger" onClick={() => setConfirmReset(true)} />}
        </div>
      </SectionCard>
    </>
  );
}

function ShortcutsSection() {
  const settings = useSettingsStore();
  const rows = useMemo(() => [
    ["Start a new conversation", settings.shortcuts.newChat || defaultShortcuts.newChat],
    ["Toggle navigation rail", settings.shortcuts.toggleSidebar || defaultShortcuts.toggleSidebar],
    ["Focus the composer", settings.shortcuts.focusInput || defaultShortcuts.focusInput],
    ["Open settings", settings.shortcuts.openSettings || defaultShortcuts.openSettings],
    ["Start or stop voice input", settings.shortcuts.toggleVoice || defaultShortcuts.toggleVoice],
  ], [settings.shortcuts]);
  return (
    <SectionCard title="Active keyboard shortcuts" description="Shortcuts work while the main JARVIS window is focused.">
      <div className="divide-y divide-[var(--card-border)]">
        {rows.map(([label, binding]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-sm text-[var(--foreground-soft)]">{label}</span>
            <kbd className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1 font-mono text-xs text-[var(--muted-strong)] shadow-sm">{binding}</kbd>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function AdvancedSection() {
  const settings = useSettingsStore();
  return (
    <>
      <SectionCard title="Local model service" description="JARVIS uses the OpenAI-compatible chat completions route exposed by this server.">
        <TextInput label="Local server URL" type="url" value={settings.aiModel.backendUrl} placeholder="http://localhost:11434" onChange={(value) => settings.setAIModelProperty("backendUrl", value)} />
      </SectionCard>
      <SectionCard title="Request limits">
        <Slider label="Request timeout" value={settings.aiModel.requestTimeout / 1000} min={5} max={120} step={5} unit="s" onChange={(value) => settings.setAIModelProperty("requestTimeout", value * 1000)} />
      </SectionCard>
    </>
  );
}

function AboutSection() {
  const settings = useSettingsStore();
  return (
    <>
      <div className="rounded-3xl border border-[var(--accent-border)] bg-[radial-gradient(circle_at_top_right,var(--accent-bg-strong),transparent_55%),var(--card-bg)] p-7 text-center">
        <JarvisLogo className="mx-auto h-16 w-16 shadow-[0_10px_34px_var(--accent-glow)]" />
        <h3 className="mt-4 text-xl font-semibold tracking-[0.18em] text-[var(--foreground)]">JARVIS</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Personal AI workspace · Version {settings.version}</p>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[var(--foreground-soft)]">Built for focused conversations, fast voice input, and bring-your-own-provider privacy.</p>
      </div>
      <SectionCard title="Capabilities">
        <div className="grid gap-3 py-4 sm:grid-cols-2">
          {["Streaming AI conversations", "Encrypted desktop credentials", "Automatic API-key provider detection", "Speech input and playback", "Groq, OpenAI, Gemini, and local models", "Responsive website and desktop layout"].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-[var(--foreground-soft)]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />{item}</div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
