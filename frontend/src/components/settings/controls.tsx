"use client";

import React from "react";
import clsx from "clsx";

/* ---------- Toggle ---------- */
export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm text-[var(--accent)]">{label}</div>
        {description && <div className="text-xs text-[var(--muted)]">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full border transition-all",
          checked
            ? "bg-[var(--accent-bg-strong)] border-[var(--accent)] shadow-[0_0_10px_var(--accent-glow-strong)]"
            : "bg-[var(--toggle-off)] border-[var(--card-border)]"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full transition-all",
            checked ? "left-6 bg-[var(--accent)]" : "left-0.5 bg-zinc-500"
          )}
        />
      </button>
    </div>
  );
}

/* ---------- Slider ---------- */
export function Slider({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  format,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const display = format ? format(value) : `${value}${unit ?? ""}`;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--accent)]">{label}</div>
        <div className="text-xs text-[var(--muted)] font-mono">{display}</div>
      </div>
      {description && <div className="text-xs text-[var(--muted)] mb-1">{description}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent)] mt-1"
      />
    </div>
  );
}

/* ---------- Select ---------- */
export function Select<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="py-2">
      <div className="text-sm text-[var(--accent)] mb-1">{label}</div>
      {description && <div className="text-xs text-[var(--muted)] mb-1">{description}</div>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-[var(--input-bg)] border border-[var(--accent-border)] rounded px-3 py-2 text-sm text-[var(--accent)] outline-none focus:border-[var(--accent)] transition-all"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[var(--input-bg)]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- Text Input ---------- */
export function TextInput({
  label,
  description,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="py-2">
      <div className="text-sm text-[var(--accent)] mb-1">{label}</div>
      {description && <div className="text-xs text-[var(--muted)] mb-1">{description}</div>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--input-bg)] border border-[var(--accent-border)] rounded px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
      />
    </div>
  );
}

/* ---------- Number Input ---------- */
export function NumberInput({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-2">
      <div className="text-sm text-[var(--accent)] mb-1">{label}</div>
      {description && <div className="text-xs text-[var(--muted)] mb-1">{description}</div>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
        className="w-full bg-[var(--input-bg)] border border-[var(--accent-border)] rounded px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
      />
    </div>
  );
}

/* ---------- Textarea ---------- */
export function TextArea({
  label,
  description,
  value,
  rows = 4,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="py-2">
      <div className="text-sm text-[var(--accent)] mb-1">{label}</div>
      {description && <div className="text-xs text-[var(--muted)] mb-1">{description}</div>}
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--input-bg)] border border-[var(--accent-border)] rounded px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all resize-y"
      />
    </div>
  );
}

/* ---------- Color Picker ---------- */
export function ColorPicker({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm text-[var(--accent)]">{label}</div>
        {description && <div className="text-xs text-[var(--muted)]">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--muted)] font-mono">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded bg-transparent border border-[var(--accent-border)] cursor-pointer"
        />
      </div>
    </div>
  );
}

/* ---------- Action Button ---------- */
export function ActionButton({
  label,
  variant = "default",
  onClick,
}: {
  label: string;
  variant?: "default" | "danger" | "accent";
  onClick: () => void;
}) {
  const styles = {
    default: "border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-bg)]",
    accent: "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] hover:bg-[var(--accent-bg-strong)] shadow-[0_0_10px_var(--accent-glow-strong)]",
    danger: "border-red-500/40 text-red-400 hover:bg-red-950/30",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx("px-3 py-1.5 rounded border text-xs uppercase tracking-wider transition-all", styles)}
    >
      {label}
    </button>
  );
}

/* ---------- Section Card ---------- */
export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--accent-border)] bg-[var(--card-bg)] p-4 backdrop-blur-sm">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)] mb-2 border-b border-[var(--accent-border)] pb-2">
        {title}
      </h3>
      <div className="divide-y divide-[var(--accent-border)]">{children}</div>
    </div>
  );
}
