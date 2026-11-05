# Multilingual Real-Time Speech Recognition Architecture

## Overview
JARVIS supports continuous live speech-to-text across 11 languages with real-time text projection directly into the chat input field (`website/src/components/JarvisChat.tsx`).

## Pipeline & Lifecycle
1. **Primary Engine**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
   - `continuous = true`: Keeps listening uninterrupted through natural speech pauses.
   - `interimResults = true`: Emits streaming intermediate word tokens before finalize.
2. **Real-Time Projection**:
   - `onresult` loops through `event.results` from index `0` to `event.results.length - 1`, accumulating the complete sentence.
   - For Roman Urdu (`ur-Latn-PK`), text is parsed through `romanizeUrduText` live so Latin Urdu characters type onto the screen.
   - For Urdu (`ur-PK`), English (`en-US`), Hindi (`hi-IN`), Hinglish (`hi-Latn-IN`), Arabic (`ar-SA`), French (`fr-FR`), Spanish (`es-ES`), German (`de-DE`), Japanese (`ja-JP`), and Chinese (`zh-CN`), direct native text displays live.
3. **Silence Timer & Auto-Send**:
   - While actively speaking, timers are cancelled.
   - When a sentence segment completes (`isFinal = true`), a 1.5-second silence debounce timer activates.
   - If user continues speaking, timer is reset.
   - If user stops speaking for 1.5s, the prompt is automatically dispatched.
   - Clicking the mic button stops recognition and leaves transcribed text in the composer for manual editing.
4. **Dynamic Language Switch**:
   - Selecting any language from the header globe dropdown immediately repoints `recognition.lang` and restarts the engine if active without requiring manual mic toggle.
