"use client";

import React, { useEffect, useRef, useState } from "react";
import { File as FileIcon, Folder, FolderOpen, Terminal, Send, ShieldCheck, ShieldOff, Loader2, X, Mic, MicOff } from "lucide-react";
import { useSettingsStore } from "@/lib/settings-store";

type TreeNode = { name: string; path: string; type: "dir" | "file"; children?: TreeNode[] };
type LogEntry = { id: number; kind: string; text: string; meta?: any };

let logId = 0;

export default function IdePanel({
  agentSendRef,
}: {
  agentSendRef: React.MutableRefObject<((text: string) => void) | null>;
}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState<{ path: string; content: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [permission, setPermission] = useState<{ request_id: string; action: string; args: any } | null>(null);
  const [running, setRunning] = useState(false);
  const [command, setCommand] = useState("");
  const [ideListening, setIdeListening] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["."]));
  const [autoApprove, setAutoApprove] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jarvis_auto_approve") === "true";
    }
    return false;
  });
  const autoApproveRef = useRef(autoApprove);
  autoApproveRef.current = autoApprove;

  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const permReqRef = useRef<any>(null);
  const messagesRef = useRef<LogEntry[]>([]);
  const runningRef = useRef(false);
  const permissionRef = useRef<any>(null);
  permissionRef.current = permission;
  const ideRecRef = useRef<any>(null);

  const appendLog = (entry: Omit<LogEntry, "id">) => {
    const next = { ...entry, id: ++logId };
    messagesRef.current = [...messagesRef.current, next];
    setLogs(messagesRef.current);
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const st = useSettingsStore.getState();
    if (st.voice.autoSpeak) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = st.voice.rate;
      u.pitch = st.voice.pitch;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  };

  const fetchTree = async () => {
    const st = useSettingsStore.getState();
    const base = st.aiModel.backendUrl.replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/api/v1/workspace/tree`);
      const json = await res.json();
      setTree(json.nodes || []);
    } catch (e) {
      appendLog({ kind: "error", text: "Could not load workspace tree" });
    }
  };

  const openFile = async (path: string) => {
    const st = useSettingsStore.getState();
    const base = st.aiModel.backendUrl.replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/api/v1/workspace/file?path=${encodeURIComponent(path)}`);
      const json = await res.json();
      setSelected({ path, content: json.content });
    } catch (e) {
      appendLog({ kind: "error", text: `Could not open ${path}` });
    }
  };

  useEffect(() => {
    let closedByUs = false;
    let reconnectTimer: any = null;

    const connect = () => {
      const st = useSettingsStore.getState();
      const base = st.aiModel.backendUrl.replace(/\/$/, "");
      const wsBase = base.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}/api/v1/ws/agent`);
      wsRef.current = ws;

      ws.onopen = () => appendLog({ kind: "system", text: "Agent core connected." });
      ws.onclose = () => {
        appendLog({ kind: "system", text: "Agent core disconnected." });
        if (!closedByUs) reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => appendLog({ kind: "error", text: "Agent socket error." });
      ws.onmessage = (ev) => {
        let data: any;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return;
        }
        handleAgentEvent(data);
      };
    };

    connect();
    fetchTree();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  const handleAgentEvent = (data: any) => {
    switch (data.type) {
      case "agent_start":
        setRunning(true);
        runningRef.current = true;
        appendLog({ kind: "start", text: `TASK: ${data.content}` });
        break;
      case "thought":
        if (data.content) appendLog({ kind: "thought", text: data.content });
        break;
      case "tool":
        appendLog({
          kind: "tool",
          text: `${data.action}`,
          meta: { args: data.args, result: data.result },
        });
        fetchTree();
        break;
      case "message":
        appendLog({ kind: "message", text: data.content });
        speak(data.content);
        break;
      case "denied":
        appendLog({ kind: "denied", text: `Permission denied for ${data.action}` });
        break;
      case "permission":
        if (autoApproveRef.current) {
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: "permission_response", request_id: data.request_id, approved: true }));
            appendLog({ kind: "system", text: "✓ Permission auto-approved (Auto-Approve Enabled)" });
          }
        } else {
          setPermission({ request_id: data.request_id, action: data.action, args: data.args });
          permReqRef.current = { request_id: data.request_id, action: data.action, args: data.args };
          appendLog({ kind: "permission", text: `REQUEST: ${data.action}`, meta: data.args });
          speak(`Sir, should I ${data.action.replace(/_/g, " ")}? Say yes or no.`);
          if (!ideListening) startIdeVoice();
        }
        break;
      case "error":
        appendLog({ kind: "error", text: data.content });
        break;
      case "done":
        setRunning(false);
        runningRef.current = false;
        appendLog({ kind: "system", text: "— Agent idle —" });
        break;
    }
  };

  const resolvePermission = (approved: boolean) => {
    const req = permReqRef.current;
    if (req && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "permission_response", request_id: req.request_id, approved }));
      appendLog({ kind: "system", text: approved ? "✓ Permission granted" : "✗ Permission denied" });
    }
    setPermission(null);
    permReqRef.current = null;
  };

  const startIdeVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech Recognition not supported. Use Chrome/Edge, or type your command.");
      return;
    }
    if (ideRecRef.current) {
      try { ideRecRef.current.stop(); } catch {}
      ideRecRef.current = null;
      setIdeListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const idx = e.resultIndex ?? 0;
      const t = (e.results[idx]?.[0]?.transcript || "").trim().toLowerCase();
      if (!t) return;
      if (permissionRef.current) {
        if (/(yes|haan|han|allow|approve|ok|okay|do it|go ahead|sure)/.test(t)) resolvePermission(true);
        else if (/(no|nahi|deny|reject|cancel|don't|dont|stop)/.test(t)) resolvePermission(false);
        return;
      }
      sendCommand(t);
    };
    rec.onend = () => { setIdeListening(false); ideRecRef.current = null; };
    rec.onerror = () => { setIdeListening(false); ideRecRef.current = null; };
    try { rec.start(); setIdeListening(true); ideRecRef.current = rec; } catch {}
  };

  const sendCommand = (text: string) => {
    if (!text.trim()) return;
    if (runningRef.current) {
      appendLog({ kind: "system", text: "Agent busy — command ignored until it finishes." });
      return;
    }
    appendLog({ kind: "user", text });
    const st = useSettingsStore.getState();
    const cfg = st.aiModel;
    const model_settings = {
      model: cfg.model,
      temperature: cfg.temperature,
      top_p: cfg.topP,
      top_k: cfg.topK,
      max_tokens: cfg.maxTokens,
      system_prompt: cfg.systemPrompt,
    };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setRunning(true);
      runningRef.current = true;
      wsRef.current.send(JSON.stringify({ type: "command", text, model_settings }));
    } else {
      appendLog({ kind: "error", text: "Agent core not connected" });
    }
  };

  agentSendRef.current = sendCommand;

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleDir = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNodes = (nodes: TreeNode[], depth = 0) =>
    nodes.map((n) => (
      <div key={n.path}>
        <div
          className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-[var(--accent-bg)] rounded cursor-pointer text-[13px]"
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={() => (n.type === "dir" ? toggleDir(n.path) : openFile(n.path))}
        >
          {n.type === "dir" ? (
            expanded.has(n.path) ? (
              <FolderOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-[var(--accent)]" />
            )
          ) : (
            <FileIcon className="w-3.5 h-3.5 text-[var(--muted)]" />
          )}
          <span className={n.type === "file" ? "text-[var(--accent)]" : "text-[var(--foreground)]"}>
            {n.name}
          </span>
        </div>
        {n.type === "dir" && expanded.has(n.path) && n.children && renderNodes(n.children, depth + 1)}
      </div>
    ));

  const logColor: Record<string, string> = {
    thought: "text-[var(--muted)] italic",
    tool: "text-[var(--accent)] font-mono",
    message: "text-[var(--foreground)]",
    user: "text-emerald-400 font-mono",
    permission: "text-amber-400 font-mono",
    denied: "text-red-400 font-mono",
    error: "text-red-500 font-mono",
    system: "text-[var(--muted)] uppercase text-[10px] tracking-widest",
    start: "text-[var(--accent)] font-bold",
  };

  return (
    <div className="relative w-[42%] max-w-[640px] min-w-[360px] border-r border-[var(--accent-border)] bg-[var(--card-bg)] flex flex-col h-full">
      <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--accent-border)] bg-[var(--background)]">
        <span className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-mono">
          JARVIS IDE · Agent Workspace
        </span>
        <div className="flex items-center gap-2">
          {ideListening && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              listening
            </span>
          )}
          <button onClick={fetchTree} className="text-[var(--muted)] hover:text-[var(--accent)] text-xs">
            ↻ refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-1/2 border-r border-[var(--accent-border)] overflow-y-auto p-2">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1">Files</div>
          {renderNodes(tree)}
        </div>
        <div className="w-1/2 overflow-y-auto p-2">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1">
            {selected ? selected.path : "No file open"}
          </div>
          {selected ? (
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-[var(--accent)]">
              {selected.content}
            </pre>
          ) : (
            <div className="text-[var(--muted)] text-xs">Select a file from the tree to preview it.</div>
          )}
        </div>
      </div>

      <div className="h-1/3 min-h-[140px] border-t border-[var(--accent-border)] bg-black/40 overflow-y-auto p-2 font-mono text-[11px]">
        <div className="flex items-center gap-1.5 text-[var(--muted)] mb-1 uppercase tracking-widest text-[10px]">
          <Terminal className="w-3 h-3" /> Agent Console
          {running && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />}
        </div>
        {logs.map((l) => (
          <div key={l.id} className={`mb-1 ${logColor[l.kind] || "text-[var(--foreground)]"}`}>
            {l.kind === "tool" && (
              <div>
                <span className="text-[var(--accent)]">▸ {l.text}</span>
                {l.meta?.args && (
                  <span className="text-[var(--muted)]"> ({JSON.stringify(l.meta.args)})</span>
                )}
                {l.meta?.result && (
                  <pre className="text-[var(--muted)] whitespace-pre-wrap mt-0.5 text-[10px]">
                    {String(l.meta.result).slice(0, 600)}
                  </pre>
                )}
              </div>
            )}
            {l.kind !== "tool" && <span>{l.text}</span>}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <div className="flex items-center gap-2 p-2 border-t border-[var(--accent-border)]">
        <button
          onClick={startIdeVoice}
          title={ideListening ? "Stop voice commands" : "Start voice commands"}
          className={`p-1.5 rounded transition-all ${
            ideListening
              ? "bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 animate-pulse"
              : "bg-[var(--accent-bg)] text-[var(--accent)] hover:bg-[var(--accent-bg-strong)]"
          }`}
        >
          {ideListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendCommand(command);
              setCommand("");
            }
          }}
          placeholder="Tell JARVIS what to build/fix (voice or text)..."
          className="flex-1 bg-[var(--background)] border border-[var(--accent-border-strong)] rounded px-2 py-1.5 text-[12px] text-[var(--accent)] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={() => {
            sendCommand(command);
            setCommand("");
          }}
          className="p-1.5 rounded bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-strong)] text-[var(--accent)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {ideListening && (
        <div className="px-3 pb-2 text-[11px] font-mono text-emerald-400/90 animate-pulse">
          🎤 Listening… speak your command (or say "yes"/"no" when asked for permission).
        </div>
      )}

      {permission && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="w-[420px] max-w-[90%] border border-amber-500/50 bg-[var(--card-bg)] rounded-lg p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-mono uppercase tracking-widest">Permission Required</span>
            </div>
            <div className="text-[var(--foreground)] text-sm mb-1">
              JARVIS wants to run:{" "}
              <span className="font-mono text-[var(--accent)]">{permission.action.replace(/_/g, " ")}</span>
            </div>
            <pre className="text-[11px] text-[var(--muted)] bg-black/40 rounded p-2 overflow-auto max-h-40 mb-4 font-mono">
              {JSON.stringify(permission.args, null, 2)}
            </pre>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resolvePermission(true)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-600/30 text-xs font-mono uppercase tracking-wider"
              >
                <ShieldCheck className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => resolvePermission(false)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 text-xs font-mono uppercase tracking-wider"
              >
                <ShieldOff className="w-4 h-4" /> Reject
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--accent-border)]">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[var(--muted)] font-mono hover:text-[var(--accent)] transition-colors">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoApprove(checked);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("jarvis_auto_approve", checked ? "true" : "false");
                    }
                  }}
                  className="accent-[var(--accent)] rounded"
                />
                <span>Always Auto-Approve (Don't ask confirmation dialog again)</span>
              </label>
            </div>
            <div className="text-[10px] text-[var(--muted)] text-center mt-2 font-mono">
              or just say "yes" / "no"
            </div>
            <button
              onClick={() => resolvePermission(false)}
              className="absolute top-2 right-2 text-[var(--muted)] hover:text-[var(--accent)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}