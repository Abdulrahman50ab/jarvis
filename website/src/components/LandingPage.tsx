"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  ExternalLink,
  Github,
  Globe2,
  HardDrive,
  Laptop,
  Layers,
  Lock,
  MessageSquare,
  Mic,
  Monitor,
  Play,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import JarvisLogo from "@/components/JarvisLogo";
import { DESKTOP_APP_DOWNLOAD_URL } from "@/lib/desktop-app";

interface LandingPageProps {
  onOpenWebPreview?: () => void;
}

const FAQS = [
  {
    question: "Is JARVIS completely free and private?",
    answer:
      "Yes. JARVIS is an open-source, private desktop assistant. Your API keys are encrypted locally using your operating system's native credential vault (Windows DPAPI, macOS Keychain, Linux Secret Service). No conversation logs or credentials are ever sent to an intermediary server.",
  },
  {
    question: "Can I use JARVIS completely offline without internet?",
    answer:
      "Yes. JARVIS features first-class support for local model providers like Ollama, LM Studio, and any OpenAI-compatible localhost server (e.g., http://localhost:11434). You can run Llama 3.2, Mistral, Qwen, or DeepSeek entirely on your local GPU/CPU without an active internet connection.",
  },
  {
    question: "How does the real-time multilingual voice recognition work?",
    answer:
      "JARVIS integrates continuous live speech recognition tuned for Pakistani Roman Urdu, standard Urdu, Hindi, Hinglish, Arabic, French, and English. Spoken words are streamed and typed live into the prompt field with automatic code-switch normalization.",
  },
  {
    question: "What is the difference between the Desktop App and this website?",
    answer:
      "The website is our product showcase and documentation hub. The full application runs as a lightweight, native desktop app on Windows, macOS, and Linux to access native audio drivers, hardware-encrypted credential storage, global system shortcuts (Ctrl+Shift+V), and local network models safely.",
  },
  {
    question: "Which cloud API providers can I bring?",
    answer:
      "You can bring your own API keys for Groq (Whisper Large v3 audio transcription and ultra-low latency Llama inference), OpenAI (GPT-4o, GPT-4o-mini), and Google Gemini. All keys remain locked on your physical disk.",
  },
];

export default function LandingPage({ onOpenWebPreview }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-bg-strong)] selection:text-[var(--foreground)]">
      {/* Top Banner */}
      <aside aria-label="Announcement" className="border-b border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-2 text-center text-xs font-medium text-[var(--foreground)]">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            v1.0.0 Release
          </span>
          <span>JARVIS Desktop is now available for Windows, macOS, and Linux.</span>
          <a
            href={DESKTOP_APP_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
          >
            Download now
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </aside>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <JarvisLogo className="h-9 w-9 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-[var(--foreground)]">JARVIS</span>
                <span className="rounded-md border border-[var(--card-border)] bg-[var(--background-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                  Desktop AI
                </span>
              </div>
              <p className="text-[11px] leading-none text-[var(--muted)]">Personal AI Workspace</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted-strong)] md:flex">
            <a href="#features" className="transition hover:text-[var(--foreground)]">
              Features
            </a>
            <a href="#preview" className="transition hover:text-[var(--foreground)]">
              Preview
            </a>
            <a href="#privacy" className="transition hover:text-[var(--foreground)]">
              Privacy & Keys
            </a>
            <a href="#local-models" className="transition hover:text-[var(--foreground)]">
              Local Models
            </a>
            <a href="#faq" className="transition hover:text-[var(--foreground)]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Abdulrahman50ab/jarvis"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-xs font-medium text-[var(--foreground)] shadow-xs transition hover:bg-[var(--hover-bg)]"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            {onOpenWebPreview && (
              <button
                type="button"
                onClick={onOpenWebPreview}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-3 text-xs font-medium text-[var(--muted-strong)] shadow-xs transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
              >
                <Play className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">Web Demo</span>
              </button>
            )}

            <a
              href={DESKTOP_APP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:scale-98"
            >
              <Download className="h-4 w-4" />
              <span>Download App</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--card-border)] py-20 lg:py-28">
        <div className="jarvis-grid absolute inset-0 pointer-events-none opacity-40" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3.5 py-1 text-xs font-medium text-[var(--accent)] shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Private & Local First · Built for Desktop</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
            The Private AI Workspace
            <br />
            <span className="text-[var(--accent)]">Engineered for Your Desktop</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted-strong)] sm:text-lg">
            Converse naturally with live code-switched Roman Urdu & English speech recognition, run
            100% offline local models with Ollama, and store all API keys safely on your machine
            using native OS encryption.
          </p>

          {/* Primary Action Group */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={DESKTOP_APP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--accent-hover)] active:scale-98 sm:w-auto"
            >
              <Download className="h-5 w-5" />
              <span>Download for Windows (x64)</span>
            </a>

            <a
              href="https://github.com/Abdulrahman50ab/jarvis/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-6 text-sm font-medium text-[var(--foreground)] shadow-xs transition hover:bg-[var(--hover-bg)] sm:w-auto"
            >
              <Github className="h-5 w-5" />
              <span>All Releases (macOS & Linux)</span>
              <ExternalLink className="h-3.5 w-3.5 text-[var(--muted)]" />
            </a>
          </div>

          <p className="mt-4 text-xs text-[var(--muted)]">
            Windows 10/11 · macOS 12+ (Apple Silicon & Intel) · Linux (AppImage & deb)
          </p>

          {/* Trust Indicators */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-[var(--card-border)] pt-8 sm:grid-cols-4">
            <div className="flex flex-col items-center gap-1.5 p-2">
              <Lock className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">OS DPAPI Encryption</span>
              <span className="text-[11px] text-[var(--muted)]">No server-side key storage</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2">
              <Mic className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">Live Speech-to-Text</span>
              <span className="text-[11px] text-[var(--muted)]">Continuous Roman Urdu & English</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2">
              <Cpu className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">Offline Local Models</span>
              <span className="text-[11px] text-[var(--muted)]">Ollama & LM Studio ready</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2">
              <Layers className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">Multi-Session Threads</span>
              <span className="text-[11px] text-[var(--muted)]">Persistent on-device history</span>
            </div>
          </div>
        </div>
      </section>

      {/* App Interface Simulated Preview */}
      <section id="preview" className="border-b border-[var(--card-border)] bg-[var(--background-soft)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
              Native Experience
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Clean, Distraction-Free Desktop Interface
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Crafted around an 8pt spatial grid with zero neon sci-fi tropes or cheesy emojis.
            </p>
          </div>

          {/* Desktop Frame Mockup */}
          <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
            {/* Title Bar */}
            <div className="flex h-10 items-center justify-between border-b border-[var(--card-border)] bg-[var(--panel-bg)] px-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 font-mono text-[11px] text-[var(--muted)]">
                  JARVIS Assistant — Desktop Workspace
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted)]">
                  Ctrl+Shift+V
                </span>
              </div>
            </div>

            {/* Simulated Desktop Window Body */}
            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[460px]">
              {/* Sidebar */}
              <div className="hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 md:block">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-[var(--foreground)]">Conversations</span>
                  <span className="rounded bg-[var(--accent-bg)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent)]">
                    3 active
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-bg)] p-2.5">
                    <p className="text-xs font-semibold text-[var(--foreground)]">Ollama Local Setup</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">8 messages · Active</p>
                  </div>
                  <div className="rounded-lg border border-transparent p-2.5 hover:bg-[var(--hover-bg)]">
                    <p className="text-xs font-medium text-[var(--foreground-soft)]">Speech Recognition Test</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">14 messages · Yesterday</p>
                  </div>
                  <div className="rounded-lg border border-transparent p-2.5 hover:bg-[var(--hover-bg)]">
                    <p className="text-xs font-medium text-[var(--foreground-soft)]">Next.js Monorepo Build</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">5 messages · 2 days ago</p>
                  </div>
                </div>

                <div className="mt-28 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg-strong)] p-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-[var(--accent)]" />
                    <span className="text-xs font-semibold text-[var(--foreground)]">Local Engine</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Ollama 11434 · Llama-3.2:3b offline
                  </p>
                </div>
              </div>

              {/* Chat View */}
              <div className="col-span-3 flex flex-col justify-between p-6 bg-[var(--background)]">
                <div className="space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-xl rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm text-white shadow-xs">
                      <p className="text-xs font-mono opacity-80 mb-1">You · Voice (Roman Urdu)</p>
                      <p>Hum Roman Urdu aur English mix karke baat kar saktay hain? Aur local model kaisay configure hoga?</p>
                    </div>
                  </div>

                  {/* Assistant response */}
                  <div className="flex justify-start">
                    <div className="max-w-2xl rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--foreground)] shadow-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <JarvisLogo className="h-5 w-5" />
                        <span className="text-xs font-semibold text-[var(--foreground)]">JARVIS</span>
                        <span className="rounded bg-[var(--background-soft)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                          Local Llama 3.2
                        </span>
                      </div>
                      <p className="leading-relaxed">
                        Haan bilkul! JARVIS code-switched Pakistani Roman Urdu aur English dono naturally samajhta hai. Spoken speech live type hoti hai aur bina delay format ho jati hai.
                      </p>
                      <div className="mt-3 rounded-lg border border-[var(--input-border)] bg-[var(--panel-bg)] p-3 font-mono text-xs text-[var(--foreground-soft)]">
                        <code>ollama run llama3.2 # Local offline inference ready</code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Bar */}
                <div className="mt-8 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--muted)]">
                      Message JARVIS (Ctrl+Shift+V for live microphone)...
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[var(--background-soft)] p-1.5 text-[var(--muted)]">
                        <Mic className="h-4 w-4 text-[var(--accent)]" />
                      </span>
                      <span className="rounded-md bg-[var(--accent)] p-1.5 text-white">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="border-b border-[var(--card-border)] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
              Engineered Capabilities
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Built for Deep Work, Total Privacy, and Speed
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-[var(--muted)]">
              Everything you need in a modern AI companion without telemetry, subscriptions, or vendor lock-in.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs transition hover:border-[var(--accent-border)]">
              <div className="inline-flex rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <Mic className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                Live Multilingual Voice Engine
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                Continuous speech-to-text with real-time word accumulator. Speak in Roman Urdu, standard Urdu, Hindi, Hinglish, Arabic, French, or English without premature cut-offs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs transition hover:border-[var(--accent-border)]">
              <div className="inline-flex rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                OS SafeStorage Encryption
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                API credentials are encrypted directly via Windows DPAPI, macOS Keychain, and Linux Secret Service. No web server ever sees or stores your private access keys.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs transition hover:border-[var(--accent-border)]">
              <div className="inline-flex rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                Offline Local Model Freedom
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                Full compatibility with Ollama, LM Studio, and local OpenAI-compatible backends. Switch between high-speed cloud providers (Groq, OpenAI, Gemini) and 100% offline local inference.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs transition hover:border-[var(--accent-border)]">
              <div className="inline-flex rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                Persistent Multi-Session Threads
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                Isolated chat history saved persistently on disk. Switch between projects, research sessions, and debugging threads without losing context or wiping state.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs transition hover:border-[var(--accent-border)]">
              <div className="inline-flex rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <Terminal className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                Global Desktop Ergonomics
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                Fast global hotkeys (`Ctrl+Shift+V` for microphone, `Ctrl+N` for new threads, `Ctrl+,` for configuration), automatic audio permission handling, and ultra-low idle RAM consumption.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs transition hover:border-[var(--accent-border)]">
              <div className="inline-flex rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                <Globe2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                Anti-AI Editorial Design
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                Strict 8pt geometry, crisp high-contrast porcelain palette, tabular typography, and spring micro-interactions. Zero neon cyan glow or cheesy emoji clutter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section id="privacy" className="border-b border-[var(--card-border)] bg-[var(--background-soft)] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
              Architecture Comparison
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Why JARVIS Runs as a Desktop Application
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              A comparison between JARVIS Desktop and typical cloud web chatbots.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--card-border)] bg-[var(--panel-bg)] font-semibold text-[var(--foreground)]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Capability</th>
                  <th className="py-3.5 px-4 sm:px-6 text-[var(--accent)]">JARVIS Desktop</th>
                  <th className="py-3.5 px-4 sm:px-6 text-[var(--muted)]">Standard Web Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)] text-xs sm:text-sm text-[var(--foreground-soft)]">
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-[var(--foreground)]">Credential Storage</td>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-600">On-device OS DPAPI / Keychain</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[var(--muted)]">Stored in cloud databases</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-[var(--foreground)]">Offline Inference</td>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-600">Full local Ollama & LM Studio</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[var(--muted)]">Fails without internet connection</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-[var(--foreground)]">Continuous Voice Recognition</td>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-600">Native continuous streaming pipeline</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[var(--muted)]">Limited browser speech buffer</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-[var(--foreground)]">System Global Shortcuts</td>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-600">System-wide hotkeys & background tray</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[var(--muted)]">Active browser tab only</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-[var(--foreground)]">Data Telemetry</td>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-emerald-600">Zero trackers or analytics</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[var(--muted)]">Monitored & logged by vendors</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Local Models Section */}
      <section id="local-models" className="border-b border-[var(--card-border)] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-sm md:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <span className="text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
                  100% Offline Resilience
                </span>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                  Run Llama, Mistral, and DeepSeek Locally
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">
                  Start Ollama on your computer and point JARVIS to your localhost endpoint. Enjoy zero-latency responses, zero cloud bills, and total confidential computing for proprietary code and sensitive data.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background-soft)] px-3 py-1 text-xs font-mono text-[var(--foreground)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Ollama
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background-soft)] px-3 py-1 text-xs font-mono text-[var(--foreground)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    LM Studio
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background-soft)] px-3 py-1 text-xs font-mono text-[var(--foreground)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    LocalAI
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background-soft)] px-3 py-1 text-xs font-mono text-[var(--foreground)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    vLLM / llama.cpp
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg)] p-4 font-mono text-xs">
                <p className="text-[var(--muted)]"># Quick terminal start</p>
                <p className="text-[var(--accent)] mt-1 font-semibold">ollama serve</p>
                <p className="text-[var(--foreground)] mt-1">ollama pull llama3.2</p>
                <div className="mt-4 border-t border-[var(--card-border)] pt-3 text-[11px] text-[var(--muted)]">
                  Endpoint: http://localhost:11434
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="border-b border-[var(--card-border)] bg-[var(--background-soft)] py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
              Get Started Today
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Download JARVIS Desktop
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-[var(--muted)]">
              Install the lightweight desktop companion on your primary workstation.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Windows Card */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-[var(--accent)] bg-[var(--card-bg)] p-6 shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-xl bg-[var(--accent-bg)] p-3 text-[var(--accent)]">
                    <Monitor className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase">
                    Recommended
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-[var(--foreground)]">Windows</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Windows 10 and 11 (64-bit)</p>
                <ul className="mt-4 space-y-2 text-xs text-[var(--muted-strong)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Direct `.exe` Installer
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Native Windows DPAPI safeStorage
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Global `Ctrl+Shift+V` Hotkey
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <a
                  href={DESKTOP_APP_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)]"
                >
                  <Download className="h-4 w-4" />
                  <span>Download for Windows</span>
                </a>
              </div>
            </div>

            {/* macOS Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs">
              <div>
                <div className="inline-flex rounded-xl bg-[var(--background-soft)] p-3 text-[var(--foreground)]">
                  <Laptop className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-[var(--foreground)]">macOS</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">macOS 12 Monterey or later</p>
                <ul className="mt-4 space-y-2 text-xs text-[var(--muted-strong)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Apple Silicon (M1/M2/M3/M4) & Intel
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    macOS Keychain safeStorage
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Spotlight-style global shortcut
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <a
                  href={DESKTOP_APP_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-medium text-[var(--foreground)] shadow-xs transition hover:bg-[var(--hover-bg)]"
                >
                  <Download className="h-4 w-4" />
                  <span>Download DMG</span>
                </a>
              </div>
            </div>

            {/* Linux Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-xs">
              <div>
                <div className="inline-flex rounded-xl bg-[var(--background-soft)] p-3 text-[var(--foreground)]">
                  <Terminal className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-[var(--foreground)]">Linux</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Ubuntu, Debian, Fedora, Arch</p>
                <ul className="mt-4 space-y-2 text-xs text-[var(--muted-strong)]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Universal `.AppImage` & `.deb`
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Linux Secret Service vault
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Lightweight memory footprint
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <a
                  href={DESKTOP_APP_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-xs font-medium text-[var(--foreground)] shadow-xs transition hover:bg-[var(--hover-bg)]"
                >
                  <Download className="h-4 w-4" />
                  <span>Download AppImage</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-b border-[var(--card-border)] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
              Frequently Asked Questions
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Everything You Need to Know
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--hover-bg)] sm:p-5"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-[var(--card-border)] bg-[var(--background-soft)] px-4 py-3.5 text-xs leading-relaxed text-[var(--muted-strong)] sm:px-5">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--card-bg)] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex items-center gap-3">
            <JarvisLogo className="h-8 w-8" />
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">JARVIS Desktop Assistant</p>
              <p className="text-[11px] text-[var(--muted)]">Private, Voice-Native AI Workspace</p>
            </div>
          </div>

          <p className="text-xs text-[var(--muted)]">
            Open-source and privacy-hardened. No trackers, telemetry, or external key storage.
          </p>

          <div className="flex items-center gap-4 text-xs font-medium text-[var(--muted-strong)]">
            <a
              href="https://github.com/Abdulrahman50ab/jarvis"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
            <a
              href="https://github.com/Abdulrahman50ab/jarvis/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
            >
              <Download className="h-3.5 w-3.5" />
              Releases
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
