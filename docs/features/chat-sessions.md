# Multi-Session Persistent Chat History

## Overview
The JARVIS multi-session chat system provides persistent, isolated conversation threads stored locally on the client. Users can create new conversations, switch between previous discussions, track message counts, and delete obsolete threads without losing their message history across application reloads or restarts.

---

## State Management Architecture

The session state is orchestrated via Zustand using the `persist` middleware:

- **Storage Key**: `jarvis_chat_sessions_v2`
- **Store Path**: [`website/src/lib/session-store.ts`](file:///e:/Abdulrahman/jarvis/website/src/lib/session-store.ts)
- **Component Integration**: [`website/src/components/JarvisChat.tsx`](file:///e:/Abdulrahman/jarvis/website/src/components/JarvisChat.tsx)

### Data Schema

```typescript
export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface SessionState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  createSession: (initialTitle?: string) => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  saveActiveMessages: (messages: Message[]) => void;
  setSessionTitle: (sessionId: string, title: string) => void;
  getActiveSession: () => ChatSession | undefined;
}
```

---

## Key Behaviors & Lifecycle

1. **Persistent Session Initialization**:
   - On initial mount or hydration, the store verifies if an active session exists. If empty, a default "New conversation" session is automatically created and activated.
2. **Session Creation**:
   - Triggered via the "New conversation" button or shortcut.
   - Preserves all past sessions and appends a fresh conversation thread.
   - Automatically switches focus and resets the active message stream.
3. **Session Switching**:
   - Safely cancels active text generation, streaming abort controllers, and active speech recognition before transition.
   - Loads the selected thread's full message array into the active conversation view.
4. **Auto-Titling**:
   - The session title dynamically derives from the user's initial prompt (truncated cleanly to 32 characters) or topic summary.
5. **Thread Deletion**:
   - Each session in the sidebar features a subtle delete button (`Trash2` vector icon).
   - Deleting the active session smoothly shifts focus to the next available session or provisions a new clean session if no others exist.
6. **Sidebar Navigation**:
   - Replaced single static session placeholder with a scrollable list (`Conversations ({count})`).
   - Active session receives an elevated background, subtle border highlight, and message badge.

---

## Verification & Standards
- 100% TypeScript type safety.
- Zero decorative emojis or AI glow tropes.
- Clean vector iconography (Lucide `MessageSquare`, `Trash2`, `Plus`).
