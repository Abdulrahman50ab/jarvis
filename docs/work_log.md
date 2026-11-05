# JARVIS Engineering Work Log

## Project Overview
JARVIS is a hybrid desktop and web AI companion application built with Next.js 14 (App Router, Tailwind CSS, TypeScript) for the web client and Electron for the private desktop client with offline resilience, native IPC streaming, and speech recognition.

---

## Task History

### Session: 2026-11-05
- **Task**: Remove legacy voice orb button and "VOICE READY" indicator status pill from empty chat screen per user request.
- **Root Cause & Rationale**: The empty state hero featured an intrusive circular pulsing orb with a cyan square, concentric ping animation, and a "VOICE READY" pill badge. This violated modern clean UI aesthetics and contained legacy AI glow tropes.
- **Changes Applied**:
  - `website/src/components/JarvisChat.tsx`:
    - Removed circular pulsating orb button (`onClick={activateOrb}`) and concentric ping rings.
    - Removed `orbStatus` badge (`VOICE READY` pill).
    - Removed unused `activateOrb` handler and `orbStatus` memoized string.
    - Purged `Sparkles` and `WandSparkles` Lucide icons from imports and starter prompt cards (replaced with clean `MessageSquare` vector iconography).
    - Preserved full voice input functionality via the existing bottom input bar microphone button and the `Ctrl+Shift+V` keyboard shortcut.
  - Verified compilation: `next build` executed with exit code 0 and clean static/dynamic route generation.
- **Documentation**:
  - Initialized mandatory `docs/work_log.md` and `docs/ui/chat-interface.md` to establish docs-first token-efficient context rehydration.
  - Authored comprehensive project architecture overview in `docs/features/architecture-overview.md`.

---

## Active Architecture & Roadmap
- **Frontend**: Next.js 14 in `website/`, standalone export to `website/out` for Electron packaging.
- **Desktop**: Electron in `electron-main/` with preload scripts and secure IPC bridge.
- **Next Priorities**:
  - Maintain clean typography, 8pt spatial grid, and professional vector iconography.
  - Continuous regression testing and zero lint/type errors.
