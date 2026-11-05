import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS — Personal AI Workspace",
  description: "A private, voice-enabled AI workspace for thinking, writing, and getting things done.",
  icons: { icon: "/jarvis-logo.svg" },
};

const themeBootstrap = `
  (function () {
    var root = document.documentElement;
    var mode = 'light';
    try {
      var saved = JSON.parse(localStorage.getItem('jarvis-settings') || '{}');
      var state = saved && saved.state ? saved.state : {};
      mode = state.themeMode || 'light';
      if (mode === 'system') {
        mode = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      if (/^#[0-9a-f]{6}$/i.test(state.accentColor || '')) {
        root.style.setProperty('--accent', state.accentColor);
      }
    } catch (_) {}
    root.classList.remove('light', 'dark');
    root.classList.add(mode === 'light' ? 'light' : 'dark');
  })();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script id="jarvis-theme" dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
