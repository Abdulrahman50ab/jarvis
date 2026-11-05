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
- **Task 2**: Fix broken toggle switch alignment and overflow in settings controls ([`controls.tsx`](file:///e:/Abdulrahman/jarvis/website/src/components/settings/controls.tsx)).
- **Root Cause & Rationale**: The `Toggle` switch thumb (`span`) was positioned using fragile `absolute top-0.5` without a defined `left` property, combined with non-standard `translate-x` distances and inline pixel sizing (`h-4.5 w-4.5` / `width: 18, height: 18`). This caused the active knob to overflow outside the red boundary on the right edge.
- **Changes Applied**:
  - Refactored `Toggle` in [`controls.tsx`](file:///e:/Abdulrahman/jarvis/website/src/components/settings/controls.tsx) to use industry-standard flexbox and padding metrics:
    - Container: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out`
    - Thumb: `pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out`
    - Positioning: `translate-x-0` when off, `translate-x-5` (20px) when on. Perfectly symmetrical 2px padding on all sides with zero overflow.
  - Added spring micro-interaction (`active:scale-95`) and focus-visible rings for accessibility.
  - Rebuilt and validated both `website/` Next.js production build and `electron-main/` static export (`npm run build:website`). Both exited with code 0.
- **Task 3**: Enabled vertical scrolling in Settings Modal sidebar navigation ([`SettingsModal.tsx`](file:///e:/Abdulrahman/jarvis/website/src/components/settings/SettingsModal.tsx)).
- **Root Cause & Rationale**: The left sidebar `<nav>` had fixed layout without `overflow-y-auto min-h-0`. On compact or standard display heights, items under "Advanced" (such as the "About" tab) were pushed below the visible boundary and completely unreachable.
- **Changes Applied**:
  - Updated `<aside>` with `md:min-h-0`.
  - Configured `<nav>` with `min-h-0 flex-1 space-y-1 overflow-y-auto pr-1` so that all navigation items (including "About" below "Advanced") scroll smoothly on any window/screen height.
  - Pinned the bottom auto-save note with `shrink-0 mt-3`.
  - Added bottom padding `pb-8` to the right `<main>` settings content pane to ensure bottom inputs never collide with the modal footer.
  - Verified compilation: `next build` and Electron `build:website` passed cleanly (exit code 0).
- **Task 4**: Real-time live speech-to-text typing across all selected languages in [`JarvisChat.tsx`](file:///e:/Abdulrahman/jarvis/website/src/components/JarvisChat.tsx).
- **Root Cause & Rationale**: The microphone flow previously routed desktop sessions to `startDesktopRecording` (silent file buffer recording with zero live interim transcription). Furthermore, `onresult` only iterated from `event.resultIndex` with `continuous: false`, causing transcript clipping and premature submission rather than continuous live typing.
- **Changes Applied**:
  - Restored priority to `SpeechRecognition` / `webkitSpeechRecognition` with `continuous: true` and `interimResults: true`.
  - In `recognition.onresult`: full transcript accumulator (`0` to `event.results.length - 1`) updates `input` state in real-time as words are spoken.
  - Multilingual support: applies `romanizeUrduText` live when Roman Urdu (`ur-Latn-PK`) is active, and direct native script for Urdu (`ur-PK`), Hindi (`hi-IN`), Hinglish (`hi-Latn-IN`), Arabic (`ar-SA`), English (`en-US`), French (`fr-FR`), Spanish (`es-ES`), German (`de-DE`), Japanese (`ja-JP`), and Chinese (`zh-CN`).
  - Added seamless dynamic language switching in `changeLanguage` (immediate `recognition.lang` update and hot restart).
  - Added 1.5s silence auto-send debounce timer preventing mid-sentence cut-offs while enabling hands-free dispatch.
  - Verified compilation: `next build` and Electron `build:website` passed cleanly (exit code 0).
- **Task 5**: Created root workspace script orchestrator ([`package.json`](file:///e:/Abdulrahman/jarvis/package.json)).
- **Root Cause & Rationale**: The project was refactored into two subdirectories (`website/` and `electron-main/`), leaving the root folder `E:\Abdulrahman\jarvis` without a `package.json`. Running `npm run dev` in the root threw an `ENOENT: no such file or directory, open 'package.json'` error.
- **Changes Applied**:
  - Authored root [`package.json`](file:///e:/Abdulrahman/jarvis/package.json) defining standard monorepo scripts (`dev`, `dev:web`, `dev:electron`, `build`, `build:website`, `build:electron`, `package-win`, `start`, `start:electron`, `lint`).
  - Directly proxies lifecycle commands into `website/` or `electron-main/` using `--prefix`.
  - Tested and verified execution of `npm run build` and `npm run dev` directly from the root directory.
- **Task 6**: Removed active provider status card and pill from sidebar and header in [`JarvisChat.tsx`](file:///e:/Abdulrahman/jarvis/website/src/components/JarvisChat.tsx).
- **Root Cause & Rationale**: The UI displayed an intrusive active model provider indicator ("Groq / openai/gpt-oss-20b") directly above "Settings and credentials" in the sidebar and in the desktop header, cluttering the chrome and exposing internal provider details on the main view.
- **Changes Applied**:
  - Removed the sidebar provider card located above "Settings and credentials".
  - Removed the redundant header provider status pill.
  - Retained provider and model configuration inside the Settings Modal under "Connections" and "Model".
  - Verified compilation: `next build` and Electron `build:website` completed with code 0.

---

## Active Architecture & Roadmap
- **Frontend**: Next.js 14 in `website/`, standalone export to `website/out` for Electron packaging.
- **Desktop**: Electron in `electron-main/` with preload scripts and secure IPC bridge.
- **Next Priorities**:
  - Maintain clean typography, 8pt spatial grid, and professional vector iconography.
  - Continuous regression testing and zero lint/type errors.
