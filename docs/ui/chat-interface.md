# Chat Interface Specification (`website/src/components/JarvisChat.tsx`)

## Overview
The main chat interface manages conversation turns, streaming assistant responses, audio transcription (Web Speech API and Electron IPC), model settings, and localized welcome templates.

## Empty State Layout
When no conversation messages are present (`messages.length === 0`):
- **Hero Title**: High-contrast, clean headline `"What can I help you accomplish?"` with responsive font sizing (`text-2xl sm:text-4xl`).
- **Subtitle**: Localized greeting and assistance prompt based on the selected language.
- **Desktop Promotion Banner**: Subtle download callout for web users highlighting local model capabilities and privacy.
- **Starter Prompt Cards**: 2x2 grid of prompt suggestions with clean vector iconography (`MessageSquare`), subtle card borders, and hover micro-elevation.
- **Voice Capabilities**: Clean microphone trigger located in the bottom action bar (`Mic` / `MicOff` / `Loader2` during transcription) and global shortcut `Ctrl+Shift+V`. Concentric orb button and floating status pill removed.

## Iconography & Palette Standards
- **Vector Icons Only**: Lucide React vector icons with 1.5–2px optical weight. No sparkles, emojis, or glowing neon tropes.
- **Theme Variables**: Semantic design tokens (`--background`, `--foreground`, `--accent`, `--card-bg`, `--input-border`).
