"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Copy,
  Settings,
  Cpu,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Code,
  FileCode,
  MessageSquare,
  Split,
  Save,
  Check,
  Sparkles,
  Maximize2,
  Minimize2,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Terminal,
  Search,
  Play,
  CheckCircle2,
  AlertCircle,
  Command,
  GitBranch,
  Layers,
  Sliders,
} from "lucide-react";
import { useSettingsStore } from "@/lib/settings-store";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ModelSettings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path?: string;
  children?: FileNode[];
  content?: string;
}

interface OpenTab {
  id: string;
  name: string;
  path?: string;
  content: string;
  isModified?: boolean;
}

interface LogEntry {
  id: number;
  time: string;
  type: "info" | "success" | "warn" | "error" | "action";
  text: string;
}

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "deepseek-r1-distill-llama-70b",
  "qwen-qwq-32b",
];

const LANGUAGES = [
  { code: "en-US", label: "English", prompt: "You are JARVIS IDE, an advanced AI Operating System and Coding Agent. Address the user as 'Sir' or 'Ma'am'. Be polite, extremely smart, efficient, and loyal." },
  { code: "hi-IN", label: "Hindi", prompt: "Tum JARVIS IDE ho, ek advanced AI Coding Agent. User ko 'Sir' ya 'Ma'am' bolo. Polite, smart aur efficient tarike se jawaab do." },
  { code: "ur-PK", label: "Urdu", prompt: "Tum JARVIS IDE ho, ek advanced AI Coding Agent. User ko 'Sir' ya 'Ma'am' bolo. Polite, smart aur efficient tarike se jawaab do." },
  { code: "ar-SA", label: "Arabic", prompt: "أنت JARVIS IDE، نظام تشغيل ووكيل برمجة ذكاء اصطناعي متقدم. خاطب المستخدم بـ 'سيدي' أو 'سيدتي'." },
  { code: "fr-FR", label: "French", prompt: "Tu es JARVIS IDE, un système d'exploitation IA et agent de développement avancé." },
  { code: "es-ES", label: "Spanish", prompt: "Eres JARVIS IDE, un sistema operativo de IA y agente de código avanzado." },
  { code: "de-DE", label: "German", prompt: "Du bist JARVIS IDE, ein fortschrittliches KI-Betriebssystem und Programmieragent." },
  { code: "ja-JP", label: "Japanese", prompt: "あなたはJARVIS IDE、高度なAIオペレーティングシステムおよびコーディングエージェントです。" },
  { code: "zh-CN", label: "Chinese", prompt: "你是JARVIS IDE，一个先进的AI操作系统和编程代理。" },
];

const AGENT_WORKSPACE_PROMPT = `

[SYSTEM DIRECTIVE: AUTONOMOUS WORKSPACE AGENT]
You are JARVIS IDE, an autonomous AI Software Engineer with FULL ACCESS to view, edit, create, and delete files/folders in the workspace.
When requested to perform file or workspace actions, respond with explanations AND execute structured JSON tool blocks so your changes apply directly on disk.

Supported JSON Tool Actions:
1. CREATE FILE:
\`\`\`json:tool_call
{ "action": "create_file", "path": "path/to/file.tsx", "content": "code content" }
\`\`\`

2. EDIT FILE:
\`\`\`json:tool_call
{ "action": "edit_file", "path": "path/to/file.tsx", "content": "updated complete code content" }
\`\`\`

3. DELETE FILE OR FOLDER:
\`\`\`json:tool_call
{ "action": "delete_file", "path": "path/to/file.tsx" }
\`\`\`

4. CREATE FOLDER:
\`\`\`json:tool_call
{ "action": "create_folder", "path": "path/to/folder" }
\`\`\`

5. READ FILE:
\`\`\`json:tool_call
{ "action": "read_file", "path": "path/to/file.tsx" }
\`\`\`

Always write clean, working code and specify clearly which workspace items were modified.`;

const WELCOME_MESSAGES: Record<string, string> = {
  "en-US": "Online and ready, sir. I have full autonomous workspace access to view, edit, create, and delete code files. How may I assist you?",
  "hi-IN": "Main online hoon aur taiyar hoon, sir. Mere paas workspace ka full access hai code view, edit, create aur delete karne ke liye. Aaj kya build karein?",
  "ur-PK": "Main online hoon aur tayyar hoon, sir. Mere paas workspace ka full access hai code view, edit, create aur delete karne ke liye. Aaj kya build karein?",
  "ar-SA": "متصل وجاهز يا سيدي. لدي وصول كامل لمساحة العمل لعرض وإنشاء وتعديل وحذف الملفات.",
  "fr-FR": "En ligne et prêt, monsieur. J'ai un accès complet à l'espace de travail pour voir, créer, modifier et supprimer des fichiers.",
  "es-ES": "En línea y listo, señor. Tengo acceso completo al espacio de trabajo para ver, crear, editar y eliminar archivos.",
  "de-DE": "Online und bereit. Ich habe vollen Zugriff auf den Arbeitsbereich zum Anzeigen, Erstellen, Bearbeiten und Löschen von Dateien.",
  "ja-JP": "オンラインで準備完了です、様。ワークスペースの閲覧、作成、編集、削除のフルアクセスがあります。",
  "zh-CN": "已上线并准备就绪，先生。我拥有对工作区查看、创建、编辑和删除文件的完整权限。",
};

function FileTree({
  nodes,
  depth = 0,
  onSelectFile,
  onDeleteNode,
  onCreateInFolder,
  filterQuery = "",
}: {
  nodes: FileNode[];
  depth?: number;
  onSelectFile: (node: FileNode) => void;
  onDeleteNode: (node: FileNode) => void;
  onCreateInFolder: (folderNode: FileNode) => void;
  filterQuery?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getFileIconColor = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (["ts", "tsx", "js", "jsx"].includes(ext)) return "text-cyan-400";
    if (["css", "scss", "json"].includes(ext)) return "text-amber-400";
    if (["html", "md"].includes(ext)) return "text-orange-400";
    if (["py", "cpp", "c", "java"].includes(ext)) return "text-emerald-400";
    return "text-slate-400";
  };

  const filteredNodes = nodes.filter((node) => {
    if (!filterQuery) return true;
    return node.name.toLowerCase().includes(filterQuery.toLowerCase());
  });

  return (
    <div>
      {filteredNodes.map((node, idx) => (
        <div key={node.path || node.name + idx}>
          <div
            className="flex items-center justify-between py-1 px-2 hover:bg-cyan-500/10 hover:border-l-2 hover:border-cyan-400 rounded-r cursor-pointer text-xs font-mono group transition-all"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.type === "folder") {
                toggle(node.name);
              } else {
                onSelectFile(node);
              }
            }}
          >
            <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
              {node.type === "folder" ? (
                expanded[node.name] ? (
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )
              ) : (
                <FileCode className={`w-3.5 h-3.5 shrink-0 ${getFileIconColor(node.name)}`} />
              )}
              <span
                className={`truncate ${
                  node.type === "folder"
                    ? "text-cyan-300 font-medium"
                    : "text-slate-300 group-hover:text-cyan-300"
                }`}
              >
                {node.name}
              </span>
            </div>

            {/* Quick Node Actions */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
              {node.type === "folder" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateInFolder(node);
                  }}
                  className="p-0.5 text-slate-400 hover:text-emerald-400 rounded hover:bg-black/60"
                  title="New File in Folder"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node);
                }}
                className="p-0.5 text-slate-400 hover:text-red-400 rounded hover:bg-black/60"
                title={`Delete ${node.type}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          {node.type === "folder" && expanded[node.name] && node.children && (
            <FileTree
              nodes={node.children}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              onDeleteNode={onDeleteNode}
              onCreateInFolder={onCreateInFolder}
              filterQuery={filterQuery}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CenterCodeViewer({
  openTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSaveFile,
  onAskJarvis,
  viewMode,
  setViewMode,
}: {
  openTabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onContentChange: (id: string, newContent: string) => void;
  onSaveFile: (tab: OpenTab) => void;
  onAskJarvis: (tab: OpenTab) => void;
  viewMode: "chat" | "split" | "code";
  setViewMode: (mode: "chat" | "split" | "code") => void;
}) {
  const [copyStatus, setCopyStatus] = useState<string>("");
  const activeTab = openTabs.find((t) => t.id === activeTabId);

  if (!activeTab) return null;

  const lines = activeTab.content.split("\n");
  const lineCount = lines.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab.content);
    setCopyStatus("Copied!");
    setTimeout(() => setCopyStatus(""), 2000);
  };

  const getLanguageLabel = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "tsx": return "TypeScript React";
      case "ts": return "TypeScript";
      case "jsx": return "JavaScript React";
      case "js": return "JavaScript";
      case "json": return "JSON";
      case "css": return "CSS";
      case "html": return "HTML";
      case "py": return "Python";
      case "md": return "Markdown";
      default: return ext.toUpperCase() || "Plain Text";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070b14] border border-cyan-500/20 rounded-lg overflow-hidden m-2 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
      {/* Top Tabs Bar */}
      <div className="h-10 bg-[#04070e] border-b border-cyan-500/20 flex items-center px-2 justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 mr-2">
          {openTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-mono cursor-pointer border-t border-x transition-all shrink-0 ${
                  isActive
                    ? "bg-[#0b1222] border-cyan-400 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(0,255,204,0.15)]"
                    : "bg-black/40 border-transparent text-slate-400 hover:text-slate-200 hover:bg-black/60"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[140px]">{tab.name}</span>
                {tab.isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-60 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-cyan-500/20 shrink-0">
          <button
            onClick={() => setViewMode("chat")}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
              viewMode === "chat" ? "bg-cyan-400 text-black font-bold" : "text-slate-400 hover:text-cyan-400"
            }`}
            title="Full Chat View"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
              viewMode === "split" ? "bg-cyan-400 text-black font-bold" : "text-slate-400 hover:text-cyan-400"
            }`}
            title="Split View (Chat & Code Side-by-Side)"
          >
            <Split className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>
          <button
            onClick={() => setViewMode("code")}
            className={`p-1.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
              viewMode === "code" ? "bg-cyan-400 text-black font-bold" : "text-slate-400 hover:text-cyan-400"
            }`}
            title="Full Code View"
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Code</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-9 px-3 bg-[#0a101d] border-b border-cyan-500/20 flex items-center justify-between shrink-0 text-xs font-mono">
        <div className="flex items-center gap-3 text-slate-400 truncate">
          <span className="text-cyan-300 font-semibold flex items-center gap-1.5 truncate">
            <FileCode className="w-4 h-4 text-cyan-400" />
            {activeTab.path || activeTab.name}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-cyan-500/20 text-cyan-400 font-mono hidden sm:inline">
            {getLanguageLabel(activeTab.name)}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">{lineCount} Lines</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onAskJarvis(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono transition-all shadow-sm"
            title="Ask JARVIS to review or explain this code"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Ask AI</span>
          </button>

          <button
            onClick={() => onSaveFile(activeTab)}
            className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono transition-all"
            title="Save file"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1 rounded bg-black/50 hover:bg-black/70 border border-cyan-500/20 text-slate-300 hover:text-cyan-300 text-[11px] font-mono transition-all"
            title="Copy code"
          >
            {copyStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copyStatus || "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Code Textarea & Line Numbers */}
      <div className="flex-1 flex min-h-0 bg-[#050810] overflow-hidden relative font-mono text-xs leading-relaxed">
        <div className="w-12 bg-black/60 border-r border-cyan-500/20 text-slate-500 text-right pr-2.5 py-3 select-none overflow-hidden font-mono text-[11px] leading-relaxed shrink-0">
          {lines.map((_, i) => (
            <div key={i} className="text-slate-600 font-mono hover:text-slate-400 transition-colors">
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          value={activeTab.content}
          onChange={(e) => onContentChange(activeTab.id, e.target.value)}
          spellCheck={false}
          className="flex-1 bg-transparent p-3 text-cyan-300 outline-none resize-none font-mono whitespace-pre overflow-auto leading-relaxed border-none focus:ring-0 selection:bg-cyan-500/20 selection:text-white"
        />
      </div>
    </div>
  );
}

export default function JarvisChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MESSAGES["en-US"] },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [voiceName, setVoiceName] = useState("");
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showFileTree, setShowFileTree] = useState(true);
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([]);
  const [currentRootPath, setCurrentRootPath] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, time: new Date().toLocaleTimeString(), type: "info", text: "JARVIS IDE Agent Core initialized." },
    { id: 2, time: new Date().toLocaleTimeString(), type: "success", text: "Groq LLM Core (Llama-3.3 70B) online." },
  ]);

  // Center Code View states
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"chat" | "split" | "code">("chat");

  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    systemPrompt: LANGUAGES[0].prompt + AGENT_WORKSPACE_PROMPT,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isLoadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  isLoadingRef.current = isLoading;

  const appendLog = useCallback((type: LogEntry["type"], text: string) => {
    setLogs((prev) => [
      ...prev,
      { id: prev.length + 1, time: new Date().toLocaleTimeString(), type, text },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      setAvailableVoices(v);
      if (!voiceName && v.length > 0) {
        const defaultVoice = v.find((v) => v.lang.startsWith(language.split("-")[0]) && (v.name.includes("Google") || v.name.includes("Natural")));
        if (defaultVoice) setVoiceName(defaultVoice.name);
      }
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, [language, voiceName]);

  const speakText = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`~-]/g, "").replace(/```[\s\S]*?```/g, "[Code block skipped]").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = language.split("-")[0];
    const selected = voices.find((v) => v.name === voiceName) ||
      voices.find((v) => v.lang.startsWith(langPrefix) && (v.name.includes("Google") || v.name.includes("Natural"))) ||
      voices.find((v) => v.lang.startsWith(langPrefix)) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (selected) utterance.voice = selected;
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.onstart = () => { isSpeakingRef.current = true; };
    utterance.onend = () => {
      isSpeakingRef.current = false;
    };
    window.speechSynthesis.speak(utterance);
  }, [isMuted, language, voiceName, voiceRate, voicePitch]);

  const refreshWorkspaceTree = useCallback(async () => {
    if (currentRootPath && typeof window !== "undefined" && window.electronAPI?.readFolderTree) {
      const treeRes = await window.electronAPI.readFolderTree(currentRootPath);
      if (treeRes && treeRes.success) {
        const convertTree = (items: any[]): FileNode[] => {
          return items.map((item) => ({
            name: item.name,
            type: item.type === "folder" ? "folder" : "file",
            path: item.path,
            children: item.children ? convertTree(item.children) : undefined,
          }));
        };
        setProjectFiles(convertTree(treeRes.tree || []));
        appendLog("info", `Workspace refreshed: ${currentRootPath}`);
      }
    }
  }, [currentRootPath, appendLog]);

  const buildWorkspaceCodebasePrompt = useCallback(async (nodes: FileNode[]): Promise<string> => {
    let contextText = `\n\n[OPEN WORKSPACE CODEBASE SNAPSHOT]\nRoot Path: ${currentRootPath || "Local Workspace"}\n`;
    let fileCount = 0;
    let totalLength = 0;
    const MAX_TOTAL_CHARS = 12000;

    const TEXT_EXTENSIONS = new Set([
      "ts", "tsx", "js", "jsx", "json", "css", "scss", "html", "md", "py", 
      "c", "cpp", "h", "java", "rs", "go", "sh", "yaml", "yml", "env", "txt", "toml", "xml", "svg"
    ]);

    const IGNORED_FOLDERS = new Set(["node_modules", ".git", ".next", "dist", "out", "build", ".venv", "__pycache__"]);

    const collectFiles = async (items: FileNode[]) => {
      for (const item of items) {
        if (totalLength >= MAX_TOTAL_CHARS) break;

        if (item.type === "folder") {
          if (IGNORED_FOLDERS.has(item.name.toLowerCase())) continue;
          if (item.children) await collectFiles(item.children);
        } else if (item.type === "file") {
          const ext = item.name.split(".").pop()?.toLowerCase() || "";
          if (!TEXT_EXTENSIONS.has(ext)) continue;

          let fileContent = item.content || "";
          if (!fileContent && item.path && typeof window !== "undefined" && window.electronAPI?.readFile) {
            try {
              const res = await window.electronAPI.readFile(item.path);
              if (res && res.success) fileContent = res.content || "";
            } catch {}
          }

          if (fileContent && !/[\x00-\x08\x0E-\x1F]/.test(fileContent)) {
            fileCount++;
            const sliceLen = Math.min(2000, MAX_TOTAL_CHARS - totalLength);
            const truncated = fileContent.slice(0, sliceLen).replace(/[\uFFFD]/g, "");
            contextText += `\n--- FILE: ${item.path || item.name} ---\n${truncated}\n`;
            totalLength += truncated.length;
          }
        }
      }
    };

    await collectFiles(nodes);
    return fileCount > 0 ? contextText : "";
  }, [currentRootPath]);

  const executeAgentToolCall = useCallback(async (toolCall: { action: string; path: string; content?: string }) => {
    const { action, path: targetPath, content = "" } = toolCall;
    let fullPath = targetPath;

    if (currentRootPath && !targetPath.includes(":") && !targetPath.startsWith("/")) {
      fullPath = `${currentRootPath}/${targetPath}`.replace(/\\/g, "/");
    }

    try {
      if (action === "create_file" || action === "edit_file") {
        if (typeof window !== "undefined" && window.electronAPI?.createFile) {
          await window.electronAPI.createFile(fullPath, content);
        }
        const filename = targetPath.split(/[/\\]/).pop() || targetPath;
        const tabId = fullPath;
        setOpenTabs((prev) => {
          const exists = prev.find((t) => t.id === tabId || t.name === filename);
          if (exists) {
            return prev.map((t) => (t.id === exists.id ? { ...t, content, isModified: false } : t));
          }
          return [...prev, { id: tabId, name: filename, path: fullPath, content }];
        });
        setActiveTabId(tabId);
        setViewMode("split");
        appendLog("action", `✓ ${action.toUpperCase()}: ${targetPath}`);
        await refreshWorkspaceTree();
      } else if (action === "read_file") {
        let fileContent = content;
        if (!fileContent && typeof window !== "undefined" && window.electronAPI?.readFile) {
          const res = await window.electronAPI.readFile(fullPath);
          if (res && res.success) fileContent = res.content || "";
        }
        const filename = targetPath.split(/[/\\]/).pop() || targetPath;
        const tabId = fullPath;
        setOpenTabs((prev) => {
          const exists = prev.find((t) => t.id === tabId || t.name === filename);
          if (exists) return prev.map((t) => (t.id === exists.id ? { ...t, content: fileContent } : t));
          return [...prev, { id: tabId, name: filename, path: fullPath, content: fileContent }];
        });
        setActiveTabId(tabId);
        setViewMode("split");
        appendLog("action", `✓ READ FILE: ${targetPath}`);
      } else if (action === "delete_file") {
        if (typeof window !== "undefined" && window.electronAPI?.deleteFile) {
          await window.electronAPI.deleteFile(fullPath);
        }
        setOpenTabs((prev) => prev.filter((t) => t.id !== fullPath && t.path !== fullPath));
        appendLog("warn", `✓ DELETED: ${targetPath}`);
        await refreshWorkspaceTree();
      } else if (action === "create_folder") {
        if (typeof window !== "undefined" && window.electronAPI?.createFolder) {
          await window.electronAPI.createFolder(fullPath);
        }
        appendLog("action", `✓ CREATED FOLDER: ${targetPath}`);
        await refreshWorkspaceTree();
      }
    } catch (err: any) {
      appendLog("error", `Tool Error [${action}]: ${err.message || err}`);
    }
  }, [currentRootPath, refreshWorkspaceTree, appendLog]);

  const handleSend = useCallback(async (customText?: string) => {
    const textToSubmit = customText || input;
    if (!textToSubmit.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSubmit };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    appendLog("info", `Transmitting prompt to Groq Core (${modelSettings.model})...`);

    const placeholderIdx = updatedMessages.length;
    const codebaseContext = await buildWorkspaceCodebasePrompt(projectFiles);
    const systemPromptWithCodebase = modelSettings.systemPrompt + codebaseContext;

    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: modelSettings.model,
          temperature: modelSettings.temperature,
          top_p: modelSettings.topP,
          max_tokens: modelSettings.maxTokens,
          stream: true,
          messages: [
            { role: "system", content: systemPromptWithCodebase },
            ...updatedMessages.map((msg) => ({
              role: msg.role === "assistant" ? "assistant" : msg.role,
              content: msg.content,
            })),
          ],
        }),
      });

      if (!groqRes.ok) {
        const err = await groqRes.text();
        console.error("Groq API error:", err);
        throw new Error("API error");
      }

      const reader = groqRes.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) accumulated += content;
            } catch {}
          }
          const current = accumulated;
          setMessages((prev) => {
            const copy = [...prev];
            copy[placeholderIdx] = { role: "assistant", content: current };
            return copy;
          });
        }

        // Intercept and execute AI Agent tool calls
        const toolCallRegex = /```json:tool_call\s*([\s\S]*?)\s*```/g;
        let match;
        while ((match = toolCallRegex.exec(accumulated)) !== null) {
          try {
            const toolCall = JSON.parse(match[1]);
            if (toolCall && toolCall.action && toolCall.path) {
              await executeAgentToolCall(toolCall);
            }
          } catch (e) {
            console.error("Error parsing AI tool call:", e);
          }
        }

        appendLog("success", "AI Agent turn completed.");
        speakText(accumulated);
      }
    } catch (error) {
      console.error("Chat error:", error);
      appendLog("error", "Could not establish connection to Groq AI Core.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "System Error: Sir, I could not establish a connection to the core." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, modelSettings, speakText, executeAgentToolCall, appendLog]);

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language;

      rec.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      rec.onend = () => {
        if (isListeningRef.current && !isLoadingRef.current) {
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                rec.start();
              } catch {}
            }
          }, 300);
        } else {
          setIsListening(false);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === "no-speech" || e.error === "network") {
          if (isListeningRef.current && !isLoadingRef.current) {
            setTimeout(() => {
              if (isListeningRef.current) {
                try {
                  rec.start();
                } catch {}
              }
            }, 500);
          }
        } else if (e.error !== "aborted") {
          console.warn("Speech error:", e.error);
        }
      };

      rec.onresult = (event: any) => {
        let fullText = "";
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            fullText += item[0].transcript;
            if (item.isFinal) {
              isFinal = true;
            }
          }
        }

        const trimmed = fullText.trim();
        if (trimmed) {
          setInput(trimmed);
          if (isFinal) {
            appendLog("action", `🎙️ Voice Command Detected: "${trimmed}"`);
            handleSendRef.current(trimmed);
          }
        }
      };

      recognitionRef.current = rec;
    }
  }, [language, appendLog]);

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    const langData = LANGUAGES.find((l) => l.code === newLang);
    if (langData) {
      setModelSettings((prev) => ({ ...prev, systemPrompt: langData.prompt + AGENT_WORKSPACE_PROMPT }));
    }
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
    }
  }, []);

  const toggleListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this environment. Please try Chrome or Edge.");
      appendLog("error", "Speech Recognition not supported in environment.");
      return;
    }

    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      appendLog("info", "Microphone turned OFF.");
      try {
        recognitionRef.current?.stop();
      } catch {}
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (micErr: any) {
      appendLog("error", `Microphone permission denied: ${micErr.message || micErr}`);
      alert("Microphone permission denied. Please allow microphone access in your system/browser settings.");
      return;
    }

    window.speechSynthesis?.cancel();
    isListeningRef.current = true;
    setIsListening(true);
    appendLog("info", "Microphone turned ON. Listening for speech...");

    if (!recognitionRef.current) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = language;
      recognitionRef.current = rec;
    }

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      console.warn("Mic start error:", err);
      appendLog("warn", `Mic start notice: ${err.message || err}`);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const newChat = () => {
    setMessages([{ role: "assistant", content: WELCOME_MESSAGES[language] || WELCOME_MESSAGES["en-US"] }]);
    setInput("");
  };

  const handleSelectFile = async (node: FileNode) => {
    let content = node.content || "";

    if (!content && node.path) {
      if (typeof window !== "undefined" && window.electronAPI?.readFile) {
        try {
          const res = await window.electronAPI.readFile(node.path);
          if (res && res.success && res.content !== undefined) {
            content = res.content;
          }
        } catch (err) {
          console.error("Error reading file:", err);
        }
      } else {
        try {
          const st = useSettingsStore.getState();
          const base = st.aiModel?.backendUrl?.replace(/\/$/, "") || "http://localhost:8000";
          const res = await fetch(`${base}/api/v1/workspace/file?path=${encodeURIComponent(node.path)}`);
          const json = await res.json();
          if (json.content) content = json.content;
        } catch (e) {
          content = `// Content for ${node.name}`;
        }
      }
    }

    const tabId = node.path || node.name;

    setOpenTabs((prev) => {
      const exists = prev.find((t) => t.id === tabId);
      if (exists) {
        return prev.map((t) => (t.id === tabId ? { ...t, content } : t));
      }
      return [...prev, { id: tabId, name: node.name, path: node.path, content }];
    });

    setActiveTabId(tabId);
    if (viewMode === "chat") {
      setViewMode("split");
    }
  };

  const handleCloseTab = (id: string) => {
    setOpenTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        setActiveTabId(null);
        setViewMode("chat");
      } else if (activeTabId === id) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  const handleContentChange = (id: string, newContent: string) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content: newContent, isModified: true } : t))
    );
  };

  const handleSaveFile = async (tab: OpenTab) => {
    if (tab.path && typeof window !== "undefined" && window.electronAPI?.writeFile) {
      try {
        const res = await window.electronAPI.writeFile(tab.path, tab.content);
        if (res && res.success) {
          setOpenTabs((prev) =>
            prev.map((t) => (t.id === tab.id ? { ...t, isModified: false } : t))
          );
          appendLog("success", `Saved file: ${tab.name}`);
          return;
        }
      } catch (err) {
        console.error("Save failed:", err);
      }
    }
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === tab.id ? { ...t, isModified: false } : t))
    );
    appendLog("success", `Saved in session: ${tab.name}`);
  };

  const handleAskJarvisAboutFile = (tab: OpenTab) => {
    const prompt = `Sir, please review, explain or optimize the code in "${tab.name}":\n\n\`\`\`\n${tab.content.slice(0, 3000)}\n\`\`\``;
    setInput(prompt);
    if (viewMode === "code") setViewMode("split");
  };

  const handleUserCreateFile = async (parentFolder?: string) => {
    const filePath = prompt("Enter new file path (e.g. src/components/Card.tsx):", parentFolder ? `${parentFolder}/` : "");
    if (!filePath || !filePath.trim()) return;

    let fullPath = filePath.trim();
    if (currentRootPath && !fullPath.includes(":") && !fullPath.startsWith("/")) {
      fullPath = `${currentRootPath}/${fullPath}`.replace(/\\/g, "/");
    }

    if (typeof window !== "undefined" && window.electronAPI?.createFile) {
      await window.electronAPI.createFile(fullPath, "");
    }

    const filename = fullPath.split(/[/\\]/).pop() || fullPath;
    setOpenTabs((prev) => [...prev, { id: fullPath, name: filename, path: fullPath, content: "" }]);
    setActiveTabId(fullPath);
    setViewMode("split");
    appendLog("action", `Created new file: ${filename}`);
    await refreshWorkspaceTree();
  };

  const handleUserCreateFolder = async () => {
    const folderPath = prompt("Enter new folder path (e.g. src/services):");
    if (!folderPath || !folderPath.trim()) return;

    let fullPath = folderPath.trim();
    if (currentRootPath && !fullPath.includes(":") && !fullPath.startsWith("/")) {
      fullPath = `${currentRootPath}/${fullPath}`.replace(/\\/g, "/");
    }

    if (typeof window !== "undefined" && window.electronAPI?.createFolder) {
      await window.electronAPI.createFolder(fullPath);
    }

    appendLog("action", `Created new folder: ${folderPath}`);
    await refreshWorkspaceTree();
  };

  const handleUserDeleteNode = async (node: FileNode) => {
    const targetPath = node.path || node.name;
    if (!confirm(`Are you sure you want to delete ${node.type} "${node.name}"?`)) return;

    if (typeof window !== "undefined" && window.electronAPI?.deleteFile) {
      await window.electronAPI.deleteFile(targetPath);
    }

    handleCloseTab(targetPath);
    appendLog("warn", `Deleted ${node.type}: ${node.name}`);
    await refreshWorkspaceTree();
  };

  const handleOpenFolder = async () => {
    if (typeof window !== "undefined" && window.electronAPI?.openFolder) {
      const res = await window.electronAPI.openFolder();
      if (res && !res.canceled && res.filePaths && res.filePaths.length > 0) {
        const dirPath = res.filePaths[0];
        setCurrentRootPath(dirPath);
        const treeRes = await window.electronAPI.readFolderTree(dirPath);
        if (treeRes && treeRes.success) {
          const convertTree = (items: any[]): FileNode[] => {
            return items.map((item) => ({
              name: item.name,
              type: item.type === "folder" ? "folder" : "file",
              path: item.path,
              children: item.children ? convertTree(item.children) : undefined,
            }));
          };
          setProjectFiles(convertTree(treeRes.tree || []));
          setShowFileTree(true);
          appendLog("info", `Opened folder workspace: ${dirPath}`);
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const rootNodes: FileNode[] = [];
    const findOrCreateDir = (nodes: FileNode[], name: string): FileNode => {
      let dir = nodes.find((n) => n.name === name && n.type === "folder");
      if (!dir) {
        dir = { name, type: "folder", children: [] };
        nodes.push(dir);
      }
      return dir;
    };

    for (const file of Array.from(files)) {
      const text = await file.text();
      const relativePath = (file as any).webkitRelativePath || file.name;
      const parts = relativePath.split("/");

      if (parts.length > 1) {
        let currentLevel = rootNodes;
        for (let i = 0; i < parts.length - 1; i++) {
          const dir = findOrCreateDir(currentLevel, parts[i]);
          currentLevel = dir.children!;
        }
        currentLevel.push({
          name: parts[parts.length - 1],
          type: "file",
          path: relativePath,
          content: text,
        });
      } else {
        rootNodes.push({
          name: file.name,
          type: "file",
          path: file.name,
          content: text,
        });
      }
    }

    setProjectFiles(rootNodes);
    setShowFileTree(true);
    appendLog("info", `Uploaded project folder (${files.length} files).`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="flex flex-col h-screen bg-[#04070e] text-slate-200 select-none overflow-hidden"
      style={{
        fontFamily: "var(--jarvis-font, ui-monospace, SFMono-Regular, Menlo, monospace)",
      }}
    >
      {/* Top Professional IDE Header Bar */}
      <header className="h-10 bg-[#070c18] border-b border-cyan-500/20 flex items-center justify-between px-3 shrink-0 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 512 512" className="w-5 h-5 animate-pulse">
              <circle cx="256" cy="256" r="200" fill="none" stroke="#00ffcc" strokeWidth="20" opacity="0.6" />
              <polygon points="256,156 342.6,306 169.4,306" fill="#00ffcc" />
            </svg>
            <span className="font-bold tracking-widest text-cyan-300 text-sm">JARVIS IDE</span>
          </div>

          <span className="h-4 w-[1px] bg-cyan-500/20" />

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-cyan-500/20 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-semibold uppercase text-[10px]">Groq AI Online</span>
          </div>

          {currentRootPath && (
            <span className="text-slate-400 text-[11px] truncate max-w-xs hidden md:inline">
              📁 {currentRootPath}
            </span>
          )}
        </div>

        {/* View Mode Switcher Header Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/50 p-1 rounded border border-cyan-500/20">
            <button
              onClick={() => setViewMode("chat")}
              className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                viewMode === "chat" ? "bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(0,255,204,0.4)]" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat View</span>
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                viewMode === "split" ? "bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(0,255,204,0.4)]" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split IDE</span>
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                viewMode === "code" ? "bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(0,255,204,0.4)]" : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Full Code</span>
            </button>
          </div>

          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-cyan-500/20 bg-black/60 text-cyan-300 outline-none font-mono"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Dock Container */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Activity Dock Bar */}
        <aside className="w-12 border-r border-cyan-500/20 bg-[#060a14] flex flex-col items-center py-3 gap-3 shrink-0">
          <button
            onClick={() => setShowFileTree(!showFileTree)}
            className={`p-2 rounded-lg transition-all ${
              showFileTree ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400 hover:text-cyan-300 hover:bg-black/40"
            }`}
            title="Toggle File Explorer"
          >
            <File className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewMode(viewMode === "chat" ? "split" : "chat")}
            className={`p-2 rounded-lg transition-all ${
              viewMode === "chat" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400 hover:text-cyan-300 hover:bg-black/40"
            }`}
            title="AI Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`p-2 rounded-lg transition-all ${
              showTerminal ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400 hover:text-cyan-300 hover:bg-black/40"
            }`}
            title="Toggle Agent Console & Logs"
          >
            <Terminal className="w-4 h-4" />
          </button>

          <div className="w-6 border-t border-cyan-500/20 my-1" />

          <button
            onClick={newChat}
            className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-black/40 transition-all"
            title="New Chat Session"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg transition-all ${
              isMuted ? "text-red-400 bg-red-950/20 border border-red-500/30" : "text-slate-400 hover:text-cyan-300 hover:bg-black/40"
            }`}
            title={isMuted ? "Unmute Voice" : "Mute Voice"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-all ${
              isListening ? "text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 animate-pulse" : "text-slate-400 hover:text-cyan-300 hover:bg-black/40"
            }`}
            title={isListening ? "Stop Mic" : "Start Mic"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-all mt-auto ${
              showSettings ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400 hover:text-cyan-300 hover:bg-black/40"
            }`}
            title="Settings Config"
          >
            <Settings className="w-4 h-4" />
          </button>
        </aside>

        {/* Dynamic Center & Workspace Panels */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0 relative">
            {/* Left / Main AI Chat Panel */}
            {(viewMode === "chat" || viewMode === "split") && (
              <div className={`flex flex-col min-w-0 ${viewMode === "split" ? "w-1/2 border-r border-cyan-500/20" : "w-full"}`}>
                <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#050811]">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[88%] rounded-lg p-3.5 border ${
                          msg.role === "user"
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
                            : "bg-[#0b1222] border-cyan-500/20 text-slate-200"
                        } shadow-lg group relative`}
                      >
                        <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-cyan-400">
                            {msg.role === "user" ? "👤 YOU" : "🤖 JARVIS AGENT"}
                          </span>
                          {msg.role === "assistant" && (
                            <button
                              onClick={() => copyMessage(msg.content)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/40 rounded text-slate-400 hover:text-cyan-300"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap text-xs font-mono leading-relaxed">
                          {msg.content.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.content === "" && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg p-3.5 bg-[#0b1222] border border-cyan-500/20">
                        <div className="text-[11px] text-cyan-400 font-mono uppercase tracking-wider mb-1">JARVIS AGENT</div>
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>Executing autonomous workspace operations...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </main>

                {/* Prompt Input Footer */}
                <footer className="border-t border-cyan-500/20 p-3 shrink-0 bg-[#070c18]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2 max-w-4xl mx-auto"
                  >
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={isLoading ? "Processing..." : isListening ? "Listening..." : "Instruct JARVIS to code, view, edit, create or delete files..."}
                      disabled={isLoading}
                      autoFocus
                      className="flex-1 px-4 py-2.5 rounded-lg border border-cyan-500/30 bg-[#04070e] text-cyan-300 outline-none focus:border-cyan-400 font-mono text-xs placeholder-slate-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="px-5 py-2.5 rounded-lg bg-cyan-400 text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,204,0.3)]"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">TRANSMIT</span>
                    </button>
                  </form>
                </footer>
              </div>
            )}

            {/* Right / Center Code Editor Window */}
            {(viewMode === "code" || viewMode === "split") && openTabs.length > 0 && (
              <div className={`flex flex-col min-w-0 ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
                <CenterCodeViewer
                  openTabs={openTabs}
                  activeTabId={activeTabId}
                  onSelectTab={setActiveTabId}
                  onCloseTab={handleCloseTab}
                  onContentChange={handleContentChange}
                  onSaveFile={handleSaveFile}
                  onAskJarvis={handleAskJarvisAboutFile}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                />
              </div>
            )}

            {/* Empty Code State */}
            {viewMode === "code" && openTabs.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono bg-[#050810]">
                <Code className="w-16 h-16 text-cyan-500 opacity-20 mb-4 animate-pulse" />
                <h3 className="text-sm text-cyan-300 font-semibold mb-1">No Code File Open</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Select any file from Project Explorer or ask JARVIS AI Agent to generate/edit code.
                </p>
                <button
                  onClick={() => setViewMode("chat")}
                  className="px-4 py-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs uppercase tracking-wider hover:bg-cyan-500/20 transition-all"
                >
                  Return to Chat
                </button>
              </div>
            )}
          </div>

          {/* Bottom Terminal & Agent Console Drawer */}
          {showTerminal && (
            <div className="h-36 border-t border-cyan-500/20 bg-[#04070e] flex flex-col shrink-0 font-mono text-xs">
              <div className="h-7 px-3 bg-[#070c18] border-b border-cyan-500/20 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-bold text-cyan-300 uppercase tracking-wider">Agent Console & Logs</span>
                  <span className="text-[10px] text-emerald-400">({logs.length} events)</span>
                </div>
                <button onClick={() => setShowTerminal(false)} className="hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-600 font-mono select-none">[{log.time}]</span>
                    <span
                      className={
                        log.type === "success"
                          ? "text-emerald-400"
                          : log.type === "action"
                          ? "text-cyan-300 font-bold"
                          : log.type === "warn"
                          ? "text-amber-400"
                          : log.type === "error"
                          ? "text-red-400"
                          : "text-slate-400"
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Autonomous Workspace Explorer */}
        {showFileTree && (
          <aside className="w-64 border-l border-cyan-500/20 bg-[#060a14] flex flex-col shrink-0">
            <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
                Project Explorer
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleUserCreateFile()}
                  className="p-1 hover:bg-cyan-500/10 rounded transition-all text-slate-400 hover:text-emerald-400"
                  title="New File"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleUserCreateFolder}
                  className="p-1 hover:bg-cyan-500/10 rounded transition-all text-slate-400 hover:text-cyan-400"
                  title="New Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={refreshWorkspaceTree}
                  className="p-1 hover:bg-cyan-500/10 rounded transition-all text-slate-400 hover:text-cyan-300"
                  title="Refresh Workspace"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleOpenFolder}
                  className="p-1 hover:bg-cyan-500/10 rounded transition-all text-slate-400 hover:text-cyan-300"
                  title="Open Folder"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="p-2 border-b border-cyan-500/20 bg-[#04070e]">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0b1222] border border-cyan-500/20 text-xs">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter files..."
                  className="w-full bg-transparent text-cyan-300 outline-none font-mono text-[11px] placeholder-slate-500"
                />
                {filterQuery && (
                  <button onClick={() => setFilterQuery("")} className="text-slate-400 hover:text-cyan-300">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1">
              {projectFiles.length === 0 ? (
                <div className="p-6 text-center">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 text-cyan-500/40 opacity-40 stroke-1" />
                  <p className="text-xs text-slate-400 font-mono font-semibold">No folder open</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Open a folder or ask JARVIS AI Agent to create files.
                  </p>
                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={handleOpenFolder}
                      className="px-3 py-1.5 rounded text-[11px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all"
                    >
                      Open Workspace
                    </button>
                    <button
                      onClick={() => handleUserCreateFile()}
                      className="px-3 py-1.5 rounded text-[11px] font-mono bg-black/40 border border-cyan-500/20 text-emerald-400 hover:bg-emerald-600/20 transition-all flex items-center justify-center gap-1"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>Create New File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <FileTree
                  nodes={projectFiles}
                  onSelectFile={handleSelectFile}
                  onDeleteNode={handleUserDeleteNode}
                  onCreateInFolder={(folderNode) => handleUserCreateFile(folderNode.path || folderNode.name)}
                  filterQuery={filterQuery}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Professional IDE Status Bar */}
      <footer className="h-6 bg-[#020408] border-t border-cyan-500/20 px-3 flex items-center justify-between shrink-0 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
            <GitBranch className="w-3 h-3" /> main
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> TypeScript / Next.js
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">UTF-8</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-cyan-300">
            {isLoading ? "⚡ JARVIS Executing Tools..." : "🟢 Agent Ready"}
          </span>
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <Terminal className="w-3 h-3" /> Console
          </button>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-10 left-12 z-50 bg-[#080d1a] border border-cyan-500/30 rounded-r-lg p-4 min-w-[290px] shadow-[0_0_40px_rgba(0,0,0,0.8)] font-mono text-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" /> Model & System Config
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-cyan-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Model</label>
              <select
                value={modelSettings.model}
                onChange={(e) => setModelSettings({ ...modelSettings, model: e.target.value })}
                className="w-full px-2 py-1 text-xs rounded border border-cyan-500/20 bg-[#04070e] text-cyan-300 outline-none"
              >
                {GROQ_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Temperature: {modelSettings.temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={modelSettings.temperature}
                onChange={(e) => setModelSettings({ ...modelSettings, temperature: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Max Tokens: {modelSettings.maxTokens}
              </label>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={modelSettings.maxTokens}
                onChange={(e) => setModelSettings({ ...modelSettings, maxTokens: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Voice Speed: {voiceRate.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceRate}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}