"use client";

import { useId } from "react";
import clsx from "clsx";

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-3.5">
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
        {description && <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-95",
          checked
            ? "bg-[var(--accent)]"
            : "bg-[var(--toggle-off)]",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

export function Slider({
  label,
  description,
  value,
  min,
  max,
  step,
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
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const display = format ? format(value) : `${value}${unit ?? ""}`;
  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">{label}</label>
        <span className="rounded-md bg-[var(--accent-bg)] px-2 py-0.5 font-mono text-xs text-[var(--accent)]">{display}</span>
      </div>
      {description && <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full cursor-pointer accent-[var(--accent)]"
      />
    </div>
  );
}

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
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="py-3.5">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">{label}</label>
      {description && <p className="mb-2 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] transition focus:border-[var(--accent-border-strong)] focus:outline-none"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

export function TextInput({
  label,
  description,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  type?: "text" | "password" | "url";
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="py-3.5">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">{label}</label>
      {description && <p className="mb-2 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent-border-strong)] focus:outline-none"
      />
    </div>
  );
}

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
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="py-3.5">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">{label}</label>
      {description && <p className="mb-2 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="h-11 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--accent-border-strong)] focus:outline-none"
      />
    </div>
  );
}

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
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="py-3.5">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">{label}</label>
      {description && <p className="mb-2 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm leading-6 text-[var(--foreground)] focus:border-[var(--accent-border-strong)] focus:outline-none"
      />
    </div>
  );
}

export function ColorPicker({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-5 py-3.5">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">{label}</label>
        {description && <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-1.5 pr-3">
        <input id={id} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-9 cursor-pointer rounded-lg border-0 bg-transparent" />
        <span className="font-mono text-xs text-[var(--muted)]">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

export function ActionButton({
  label,
  variant = "default",
  disabled = false,
  onClick,
}: {
  label: string;
  variant?: "default" | "danger" | "accent";
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles = {
    default: "border-[var(--input-border)] bg-[var(--card-bg)] text-[var(--foreground-soft)] hover:bg-[var(--hover-bg)]",
    accent: "border-[var(--accent-border-strong)] bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-110",
    danger: "border-rose-500/25 bg-rose-500/5 text-[var(--danger)] hover:bg-rose-500/10",
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx("min-h-10 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45", styles)}
    >
      {label}
    </button>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:p-5">
      <div className="mb-2 border-b border-[var(--card-border)] pb-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>}
      </div>
      <div className="divide-y divide-[var(--card-border)]">{children}</div>
    </section>
  );
}
