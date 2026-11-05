"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Trash2, FolderOpen, Download, Loader2, MessageSquare } from "lucide-react";
import JarvisLogo from "@/components/JarvisLogo";
import { useSettingsStore } from "@/lib/settings-store";

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  message_count: number;
  messages?: { role: string; content: string }[];
}

interface MemoryEngineModalProps {
  open: boolean;
  onClose: () => void;
  backendUrl: string;
  onLoadConversation: (messages: { sender: "user" | "jarvis"; text: string }[]) => void;
}

export default function MemoryEngineModal({
  open,
  onClose,
  backendUrl,
  onLoadConversation,
}: MemoryEngineModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) fetchConversations();
  }, [open, backendUrl]);

  // Full-text search via backend when query present
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      fetchConversations();
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/v1/conversations/search/${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch (e) {
        if ((e as any).name !== "AbortError") console.warn("Search failed:", e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [search, backendUrl]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.warn("Failed to load conversations:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conv: Conversation) => {
    if (conv.messages) {
      const mapped = conv.messages.map((m): { sender: "user" | "jarvis"; text: string } => ({
        sender: m.role === "user" ? "user" : "jarvis",
        text: m.content,
      }));
      onLoadConversation(mapped);
      onClose();
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/api/v1/conversations/${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.messages.map((m: any): { sender: "user" | "jarvis"; text: string } => ({
          sender: m.role === "user" ? "user" : "jarvis",
          text: m.content,
        }));
        onLoadConversation(mapped);
        onClose();
      }
    } catch (e) {
      console.warn("Failed to load conversation:", e);
    }
  };

  const deleteConversation = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`${backendUrl}/api/v1/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.warn("Failed to delete:", e);
    } finally {
      setDeleting(null);
    }
  };

  const clearAll = async () => {
    if (!confirm("Delete ALL conversations? This cannot be undone.")) return;
    try {
      const res = await fetch(`${backendUrl}/api/v1/conversations`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations([]);
      }
    } catch (e) {
      console.warn("Failed to clear:", e);
    }
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${backendUrl}/api/v1/conversations`);
      if (res.ok) {
        const data = await res.json();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jarvis-conversations-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const filtered = search.trim()
    ? conversations
    : conversations;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] rounded-xl border border-[var(--accent-border)] bg-[var(--panel-bg)] overflow-hidden shadow-[0_0_40px_var(--accent-glow)] flex flex-col">
        <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--accent-border)] shrink-0">
          <div className="flex items-center gap-3">
            <JarvisLogo className="h-8 w-8 shadow-[0_5px_16px_var(--accent-glow)]" alt="" />
            <h2 className="text-lg font-bold tracking-widest text-[var(--accent)] uppercase">Memory Engine</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportAll}
              disabled={exporting}
              className="px-3 py-1.5 rounded border border-[var(--accent-border)] text-xs text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all disabled:opacity-50"
              title="Export all conversations (JSON)"
            >
              <Download className="w-3 h-3 mr-1" /> Export
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 rounded border border-red-500/40 text-xs text-red-400 hover:bg-red-950/30 transition-all"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear All
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--accent-border)] shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded border border-[var(--accent-border)] bg-[var(--input-bg)] text-[var(--foreground)] placeholder-[var(--muted)] outline-none focus:border-[var(--accent)] transition-all"
              />
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">
              {filtered.length} / {conversations.length} conversations
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-[var(--muted)]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--muted)]">
                <MessageSquare className="w-16 h-16 opacity-30 mb-4" />
                <p className="text-sm">No conversations found</p>
                <p className="text-xs mt-1">Start chatting to build memory</p>
              </div>
            ) : (
              filtered.map((c) => {
                const isExpanded = expanded === c.id;
                return (
                  <div
                    key={c.id}
                    className={`rounded-lg border transition-all ${
                      isExpanded
                        ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--accent-border)]"
                    }`}
                  >
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="w-full p-3 text-left flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-[var(--accent)]">
                            {c.id.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {c.message_count} msgs
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {new Date(c.updated_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--foreground)] line-clamp-2">{c.last_message || "(empty)"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); loadConversation(c); }}
                          className="px-3 py-1.5 rounded border border-[var(--accent-border)] text-xs text-[var(--accent)] hover:bg-[var(--accent-bg)] transition-all flex items-center gap-1"
                          title="Load conversation"
                        >
                          <FolderOpen className="w-3 h-3" /> Load
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          disabled={deleting === c.id}
                          className="px-2 py-1.5 rounded border border-red-500/40 text-xs text-red-400 hover:bg-red-950/30 transition-all disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-[var(--accent-border)] animate-slide-down">
                        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                          {c.messages?.map((m, i) => (
                            <div
                              key={i}
                              className={`text-sm p-2 rounded ${
                                m.role === "user"
                                  ? "bg-[var(--accent-bg)] text-[var(--foreground)] ml-8"
                                  : "bg-[var(--card-bg)] text-[var(--accent)] mr-8 border border-[var(--card-border)]"
                              }`}
                            >
                              <div className="text-xs font-mono text-[var(--muted)] mb-1">
                                {m.role === "user" ? "USER" : "JARVIS"}
                              </div>
                              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                            </div>
                          ))}
                          {!c.messages && (
                            <div className="text-xs text-[var(--muted)] italic py-2">
                              Click Load to fetch full conversation
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
