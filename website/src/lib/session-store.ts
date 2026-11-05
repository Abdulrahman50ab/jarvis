"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface SessionState {
  sessions: ChatSession[];
  activeSessionId: string;

  // Actions
  createSession: (title?: string) => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearAllSessions: () => void;
  saveActiveMessages: (messages: Message[]) => void;
  setSessionTitle: (id: string, title: string) => void;
}

function createInitialSession(): ChatSession {
  return {
    id: `session-${Date.now()}`,
    title: "New conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const initialSession = createInitialSession();

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [initialSession],
      activeSessionId: initialSession.id,

      createSession: (title = "New conversation") => {
        const currentSessions = get().sessions;
        const active = currentSessions.find((s) => s.id === get().activeSessionId);

        // If active session is already empty, reuse it instead of creating duplicates
        if (active && active.messages.length === 0) {
          return active.id;
        }

        const newSession: ChatSession = {
          id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set({
          sessions: [newSession, ...currentSessions],
          activeSessionId: newSession.id,
        });

        return newSession.id;
      },

      switchSession: (id: string) => {
        const session = get().sessions.find((s) => s.id === id);
        if (session) {
          set({ activeSessionId: id });
        }
      },

      deleteSession: (id: string) => {
        const current = get().sessions;
        const remaining = current.filter((s) => s.id !== id);

        if (remaining.length === 0) {
          const fresh = createInitialSession();
          set({ sessions: [fresh], activeSessionId: fresh.id });
          return;
        }

        const nextActiveId =
          get().activeSessionId === id ? remaining[0].id : get().activeSessionId;

        set({
          sessions: remaining,
          activeSessionId: nextActiveId,
        });
      },

      clearAllSessions: () => {
        const fresh = createInitialSession();
        set({ sessions: [fresh], activeSessionId: fresh.id });
      },

      saveActiveMessages: (messages: Message[]) => {
        const activeId = get().activeSessionId;
        const sessions = get().sessions.map((session) => {
          if (session.id !== activeId) return session;

          let title = session.title;
          if (title === "New conversation" || !title) {
            const firstUser = messages.find((m) => m.role === "user");
            if (firstUser?.content) {
              const trimmed = firstUser.content.trim().slice(0, 36);
              title = `${trimmed}${firstUser.content.length > 36 ? "…" : ""}`;
            }
          }

          return {
            ...session,
            messages,
            title,
            updatedAt: Date.now(),
          };
        });

        set({ sessions });
      },

      setSessionTitle: (id: string, title: string) => {
        set({
          sessions: get().sessions.map((s) =>
            s.id === id ? { ...s, title, updatedAt: Date.now() } : s,
          ),
        });
      },
    }),
    {
      name: "jarvis_chat_sessions_v2",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
