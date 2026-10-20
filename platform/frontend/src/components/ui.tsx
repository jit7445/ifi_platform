"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ComponentType,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type SVGProps,
  type TextareaHTMLAttributes,
} from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { humanize } from "@/lib/format";
import { IconAlert, IconCheckCircle, IconChevronLeft, IconInbox, IconInfo, IconX, IconXCircle } from "./icons";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-card hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary",
  secondary: "border border-line-strong bg-surface text-fg shadow-card hover:bg-surface-hover disabled:text-fg-subtle disabled:hover:bg-surface",
  danger: "bg-danger-solid text-on-primary shadow-card hover:bg-danger-solid-hover disabled:opacity-50 disabled:hover:bg-danger-solid",
  ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg disabled:text-fg-subtle disabled:hover:bg-transparent",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

const buttonBase =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonBase, sizeClass[size], variantClass[variant], className)}
      {...rest}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  children,
  className,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cx(buttonBase, sizeClass[size], variantClass[variant], className)}>
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1 text-xs font-medium text-danger" role="alert">
          <IconAlert size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

const controlClass =
  "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-fg shadow-card placeholder:text-fg-subtle transition-colors focus:border-primary focus:outline-none focus:ring-3 focus:ring-focus/25 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted";

type FieldProps = { label?: ReactNode; hint?: ReactNode; error?: string | null; wrapperClassName?: string };

export function Input({ label, hint, error, wrapperClassName, className, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={rest.required} className={wrapperClassName}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(controlClass, "h-9", error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-line-strong", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={rest.required} className={wrapperClassName}>
      <textarea
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(controlClass, "min-h-[5rem] leading-relaxed", error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-line-strong", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={rest.required} className={wrapperClassName}>
      <select
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cx(controlClass, "h-9 py-0 pr-8", error ? "border-danger" : "border-line-strong", className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  hint,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className={cx("flex items-start gap-2.5", className)}>
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-primary" {...rest} />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm text-fg">
          {label}
        </label>
        {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-line bg-surface shadow-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? undefined : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  status,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  status?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 rounded text-sm font-medium text-fg-muted transition-colors hover:text-primary-text"
        >
          <IconChevronLeft size={16} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
            {status}
          </div>
          {subtitle && <div className="mt-1.5 text-sm text-fg-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export type Tone = "gray" | "blue" | "green" | "yellow" | "red" | "purple" | "teal";

const toneClass: Record<Tone, string> = {
  gray: "bg-surface-sunken text-fg-muted ring-line-strong",
  blue: "bg-info-subtle text-info ring-info-line",
  green: "bg-success-subtle text-success ring-success-line",
  yellow: "bg-warning-subtle text-warning ring-warning-line",
  red: "bg-danger-subtle text-danger ring-danger-line",
  purple: "bg-primary-subtle text-primary-text ring-primary-line",
  teal: "bg-accent-subtle text-accent-text ring-accent-line",
};

const dotClass: Record<Tone, string> = {
  gray: "bg-fg-subtle",
  blue: "bg-info",
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
  purple: "bg-primary-text",
  teal: "bg-accent",
};

export function Badge({ tone = "gray", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClass[tone],
      )}
    >
      {dot && <span aria-hidden="true" className={cx("h-1.5 w-1.5 rounded-full", dotClass[tone])} />}
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  draft: "gray",
  submitted: "blue",
  changes_requested: "yellow",
  approved: "purple",
  active: "green",
  paused: "yellow",
  completed: "teal",
  cancelled: "red",
  published: "green",
  queued: "gray",
  running: "blue",
  succeeded: "green",
  partially_succeeded: "yellow",
  failed: "red",
  frozen: "purple",
  in_progress: "blue",
  rework: "yellow",
  open: "blue",
  claimed: "purple",
  done: "green",
  resolved: "green",
  pending: "yellow",
  verified: "green",
  rejected: "red",
  suspended: "red",
  reliable: "green",
  tentative: "yellow",
  unreliable: "red",
  insufficient_data: "gray",
  available: "green",
  ready: "green",
};

export function statusTone(status: string | null | undefined): Tone {
  return (status && statusTones[status]) || "gray";
}

/** Colour-coded pill for project, task, review and quality statuses. */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge>-</Badge>;
  return (
    <Badge tone={statusTone(status)} dot>
      {humanize(status)}
    </Badge>
  );
}

export const StatusPill = StatusBadge;

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", small ? "h-3.5 w-3.5" : "h-5 w-5")}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("skeleton rounded-md", className)} />;
}

/** Skeleton placeholder; the label is announced to assistive tech while content loads. */
export function Loading({ label = "Loading", variant = "block" }: { label?: string; variant?: "block" | "table" | "cards" | "inline" }) {
  return (
    <div role="status" aria-live="polite" className={cx(variant !== "inline" && "py-2")}>
      <span className="sr-only">{label}...</span>
      {variant === "inline" && (
        <span className="flex items-center gap-2 text-sm text-fg-muted" aria-hidden="true">
          <Spinner small /> {label}
        </span>
      )}
      {variant === "block" && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}
      {variant === "table" && (
        <div className="overflow-hidden rounded-xl border border-line">
          <Skeleton className="h-9 w-full rounded-none" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 border-t border-line px-3 py-3">
              <Skeleton className="h-3.5 w-1/4" />
              <Skeleton className="h-3.5 w-1/6" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
      )}
      {variant === "cards" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon: Icon = IconInbox,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-subtle text-primary-text">
        <Icon size={22} />
      </span>
      <p className="font-semibold text-fg">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-fg-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorAlert({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  if (!error) return null;
  const api = error instanceof ApiError ? error : null;
  const fieldErrors = api?.errors.filter((e) => e.field) ?? [];
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-danger-line bg-danger-subtle p-3 text-sm text-danger">
      <IconXCircle size={18} className="mt-px shrink-0" />
      <div className="min-w-0">
        <p className="font-medium">{title ?? errorMessage(error)}</p>
        {title && <p className="mt-0.5">{errorMessage(error)}</p>}
        {api?.code === "mfa_required" && (
          <p className="mt-1">
            Your organisation requires two-factor authentication.{" "}
            <Link className="font-medium underline" href="/settings/security">
              Set it up now
            </Link>
            .
          </p>
        )}
        {fieldErrors.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {fieldErrors.map((e, i) => (
              <li key={i}>
                <span className="font-mono text-xs">{e.field}</span>: {e.message}
              </li>
            ))}
          </ul>
        )}
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 font-medium underline underline-offset-2">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

const noticeClass = {
  blue: "border-info-line bg-info-subtle text-info",
  green: "border-success-line bg-success-subtle text-success",
  yellow: "border-warning-line bg-warning-subtle text-warning",
} as const;

const noticeIcon = { blue: IconInfo, green: IconCheckCircle, yellow: IconAlert } as const;

/** Inline banner; green is used as the success confirmation after an action completes. */
export function Notice({ tone = "blue", children, onDismiss }: { tone?: "blue" | "green" | "yellow"; children: ReactNode; onDismiss?: () => void }) {
  const Icon = noticeIcon[tone];
  return (
    <div role="status" className={cx("flex gap-3 rounded-lg border p-3 text-sm", noticeClass[tone])}>
      <Icon size={18} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1 rounded p-1 opacity-80 hover:opacity-100">
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: ReactKeyboardEvent, idx: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    if (next >= 0) {
      e.preventDefault();
      onChange(tabs[next].id);
      refs.current[next]?.focus();
    }
  };
  return (
    <div role="tablist" aria-label={label} className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((t, i) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.id)}
            className={cx(
              "relative -mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-2 text-sm font-medium transition-colors focus-visible:outline-offset-[-2px]",
              on ? "border-primary text-primary-text" : "border-transparent text-fg-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </div>
  );
}

/** Scrolls inside its own box so the header can stay sticky on long tables. */
export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-line bg-surface shadow-card">
      <table className="min-w-full border-separate border-spacing-0 text-sm tabular-nums [&_tbody_tr:hover]:bg-surface-hover [&_tbody_tr]:transition-colors [&_tbody_tr+tr>td]:border-t [&_tbody_tr+tr>td]:border-line">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cx(
        "sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface-sunken px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cx("px-3 py-2.5 align-top text-fg", className)}>
      {children}
    </td>
  );
}

const statToneClass = {
  default: "text-fg",
  green: "text-success",
  yellow: "text-warning",
  red: "text-danger",
  primary: "text-primary-text",
} as const;

/** KPI tile: label, large value, optional hint, accent icon and footer (for example a progress bar). */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon,
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof statToneClass;
  icon?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        {icon && <span className="text-fg-subtle">{icon}</span>}
      </div>
      <p className={cx("mt-1.5 text-2xl font-semibold tracking-tight tabular-nums", statToneClass[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

export const KpiCard = Stat;

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface-raised p-5 shadow-pop sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
          <button type="button" onClick={onClose} className="-m-1 rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg" aria-label="Close dialog">
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TextBlock({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return <p className="text-sm italic text-fg-subtle">None</p>;
  return <div className={cx("whitespace-pre-wrap break-words text-sm leading-relaxed text-fg", className)}>{text}</div>;
}

export function DefList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium text-fg-muted">{k}</dt>
          <dd className="mt-1 break-words text-sm text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const barTone = { primary: "bg-primary", accent: "bg-accent", warning: "bg-warning", danger: "bg-danger" } as const;

export function ProgressBar({
  value,
  label,
  tone = "primary",
  hideLabel,
}: {
  value: number;
  label: string;
  tone?: keyof typeof barTone;
  hideLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      {!hideLabel && (
        <div className="mb-1.5 flex justify-between gap-2 text-xs text-fg-muted">
          <span>{label}</span>
          <span className="font-medium tabular-nums text-fg">{pct}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-line"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cx("h-full rounded-full transition-[width] duration-500", barTone[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Small horizontal bar for a 0..1 value, used for ranking factors in dense tables. */
export function MiniBar({ value, label }: { value: number | null | undefined; label: string }) {
  const v = value === null || value === undefined || Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
  return (
    <span className="inline-flex h-1.5 w-14 overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-line" role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
      <span className="h-full rounded-full bg-accent" style={{ width: `${v * 100}%` }} />
    </span>
  );
}
