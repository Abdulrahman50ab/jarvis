"use client";

import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  File as FileIcon,
  Folder,
  FolderOpen,
  Terminal,
  Send,
  ShieldCheck,
  ShieldOff,
  Loader2,
  X,
  Mic,
  MicOff,
  Save,
  GitBranch,
  RefreshCw,
  Layers,
  Search,
  Cpu,
  Bell,
  Code2,
  Check,
} from "lucide-react";
import { useSettingsStore } from "@/lib/settings-store";
import DiffPreviewModal from "./DiffPreviewModal";

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

  // Live Monaco Editor Cursor & Selection stats
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [selectedLanguage, setSelectedLanguage] = useState("plaintext");
  const editorRef = useRef<any>(null);

  // Search & Navigation state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchResults, setSearchResults] = useState<{ path: string; line: number; text: string }[]>([]);

  // Terminal Tabs & Modes
  const [terminalTab, setTerminalTab] = useState<"console" | "shell" | "output">("console");
  const [shellLogs, setShellLogs] = useState<string[]>([]);
  const [shellInput, setShellInput] = useState("");

  // AI Diff Preview state
  const [diffModal, setDiffModal] = useState<{
    isOpen: boolean;
    filename: string;
    targetPath: string;
    originalCode: string;
    proposedCode: string;
  }>({
    isOpen: false,
    filename: "",
    targetPath: "",
    originalCode: "",
    proposedCode: "",
  });

  // Agent Autonomous Mode
  const [autoMode, setAutoMode] = useState(true);

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
    modifiedCount: 0,
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

  const appendShellLog = (text: string) => {
    setShellLogs((prev) => [...prev, text]);
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const st = useSettingsStore.getState();
    if (!st.voice.autoSpeak || st.voice.volume === 0) {
      window.speechSynthesis.cancel();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = st.voice.rate;
    u.pitch = st.voice.pitch;
    u.volume = st.voice.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const fetchGitInfo = async () => {
    if (typeof window !== "undefined" && window.electronAPI?.getGitStatus) {
      const res = await window.electronAPI.getGitStatus();
      if (res.success && res.isRepo) {
        setGitStatus({
          isRepo: true,
          branch: res.branch || "main",
          modifiedCount: res.modifiedCount || 0,
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
    setSelectedLanguage(getMonacoLanguage(name));
  };

  const closeTab = (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.path !== filePath);
      if (activeTabPath === filePath) {
        const nextActive = next.length > 0 ? next[next.length - 1] : null;
        setActiveTabPath(nextActive ? nextActive.path : null);
        if (nextActive) setSelectedLanguage(getMonacoLanguage(nextActive.name));
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

  const executeGlobalSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results: { path: string; line: number; text: string }[] = [];

    openTabs.forEach((tab) => {
      const lines = tab.content.split("\n");
      lines.forEach((lineText, idx) => {
        if (lineText.toLowerCase().includes(query)) {
          results.push({ path: tab.path, line: idx + 1, text: lineText.trim() });
        }
      });
    });

    setSearchResults(results);
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
      ws.onerror = () => appendLog({ kind: "system", text: "Agent socket fallback ready." });
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
        if (
          (data.action === "write_file" || data.action === "edit_file" || data.action === "create_file") &&
          data.args?.path &&
          data.args?.content
        ) {
          const path = data.args.path;
          const proposedContent = data.args.content;
          const currentTab = openTabs.find((t) => t.path === path);
          const origCode = currentTab ? currentTab.content : "";

          setDiffModal({
            isOpen: true,
            filename: path.split(/[/\\]/).pop() || path,
            targetPath: path,
            originalCode: origCode,
            proposedCode: proposedContent,
          });
        }

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

  const handleAcceptDiff = async () => {
    if (!diffModal.targetPath) return;
    const { targetPath, proposedCode } = diffModal;
    if (typeof window !== "undefined" && window.electronAPI?.writeFile) {
      await window.electronAPI.writeFile(targetPath, proposedCode);
    }
    openFileInTab(targetPath);
    setDiffModal((prev) => ({ ...prev, isOpen: false }));
    appendLog({ kind: "system", text: `✓ AI edits accepted and saved for ${diffModal.filename}` });
  };

  const handleRejectDiff = () => {
    setDiffModal((prev) => ({ ...prev, isOpen: false }));
    appendLog({ kind: "denied", text: `✗ AI edits rejected for ${diffModal.filename}` });
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

  const runNativeShellCommand = async (cmdStr: string) => {
    if (!cmdStr.trim()) return;
    appendShellLog(`$ ${cmdStr}`);
    if (typeof window !== "undefined" && window.electronAPI?.executeCommand) {
      const res = await window.electronAPI.executeCommand(cmdStr);
      appendShellLog(res.output || res.error || "Done.");
    } else {
      appendShellLog("Desktop Electron Bridge not connected.");
    }
  };

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;

    appendLog({ kind: "user", text });

    if (
      typeof window !== "undefined" &&
      window.electronAPI?.executeCommand &&
      (text.startsWith("$") || text.startsWith("run ") || text.startsWith("npm ") || text.startsWith("git ") || text.startsWith("dir") || text.startsWith("ls"))
    ) {
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
      wsRef.current.send(JSON.stringify({ type: "command", text, model_settings, autonomous: autoMode }));
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

  const getMonacoLanguage = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "json":
        return "json";
      case "css":
        return "css";
      case "html":
        return "html";
      case "py":
        return "python";
      case "md":
        return "markdown";
      case "sql":
        return "sql";
      default:
        return "plaintext";
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });
  };

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
    <div className="relative w-[52%] max-w-[780px] min-w-[420px] border-r border-[var(--accent-border)] bg-[var(--card-bg)] flex flex-col h-full overflow-hidden">
      {/* AI Code Diff Review Modal */}
      <DiffPreviewModal
        isOpen={diffModal.isOpen}
        filename={diffModal.filename}
        originalCode={diffModal.originalCode}
        modifiedCode={diffModal.proposedCode}
        onAccept={handleAcceptDiff}
        onReject={handleRejectDiff}
      />

      {/* Top Header Bar */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--accent-border)] bg-[var(--background)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-mono flex items-center gap-1.5 font-bold">
            <Layers className="w-3.5 h-3.5" /> JARVIS IDE Pro
          </span>
          {gitStatus.isRepo && (
            <span
              onClick={() => {
                setTerminalTab("shell");
                runNativeShellCommand("git status");
              }}
              className="flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded cursor-pointer hover:bg-emerald-500/20 transition-all"
              title="Click to view Git status in shell"
            >
              <GitBranch className="w-3 h-3" /> {gitStatus.branch}
              {gitStatus.modifiedCount > 0 && (
                <span className="text-amber-400 font-bold ml-0.5">({gitStatus.modifiedCount})</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearchPanel(!showSearchPanel)}
            className={`p-1 rounded text-xs flex items-center gap-1 font-mono transition-colors ${
              showSearchPanel
                ? "bg-[var(--accent-bg-strong)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            title="Global Workspace Search (Ctrl+Shift+F)"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
              autoMode
                ? "bg-purple-500/10 border-purple-500/30 text-purple-400 font-semibold"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
            title="Autonomous Coding Agent Mode"
          >
            <Cpu className="w-3 h-3 inline mr-1" />
            {autoMode ? "Auto Loop ON" : "Auto Loop OFF"}
          </button>
          <button onClick={fetchTree} title="Refresh File Tree" className="text-[var(--muted)] hover:text-[var(--accent)] text-xs">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Global Workspace Search Panel Overlay */}
      {showSearchPanel && (
        <div className="bg-black/60 border-b border-[var(--accent-border)] p-2 animate-fade-in font-mono text-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Search className="w-4 h-4 text-[var(--accent)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeGlobalSearch()}
              placeholder="Search across open files and workspace..."
              className="flex-1 bg-[var(--background)] border border-[var(--accent-border)] rounded px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={executeGlobalSearch}
              className="px-2.5 py-1 rounded bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-strong)] text-[var(--accent)] font-mono text-xs"
            >
              Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-1 mt-1 text-[11px]">
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => openFileInTab(r.path)}
                  className="flex items-center justify-between p-1 hover:bg-[var(--accent-bg)] rounded cursor-pointer text-[var(--muted)] hover:text-[var(--accent)]"
                >
                  <span className="truncate max-w-[300px]">
                    {r.path.split(/[/\\]/).pop()}:L{r.line}
                  </span>
                  <span className="text-[10px] text-[var(--foreground)] truncate ml-2 font-mono">
                    {r.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Workspace Split */}
      <div className="flex flex-1 min-h-0">
        {/* File Tree Explorer */}
        <div className="w-1/3 border-r border-[var(--accent-border)] overflow-y-auto p-2">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1 font-mono">Files</div>
          {renderNodes(tree)}
        </div>

        {/* Monaco Code Editor Area */}
        <div className="w-2/3 flex flex-col min-h-0 bg-[#1e1e1e]">
          {/* Tabs Bar */}
          <div className="flex items-center bg-black/40 border-b border-[var(--accent-border)] overflow-x-auto min-h-[32px]">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => {
                  setActiveTabPath(tab.path);
                  setSelectedLanguage(getMonacoLanguage(tab.name));
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono border-r border-[var(--accent-border)] cursor-pointer select-none transition-colors ${
                  activeTabPath === tab.path
                    ? "bg-[#1e1e1e] text-[var(--accent)] border-b-2 border-b-[var(--accent)] font-medium"
                    : "text-[var(--muted)] hover:bg-[#252526] hover:text-[var(--foreground)]"
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

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 relative">
            {activeTab ? (
              <Editor
                height="100%"
                language={selectedLanguage}
                value={activeTab.content}
                onMount={handleEditorDidMount}
                onChange={(value) => updateActiveTabContent(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  fontFamily: "monospace",
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "on",
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--muted)] text-xs font-mono">
                Select a file from the explorer to edit in Monaco Engine.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Terminal Tabs Area */}
      <div className="h-1/3 min-h-[140px] border-t border-[var(--accent-border)] bg-black/50 flex flex-col font-mono text-[11px]">
        {/* Terminal Header Tabs */}
        <div className="flex items-center justify-between border-b border-[var(--accent-border)] bg-black/60 px-2 h-7 text-[10px]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTerminalTab("console")}
              className={`px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                terminalTab === "console"
                  ? "bg-[var(--accent-bg)] text-[var(--accent)] font-semibold"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              Agent Console
            </button>
            <button
              onClick={() => setTerminalTab("shell")}
              className={`px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                terminalTab === "shell"
                  ? "bg-[var(--accent-bg)] text-[var(--accent)] font-semibold"
                  : "text-[var(--muted)] hover:text-white"
              }`}
            >
              Native Shell ($)
            </button>
          </div>
          <span className="text-[9px] text-emerald-400 font-mono">
            {typeof window !== "undefined" && window.electronAPI ? "Desktop Native Terminal Engine" : "Web Bridge"}
          </span>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {terminalTab === "console" && (
            <div>
              {logs.map((l) => (
                <div key={l.id} className={`mb-1 ${logColor[l.kind] || "text-[var(--foreground)]"}`}>
                  {l.kind === "tool" && (
                    <div>
                      <span className="text-[var(--accent)]">▸ {l.text}</span>
                      {l.meta?.args && (
                        <span className="text-[var(--muted)]"> ({JSON.stringify(l.meta.args)})</span>
                      )}
                    </div>
                  )}
                  {l.kind !== "tool" && <span className="whitespace-pre-wrap">{l.text}</span>}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}

          {terminalTab === "shell" && (
            <div>
              {shellLogs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap text-emerald-400/90 mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shell Quick Input if Native Shell active */}
        {terminalTab === "shell" && (
          <div className="flex items-center gap-2 p-1 border-t border-[var(--accent-border)] bg-black/40">
            <span className="text-emerald-400 font-bold">$</span>
            <input
              value={shellInput}
              onChange={(e) => setShellInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  runNativeShellCommand(shellInput);
                  setShellInput("");
                }
              }}
              placeholder="Run shell command (e.g. npm test, git status)..."
              className="flex-1 bg-transparent text-emerald-300 text-xs font-mono outline-none"
            />
          </div>
        )}
      </div>

      {/* User Command Input Bar */}
      <div className="flex items-center gap-2 p-2 border-t border-[var(--accent-border)] bg-[var(--card-bg)]">
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
          placeholder="Tell JARVIS what to build/fix, or run '$ npm test'..."
          className="flex-1 bg-[var(--background)] border border-[var(--accent-border-strong)] rounded px-2 py-1.5 text-[12px] text-[var(--accent)] outline-none focus:border-[var(--accent)] font-mono"
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

      {/* Dynamic VS Code Style IDE Bottom Status Bar */}
      <div className="h-6 px-3 bg-[#0e0e0e] border-t border-[var(--accent-border)] flex items-center justify-between font-mono text-[10px] text-[var(--muted)] select-none z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
            <Code2 className="w-3 h-3" />
            {running ? "⚡ Agent Thinking..." : "🟢 JARVIS Ready"}
          </span>
          {gitStatus.isRepo && (
            <span className="flex items-center gap-1 hover:text-emerald-400 cursor-pointer">
              <GitBranch className="w-3 h-3 text-emerald-400" />
              {gitStatus.branch}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bell className="w-3 h-3" /> {logs.length} logs
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span className="text-[var(--accent)] uppercase font-semibold">
            {selectedLanguage}
          </span>
        </div>
      </div>
    </div>
  );
}