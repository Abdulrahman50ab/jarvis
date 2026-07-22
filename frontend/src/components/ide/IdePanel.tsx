"use client";

import React, { useEffect, useRef, useState } from "react";
import { File as FileIcon, Folder, FolderOpen, Terminal, Send, ShieldCheck, ShieldOff, Loader2, X, Mic, MicOff, Save, GitBranch, RefreshCw, Layers } from "lucide-react";
import { useSettingsStore } from "@/lib/settings-store";

type TreeNode = { name: string; path: string; type: "dir" | "file"; children?: TreeNode[] };
type LogEntry = { id: number; kind: string; text: string; meta?: any };
type OpenTab = { path: string; name: string; content: string; isModified?: boolean };

let logId = 0;

export default function IdePanel({
  agentSendRef,
}: {
  agentSendRef: React.MutableRefObject<((text: string) => void) | null>;
}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [permission, setPermission] = useState<{ request_id: string; action: string; args: any } | null>(null);
  const [running, setRunning] = useState(false);
  const [command, setCommand] = useState("");
  const [ideListening, setIdeListening] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["."]));
  
  // Git & System status
  const [gitStatus, setGitStatus] = useState<{ isRepo: boolean; branch: string; modifiedCount: number }>({
    isRepo: false,
    branch: "main",
    modifiedCount: 0
  });

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

  const activeTab = openTabs.find((t) => t.path === activeTabPath) || null;

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

  const fetchGitInfo = async () => {
    if (typeof window !== "undefined" && window.electronAPI?.getGitStatus) {
      const res = await window.electronAPI.getGitStatus();
      if (res.success && res.isRepo) {
        setGitStatus({
          isRepo: true,
          branch: res.branch || "main",
          modifiedCount: res.modifiedCount || 0
        });
      }
    }
  };

  const fetchTree = async () => {
    if (typeof window !== "undefined" && window.electronAPI?.readFolderTree) {
      const res = await window.electronAPI.readFolderTree(process.cwd?.() || ".");
      if (res.success && res.tree) {
        setTree(res.tree);
        fetchGitInfo();
        return;
      }
    }

    const st = useSettingsStore.getState();
    const base = st.aiModel.backendUrl.replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/api/v1/workspace/tree`);
      const json = await res.json();
      setTree(json.nodes || []);
    } catch (e) {
      appendLog({ kind: "error", text: "Could not load workspace tree" });
    }
    fetchGitInfo();
  };

  const openFileInTab = async (filePath: string, fileName?: string) => {
    const existing = openTabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabPath(filePath);
      return;
    }

    let fileContent = "";
    if (typeof window !== "undefined" && window.electronAPI?.readFile) {
      const res = await window.electronAPI.readFile(filePath);
      if (res.success && res.content !== undefined) {
        fileContent = res.content;
      }
    } else {
      const st = useSettingsStore.getState();
      const base = st.aiModel.backendUrl.replace(/\/$/, "");
      try {
        const res = await fetch(`${base}/api/v1/workspace/file?path=${encodeURIComponent(filePath)}`);
        const json = await res.json();
        fileContent = json.content || "";
      } catch (e) {
        appendLog({ kind: "error", text: `Could not open ${filePath}` });
        return;
      }
    }

    const name = fileName || filePath.split(/[/\\]/).pop() || filePath;
    const newTab: OpenTab = { path: filePath, name, content: fileContent, isModified: false };
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabPath(filePath);
  };

  const closeTab = (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.path !== filePath);
      if (activeTabPath === filePath) {
        setActiveTabPath(next.length > 0 ? next[next.length - 1].path : null);
      }
      return next;
    });
  };

  const updateActiveTabContent = (newContent: string) => {
    if (!activeTabPath) return;
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.path === activeTabPath ? { ...t, content: newContent, isModified: true } : t
      )
    );
  };

  const saveActiveTab = async () => {
    if (!activeTab) return;
    if (typeof window !== "undefined" && window.electronAPI?.writeFile) {
      const res = await window.electronAPI.writeFile(activeTab.path, activeTab.content);
      if (res.success) {
        setOpenTabs((prev) =>
          prev.map((t) => (t.path === activeTab.path ? { ...t, isModified: false } : t))
        );
        appendLog({ kind: "system", text: `Saved file: ${activeTab.name}` });
        fetchGitInfo();
      } else {
        appendLog({ kind: "error", text: `Failed to save file: ${res.error}` });
      }
    } else {
      appendLog({ kind: "system", text: `File updated in local state: ${activeTab.name}` });
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
      ws.onerror = () => appendLog({ kind: "error", text: "Agent socket fallback ready." });
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

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;

    appendLog({ kind: "user", text });

    // Check if user is executing a native shell command in Electron desktop app
    if (typeof window !== "undefined" && window.electronAPI?.executeCommand && (text.startsWith("$") || text.startsWith("run ") || text.startsWith("npm ") || text.startsWith("git ") || text.startsWith("dir") || text.startsWith("ls"))) {
      const cleanCmd = text.startsWith("$") ? text.slice(1).trim() : (text.startsWith("run ") ? text.slice(4).trim() : text);
      appendLog({ kind: "system", text: `[Native Exec] > ${cleanCmd}` });
      setRunning(true);
      const res = await window.electronAPI.executeCommand(cleanCmd);
      setRunning(false);
      if (res.success) {
        appendLog({ kind: "message", text: res.output });
      } else {
        appendLog({ kind: "error", text: res.output || res.error || "Command execution failed" });
      }
      fetchTree();
      return;
    }

    if (runningRef.current) {
      appendLog({ kind: "system", text: "Agent busy — command ignored until it finishes." });
      return;
    }

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
      appendLog({ kind: "error", text: "Agent WS core offline. Use terminal prefix '$ command' for desktop execution." });
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
          onClick={() => (n.type === "dir" ? toggleDir(n.path) : openFileInTab(n.path, n.name))}
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

  const getLanguageBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return 'TypeScript';
      case 'js': case 'jsx': return 'JavaScript';
      case 'json': return 'JSON';
      case 'css': return 'CSS';
      case 'html': return 'HTML';
      case 'md': return 'Markdown';
      case 'py': return 'Python';
      default: return ext?.toUpperCase() || 'Text';
    }
  };

  const activeContentLines = activeTab ? activeTab.content.split('\n').length : 0;
  const activeContentChars = activeTab ? activeTab.content.length : 0;

  return (
    <div className="relative w-[48%] max-w-[720px] min-w-[380px] border-r border-[var(--accent-border)] bg-[var(--card-bg)] flex flex-col h-full">
      {/* Top Header Bar */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--accent-border)] bg-[var(--background)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> JARVIS IDE · Workspace
          </span>
          {gitStatus.isRepo && (
            <span className="flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              <GitBranch className="w-3 h-3" /> {gitStatus.branch}
              {gitStatus.modifiedCount > 0 && (
                <span className="text-amber-400 font-bold ml-0.5">({gitStatus.modifiedCount} modified)</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ideListening && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              listening
            </span>
          )}
          <button onClick={fetchTree} title="Refresh File Tree & Git Status" className="text-[var(--muted)] hover:text-[var(--accent)] text-xs flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> refresh
          </button>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="flex flex-1 min-h-0">
        {/* Left: File Tree */}
        <div className="w-1/3 border-r border-[var(--accent-border)] overflow-y-auto p-2">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1 font-mono">Project Files</div>
          {renderNodes(tree)}
        </div>

        {/* Right: Multi-Tab Editor Area */}
        <div className="w-2/3 flex flex-col min-h-0 bg-[var(--background)]/50">
          {/* Tabs Bar */}
          <div className="flex items-center bg-black/40 border-b border-[var(--accent-border)] overflow-x-auto min-h-[32px]">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono border-r border-[var(--accent-border)] cursor-pointer select-none transition-colors ${
                  activeTabPath === tab.path
                    ? "bg-[var(--card-bg)] text-[var(--accent)] border-b-2 border-b-[var(--accent)] font-medium"
                    : "text-[var(--muted)] hover:bg-[var(--card-bg)]/50 hover:text-[var(--foreground)]"
                }`}
              >
                <FileIcon className="w-3 h-3" />
                <span>{tab.name}</span>
                {tab.isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />}
                <button
                  onClick={(e) => closeTab(tab.path, e)}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded text-[var(--muted)] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {openTabs.length === 0 && (
              <div className="px-3 text-[11px] font-mono text-[var(--muted)] py-1 italic">
                No file open
              </div>
            )}
          </div>

          {/* Active File Editor Header & Stats */}
          {activeTab && (
            <div className="px-3 py-1 flex items-center justify-between bg-black/20 border-b border-[var(--accent-border)] text-[10px] font-mono text-[var(--muted)]">
              <div className="flex items-center gap-3">
                <span className="text-[var(--accent)] font-semibold">{getLanguageBadge(activeTab.name)}</span>
                <span>{activeContentLines} lines</span>
                <span>{activeContentChars} chars</span>
              </div>
              <div className="flex items-center gap-2">
                {activeTab.isModified && (
                  <span className="text-amber-400">Unsaved changes</span>
                )}
                <button
                  onClick={saveActiveTab}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-strong)] text-[var(--accent)] transition-colors"
                >
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          )}

          {/* Editor Body */}
          <div className="flex-1 p-2 overflow-auto font-mono text-xs">
            {activeTab ? (
              <textarea
                value={activeTab.content}
                onChange={(e) => updateActiveTabContent(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                    e.preventDefault();
                    saveActiveTab();
                  }
                }}
                className="w-full h-full bg-transparent text-[var(--foreground)] resize-none outline-none font-mono leading-relaxed text-[12px]"
                spellCheck={false}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--muted)] text-xs font-mono">
                Select a file from the explorer to open in editor tab.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal / Console area */}
      <div className="h-1/3 min-h-[140px] border-t border-[var(--accent-border)] bg-black/40 overflow-y-auto p-2 font-mono text-[11px]">
        <div className="flex items-center justify-between text-[var(--muted)] mb-1 uppercase tracking-widest text-[10px]">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[var(--accent)]" /> Agent Console & Shell
            {running && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />}
          </div>
          <span className="text-[9px] text-emerald-400 font-mono">
            {typeof window !== "undefined" && window.electronAPI ? "Desktop Native Terminal" : "Web Bridge"}
          </span>
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
            {l.kind !== "tool" && <span className="whitespace-pre-wrap">{l.text}</span>}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Input bar */}
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
          placeholder="Tell JARVIS what to build/fix, or run command '$ npm test'..."
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

      {/* Permission Approval Modal */}
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