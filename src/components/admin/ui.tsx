"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";

import { Spinner } from "@/components/ui/loading";
import { AlertIcon, CheckIcon, CloseIcon } from "./icons";

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-brand-deep focus:ring-4 focus:ring-brand/15 disabled:bg-surface disabled:text-foreground/50";
export const textareaClass = inputClass.replace("h-11", "min-h-24 py-3 leading-6");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-white hover:bg-brand-deep shadow-sm",
  secondary: "border border-line bg-white text-foreground hover:border-brand hover:bg-surface/60",
  ghost: "text-foreground/70 hover:bg-surface hover:text-foreground",
  danger: "bg-rose-700 text-white hover:bg-rose-800 shadow-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md"; loading?: boolean; icon?: ReactNode }) {
  const sizes = size === "sm" ? "h-9 px-3.5 text-xs gap-1.5" : "h-11 px-5 text-sm gap-2";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${sizes} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/65 transition-colors hover:bg-surface hover:text-foreground disabled:opacity-40 ${className}`} {...props}>
      {children}
    </button>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "brand";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface text-foreground/70",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  brand: "bg-brand/15 text-brand-deep ring-1 ring-inset ring-brand/30",
};

export function Badge({ tone = "neutral", children, dot = false }: { tone?: BadgeTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(86_64_54/0.04)] ${className}`}>{children}</div>;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h3 className="font-sans text-base font-semibold tracking-normal">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-foreground/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-foreground/60">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-deep">{icon}</div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-foreground/60">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <div className="mt-1.5">{children(id)}</div>
      {hint && <p className="mt-1.5 text-xs leading-5 text-foreground/55">{hint}</p>}
    </div>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-foreground/55">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-surface-strong transition-colors peer-checked:bg-foreground peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-white p-1 text-xs font-semibold">
      {options.map(([key, text]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)} className={`rounded-full px-3.5 py-1.5 transition-colors ${value === key ? "bg-foreground text-white" : "text-foreground/60 hover:text-foreground"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

/** Side sheet on larger screens, full-height sheet on phones. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  focusField = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  focusField?: boolean;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open);
  useEscape(open, onClose);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Jump straight into the form with a mouse; on touch screens that would pop the keyboard over the sheet.
    const firstField = focusField && window.matchMedia("(pointer: fine)").matches
      ? panel.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select, textarea")
      : null;
    (firstField ?? panel.current)?.focus({ preventScroll: true });
    return () => previouslyFocused?.focus?.({ preventScroll: true });
  }, [open, focusField]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade-in absolute inset-0 bg-foreground/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="animate-slide-in-right relative flex h-full w-full max-w-lg flex-col bg-background shadow-2xl outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-2xl leading-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-foreground/60">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}><CloseIcon /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toasts and confirmation dialogs, shared across every admin section.

type Toast = { id: number; tone: "success" | "error"; message: string };
type ConfirmOptions = { title: string; message: string; confirmLabel?: string; tone?: "danger" | "primary"; reasonLabel?: string };
type ConfirmRequest = ConfirmOptions & { resolve: (value: { confirmed: boolean; reason: string }) => void };

type FeedbackContext = {
  notify: (message: string, tone?: Toast["tone"]) => void;
  confirm: (options: ConfirmOptions) => Promise<{ confirmed: boolean; reason: string }>;
};

const Feedback = createContext<FeedbackContext | null>(null);

export function useFeedback() {
  const context = useContext(Feedback);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
}

/** Current time that ticks every minute, so "next appointment" style labels stay honest. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, tone, message }]);
    window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 3500);
  }, [dismiss]);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<{ confirmed: boolean; reason: string }>((resolve) => setRequest({ ...options, resolve })), []);

  const close = useCallback((confirmed: boolean, reason = "") => {
    setRequest((current) => {
      current?.resolve({ confirmed, reason });
      return null;
    });
  }, []);

  return (
    <Feedback.Provider value={{ notify, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
        {toasts.map((toast) => (
          <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-lg">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${toast.tone === "error" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
              {toast.tone === "error" ? <AlertIcon className="h-3.5 w-3.5" /> : <CheckIcon className="h-3.5 w-3.5" />}
            </span>
            <p className="flex-1 leading-5">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="text-foreground/40 hover:text-foreground"><CloseIcon className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      {request && <ConfirmDialog request={request} onClose={close} />}
    </Feedback.Provider>
  );
}

function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: (confirmed: boolean, reason?: string) => void }) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);
  useEscape(true, () => onClose(false));
  useEffect(() => cancelRef.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <div className="animate-fade-in absolute inset-0 bg-foreground/35 backdrop-blur-[2px]" onClick={() => onClose(false)} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="animate-fade-up relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id={titleId} className="text-2xl">{request.title}</h2>
        <p className="mt-2 text-sm leading-6 text-foreground/65">{request.message}</p>
        {request.reasonLabel && (
          <Field label={request.reasonLabel} className="mt-5">
            {(id) => <input id={id} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional" className={inputClass} />}
          </Field>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={() => onClose(false)}>Keep it</Button>
          <Button variant={request.tone === "primary" ? "primary" : "danger"} onClick={() => onClose(true, reason)}>{request.confirmLabel ?? "Confirm"}</Button>
        </div>
      </div>
    </div>
  );
}
