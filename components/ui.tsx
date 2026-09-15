"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { IconX } from "./icons";

/* ---------- Botones ---------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-accent text-accent-ink hover:bg-accent-strong",
    secondary: "bg-surface border border-line-strong text-ink hover:bg-accent-soft/40",
    danger: "bg-alert text-accent-ink hover:bg-alert/85",
    ghost: "text-ink-muted hover:text-ink hover:bg-paper",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

/* ---------- Campos de formulario ---------- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

const controlClass =
  "min-h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-focus-ring disabled:opacity-60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={controlClass} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} min-h-24 py-3`} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={controlClass} {...props} />;
}

/* ---------- Interruptor sí/no grande, fácil de tocar ---------- */

export function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
  name,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-12 rounded-md border px-3 text-[15px] font-semibold transition-colors ${
              active
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-line-strong bg-surface text-ink-muted hover:bg-paper"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Insignias ---------- */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "route" | "gold" | "accent" | "settled" | "alert";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-paper text-ink-muted border-line-strong",
    route: "bg-route-soft text-route-strong border-transparent",
    gold: "bg-gold-soft text-gold border-transparent",
    accent: "bg-accent-soft text-accent-strong border-transparent",
    settled: "bg-settled-soft text-settled border-transparent",
    alert: "bg-alert-soft text-alert border-transparent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---------- Hoja / modal: pantalla completa abajo en celular, centrado en escritorio ---------- */

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl bg-surface-raised md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-xl md:border md:border-line"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-paper"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Estado vacío ---------- */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
