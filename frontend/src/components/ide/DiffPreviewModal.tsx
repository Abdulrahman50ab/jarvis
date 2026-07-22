"use client";

import React from "react";
import { DiffEditor } from "@monaco-editor/react";
import { X, Check, ShieldAlert } from "lucide-react";

interface DiffPreviewModalProps {
  isOpen: boolean;
  filename: string;
  originalCode: string;
  modifiedCode: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function DiffPreviewModal({
  isOpen,
  filename,
  originalCode,
  modifiedCode,
  onAccept,
  onReject,
}: DiffPreviewModalProps) {
  if (!isOpen) return null;

  const getLanguage = (fname: string) => {
    const ext = fname.split(".").pop()?.toLowerCase();
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
      default:
        return "plaintext";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-[95%] max-w-[1100px] h-[85vh] border border-[var(--accent-border)] bg-[var(--card-bg)] rounded-xl flex flex-col shadow-[0_0_50px_rgba(0,255,204,0.15)] overflow-hidden">
        {/* Modal Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--accent-border)] bg-[var(--background)]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[var(--accent)]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              AI Code Edit Review · {filename}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[var(--muted)]">
              Red: Original · Green: Proposed Changes
            </span>
            <button
              onClick={onReject}
              className="text-[var(--muted)] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monaco Diff Editor Area */}
        <div className="flex-1 min-h-0 bg-[#1e1e1e]">
          <DiffEditor
            height="100%"
            language={getLanguage(filename)}
            original={originalCode}
            modified={modifiedCode}
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: "monospace",
              automaticLayout: true,
            }}
          />
        </div>

        {/* Modal Footer Controls */}
        <div className="h-14 px-4 flex items-center justify-between border-t border-[var(--accent-border)] bg-[var(--background)]">
          <div className="text-xs font-mono text-[var(--muted)]">
            Review proposed AI code edits before saving to disk.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono text-xs transition-all"
            >
              <X className="w-4 h-4" /> Reject Changes
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] hover:brightness-110 text-black font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)]"
            >
              <Check className="w-4 h-4" /> Accept & Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
