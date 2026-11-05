"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";
import JarvisChat from "@/components/JarvisChat";
import LandingPage from "@/components/LandingPage";
import { DESKTOP_APP_DOWNLOAD_URL } from "@/lib/desktop-app";

export default function Home() {
  const [isElectron, setIsElectron] = useState<boolean | null>(null);
  const [showWebPreview, setShowWebPreview] = useState<boolean>(false);

  useEffect(() => {
    // Check if running inside Electron desktop environment
    const isDesktop = typeof window !== "undefined" && Boolean(window.electronAPI);
    setIsElectron(isDesktop);
  }, []);

  // Avoid flash before hydration completes
  if (isElectron === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--card-border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  // Inside Electron desktop app: always open full desktop chat workspace
  if (isElectron) {
    return <JarvisChat />;
  }

  // On Web: if user explicitly toggled "Web Demo"
  if (showWebPreview) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Banner informing web users to download desktop client */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-2.5 text-xs text-[var(--foreground)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <span>
              <strong>Web Preview Mode:</strong> For native OS encryption, 100% offline local models, and global voice hotkeys, use the Desktop App.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWebPreview(false)}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-xs transition hover:bg-[var(--hover-bg)]"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Overview</span>
            </button>
            <a
              href={DESKTOP_APP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-[var(--accent-hover)]"
            >
              <Download className="h-3 w-3" />
              <span>Download Desktop App</span>
            </a>
          </div>
        </div>
        <div className="flex-1">
          <JarvisChat />
        </div>
      </div>
    );
  }

  // On Web: default to full Product Landing Page with features and download options
  return <LandingPage onOpenWebPreview={() => setShowWebPreview(true)} />;
}
