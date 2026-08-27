import React, { useEffect, useId, useRef, useState } from "react";
import { X, ChevronDown, ChevronStart, ChevronEnd, Search, Loader2, AlertTriangle, Inbox, Upload } from "./icons";
import { cn, fa, formatIrr } from "../lib";
import type { BadgeStatus, ButtonSize, ButtonVariant, Id, ModalSize } from "../types";

/* ================================ Button ================================ */
const btnVariants: Record<ButtonVariant, string> = {
  primary: "bg-gold-500 text-charcoal-900 hover:bg-gold-600 hover:text-cream-0 shadow-[var(--shadow-gold)] font-semibold",
  secondary: "bg-cream-0 text-charcoal-900 border border-inkline hover:border-gold-500 hover:bg-gold-50",
  ghost: "bg-transparent text-charcoal-700 hover:bg-cream-100 hover:text-charcoal-900",
  danger: "bg-danger text-cream-0 hover:bg-[#7f2222]",
  sell: "bg-charcoal-900 text-cream-0 hover:bg-charcoal-800 border border-charcoal-700",
};
const btnSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[12.5px] gap-1.5",
  md: "h-11 px-4 text-[13.5px] gap-2",
  lg: "h-12.5 px-6 text-[15px] gap-2",
};

export function Button({
  variant = "primary", size = "md", loading, disabled, icon, children, className, full, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; icon?: React.ReactNode; full?: boolean;
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-[8px] transition-all duration-150 focus-ring select-none",
        "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        btnVariants[variant], btnSizes[size], full && "w-full", className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label}
      className={cn("inline-flex items-center justify-center h-11 w-11 rounded-[8px] text-charcoal-700 hover:bg-cream-100 hover:text-charcoal-900 transition-colors focus-ring active:scale-95", className)}
      {...rest}>
      {children}
    </button>
  );
}

/* ================================ Inputs ================================ */
export function Field({ label, hint, error, required, children, className }: {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label className="text-[12.5px] font-medium text-charcoal-700">{label}{required && <span className="text-danger ms-0.5">*</span>}</label>}
      {children}
      {error ? <p className="text-[12px] text-danger flex items-center gap-1"><AlertTriangle size={12} />{error}</p>
        : hint ? <p className="text-[12px] text-charcoal-500">{hint}</p> : null}
    </div>
  );
}

const inputCls = (error?: boolean) => cn(
  "w-full h-11 rounded-[8px] border bg-cream-0 px-3.5 text-[13.5px] text-charcoal-900 placeholder:text-charcoal-500/60",
  "transition-all duration-150 focus-ring",
  error ? "border-danger/70 bg-danger/[0.03]" : "border-inkline hover:border-gold-300 focus:border-gold-500",
);

export function Input({ label, hint, error, required, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; required?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      <input className={inputCls(!!error)} {...rest} />
    </Field>
  );
}

export function MobileInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode; error?: React.ReactNode; hint?: React.ReactNode }) {
  const { label = "شماره موبایل", ...rest } = props;
  return (
    <Field label={label} error={props.error} hint={props.hint}>
      <div className="relative">
        <input dir="ltr" inputMode="numeric" autoComplete="tel" placeholder="09xxxxxxxxx"
          className={cn(inputCls(!!props.error), "text-left pe-3 font-medium tnum tracking-wide")} {...rest} />
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-[11px] text-charcoal-500">IR +98</span>
      </div>
    </Field>
  );
}

export function OtpInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div dir="ltr" className="flex gap-2 justify-center" onClick={() => ref.current?.focus()}>
        {Array.from({ length: 6 }).map((_, i) => (
          <input key={i} ref={i === 0 ? ref : undefined}
            inputMode="numeric" maxLength={1}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`رقم ${fa(i + 1)} کد تأیید`}
            value={value[i] ?? ""}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(-1);
              const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, 6);
              onChange(next);
              if (d && i < 5) {
                const el = e.target.parentElement?.children[i + 1] as HTMLInputElement | undefined;
                el?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !value[i] && i > 0) {
                ((e.target as HTMLInputElement).parentElement?.children[i - 1] as HTMLInputElement)?.focus();
              }
            }}
            onPaste={(e) => {
              const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (txt) { e.preventDefault(); onChange(txt); }
            }}
            className={cn(
              "h-13 w-11 rounded-[8px] border bg-cream-0 text-center text-xl font-bold text-charcoal-900 focus-ring transition-all",
              error ? "border-danger/70" : value[i] ? "border-gold-500 bg-gold-50" : "border-inkline",
            )} />
        ))}
      </div>
      {error && <p className="text-[12px] text-danger text-center mt-2">{error}</p>}
    </div>
  );
}

export function MoneyInput({ label, value, onChange, error, hint, min, max }: {
  label?: React.ReactNode; value: number; onChange: (n: number) => void; error?: string; hint?: React.ReactNode; min?: number; max?: number;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="relative">
        <input dir="ltr" inputMode="numeric" value={value ? value.toLocaleString("en-US") : ""} placeholder="0"
          onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
          className={cn(inputCls(!!error), "text-left pe-14 tnum font-medium")} />
        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11.5px] text-charcoal-500">ریال</span>
      </div>
      {max !== undefined && value > max && !error && (
        <p className="text-[12px] text-warning">بیش از حد مجاز ({formatIrr(max)})</p>
      )}
      {min !== undefined && value > 0 && value < min && !error && (
        <p className="text-[12px] text-warning">حداقل {formatIrr(min)} ریال</p>
      )}
    </Field>
  );
}

export function MassInput({ label, valueMg, onChange, error, hint }: {
  label?: React.ReactNode; valueMg: number; onChange: (mg: number) => void; error?: string; hint?: React.ReactNode;
}) {
  const [unit, setUnit] = useState<"mg" | "g">("mg");
  const shown = unit === "g" ? valueMg / 1000 : valueMg;
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="flex rounded-[8px] border border-inkline bg-cream-0 overflow-hidden focus-within:border-gold-500 transition-colors">
        <input dir="ltr" inputMode="decimal" value={shown || ""} placeholder="0"
          aria-label={unit === "g" ? "وزن به گرم" : "وزن به میلی‌گرم"}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d.]/g, "")) || 0;
            onChange(unit === "g" ? Math.round(n * 1000) : Math.round(n));
          }}
          className="flex-1 h-11 bg-transparent px-3.5 text-start text-[15px] font-semibold tnum outline-none" />
        <div className="flex border-s border-inkline">
          {(["mg", "g"] as const).map((u) => (
            <button key={u} type="button" onClick={() => setUnit(u)}
              className={cn("px-3 text-[12px] font-medium transition-colors", unit === u ? "bg-charcoal-900 text-cream-0" : "text-charcoal-500 hover:text-charcoal-900")}>
              {u === "g" ? "گرم" : "mg"}
            </button>
          ))}
        </div>
      </div>
    </Field>
  );
}

export function Select({ label, error, options, className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: React.ReactNode; error?: React.ReactNode; options: { value: string | number; label: string }[];
}) {
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <select className={cn(inputCls(!!error), "appearance-none pe-9 cursor-pointer", className)} {...rest}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal-500" />
      </div>
    </Field>
  );
}

export function Textarea({ label, error, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: React.ReactNode; error?: React.ReactNode }) {
  return (
    <Field label={label} error={error}>
      <textarea className={cn(inputCls(!!error), "h-auto min-h-28 py-2.5 resize-y leading-6", className)} {...rest} />
    </Field>
  );
}

export function Checkbox({ label, checked, onChange, disabled }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-2.5 cursor-pointer select-none group", disabled && "opacity-50 pointer-events-none")}>
      <span className={cn("h-5 w-5 rounded-[5px] border grid place-items-center transition-all",
        checked ? "bg-gold-500 border-gold-500" : "border-inkline bg-cream-0 group-hover:border-gold-400")}>
        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A1714" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="text-[13px] text-charcoal-700">{label}</span>
    </label>
  );
}

export function Radio({ label, checked, onChange, disabled, desc }: { label: React.ReactNode; desc?: React.ReactNode; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={cn("flex items-start gap-2.5 cursor-pointer select-none group", disabled && "opacity-50 pointer-events-none")}>
      <span className={cn("mt-0.5 h-5 w-5 rounded-full border-2 grid place-items-center transition-all shrink-0",
        checked ? "border-gold-500" : "border-inkline group-hover:border-gold-400")}>
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-gold-500 anim-pop" />}
      </span>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} disabled={disabled} />
      <span className="flex flex-col">
        <span className="text-[13px] font-medium text-charcoal-900">{label}</span>
        {desc && <span className="text-[12px] text-charcoal-500 leading-5">{desc}</span>}
      </span>
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex items-center gap-2.5 focus-ring rounded-full disabled:opacity-50", !!label && "py-1")}>
      <span className={cn("relative h-6 w-11 rounded-full transition-colors duration-200", checked ? "bg-gold-500" : "bg-inkline")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-cream-0 shadow transition-all duration-200",
          checked ? "start-[22px]" : "start-0.5")} />
      </span>
      {label && <span className="text-[13px] text-charcoal-700">{label}</span>}
    </button>
  );
}

export function Slider({ value, min, max, step = 1, onChange, unit }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-4">
      <input type="range" dir="ltr" min={min} max={max} step={step} value={value}
        aria-valuetext={unit ? `${value} ${unit}` : String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="zr-slider flex-1" style={{ ["--fill" as string]: `${pct}%` }} />
      <span className="tnum text-[13.5px] font-semibold bg-gold-50 border border-gold-100 rounded-md px-2.5 py-1 min-w-16 text-center">{fa(value)}{unit && <span className="text-[11px] text-charcoal-500 ms-1">{unit}</span>}</span>
    </div>
  );
}

/* ================================ Tabs / Accordion ================================ */
export function Tabs({ items, value, onChange, className, size = "md" }: {
  items: { key: string; label: React.ReactNode }[]; value: string; onChange: (k: string) => void; className?: string; size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className={cn("flex items-center gap-1 border-b border-inkline overflow-x-auto", className)}>
      {items.map((it) => (
        <button key={it.key} role="tab" aria-selected={value === it.key} onClick={() => onChange(it.key)}
          className={cn("relative whitespace-nowrap transition-colors focus-ring rounded-t-md",
            size === "sm" ? "px-3 py-2 text-[12.5px]" : "px-4 py-2.5 text-[13.5px]",
            value === it.key ? "font-bold text-charcoal-900" : "text-charcoal-500 hover:text-charcoal-900")}>
          {it.label}
          {value === it.key && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-gold-500 rounded-full" />}
        </button>
      ))}
    </div>
  );
}

export function Accordion({ items }: { items: { title: string; body: React.ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-inkline border border-inkline rounded-card bg-cream-0 overflow-hidden">
      {items.map((it, i) => (
        <div key={i}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-start hover:bg-gold-50/50 transition-colors focus-ring">
            <span className="text-[14px] font-semibold text-charcoal-900">{it.title}</span>
            <ChevronDown size={17} className={cn("text-gold-600 transition-transform duration-200 shrink-0", open === i && "rotate-180")} />
          </button>
          <div className={cn("grid transition-all duration-200", open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
            <div className="overflow-hidden">
              <div className="px-5 pb-5 text-[13.5px] leading-7 text-charcoal-700">{it.body}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================ Badge / Skeleton / Stepper ================================ */
const badgeStyles: Record<BadgeStatus, string> = {
  paid: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/25",
  shipped: "bg-info/10 text-info border-info/20",
  vaulted: "bg-gold-100 text-gold-700 border-gold-200",
  halted: "bg-danger/10 text-danger border-danger/20",
  success: "bg-success/10 text-success border-success/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  warning: "bg-warning/10 text-warning border-warning/25",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-cream-100 text-charcoal-700 border-inkline",
  gold: "bg-gold-500/15 text-gold-700 border-gold-300/50",
};
export function Badge({ status = "neutral", children, className }: { status?: BadgeStatus; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap", badgeStyles[status], className)}>
      {children}
    </span>
  );
}

export const ORDER_STATUS_FA: Record<string, { label: string; status: BadgeStatus }> = {
  draft: { label: "پیش‌نویس", status: "neutral" },
  awaiting_payment: { label: "در انتظار پرداخت", status: "pending" },
  paid: { label: "پرداخت‌شده", status: "paid" },
  reserved: { label: "رزروشده", status: "gold" },
  processing: { label: "در حال پردازش", status: "info" },
  vaulted: { label: "در خزانه", status: "vaulted" },
  shipped: { label: "ارسال‌شده", status: "shipped" },
  delivered: { label: "تحویل‌شده", status: "success" },
  cancelled: { label: "لغوشده", status: "danger" },
  refunded: { label: "بازپرداخت‌شده", status: "warning" },
};
export const PAYMENT_STATUS_FA: Record<string, { label: string; status: BadgeStatus }> = {
  pending: { label: "در انتظار", status: "pending" },
  paid: { label: "پرداخت‌شده", status: "paid" },
  failed: { label: "ناموفق", status: "danger" },
  cancelled: { label: "لغوشده", status: "neutral" },
};
export const KYC_STATUS_FA: Record<string, { label: string; status: BadgeStatus }> = {
  unverified: { label: "تأییدنشده", status: "neutral" },
  pending: { label: "در انتظار بررسی", status: "pending" },
  approved: { label: "تأییدشده", status: "success" },
  rejected: { label: "ردشده", status: "danger" },
};

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function ProgressStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center w-full">
      {steps.map((s, i) => (
        <li key={s} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
          <div className="flex flex-col items-center gap-1.5">
            <span className={cn("h-8 w-8 rounded-full grid place-items-center text-[12.5px] font-bold border-2 transition-all",
              i < current ? "bg-gold-500 border-gold-500 text-charcoal-900"
                : i === current ? "border-gold-500 text-gold-700 bg-gold-50"
                : "border-inkline text-charcoal-500 bg-cream-0")}>
              {i < current ? "✓" : fa(i + 1)}
            </span>
            <span className={cn("text-[11.5px] font-medium whitespace-nowrap", i <= current ? "text-charcoal-900" : "text-charcoal-500")}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={cn("flex-1 h-0.5 mx-2 mb-5 rounded-full transition-colors", i < current ? "bg-gold-500" : "bg-inkline")} />}
        </li>
      ))}
    </ol>
  );
}

/* ================================ Overlays ================================ */
function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
}

const modalSizes: Record<ModalSize, string> = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, size = "md", children, footer }: {
  open: boolean; onClose: () => void; title: React.ReactNode; size?: ModalSize; children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-overlay anim-fade-in" onClick={onClose} />
      <div className={cn("relative w-full bg-cream-0 rounded-card shadow-[var(--shadow-pop)] anim-pop border border-inkline", modalSizes[size])}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-inkline">
          <h3 className="text-[15px] font-bold text-charcoal-900">{title}</h3>
          <IconButton label="بستن" onClick={onClose} className="h-9 w-9 -me-1.5"><X size={17} /></IconButton>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-inkline bg-cream-50/60 rounded-b-card flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer, side = "start" }: {
  open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; side?: "start" | "end";
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-overlay anim-fade-in" onClick={onClose} />
      <div className={cn("absolute top-0 bottom-0 w-full max-w-md bg-cream-0 shadow-[var(--shadow-pop)] flex flex-col border-inkline",
        side === "start" ? "start-0 border-e" : "end-0 border-s")}
        style={{ animation: `${side === "start" ? "drawerEnd" : "slideInStart"} 0.25s ease` }}>
        <style>{`@keyframes slideInStart{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes drawerEnd{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div className="flex items-center justify-between px-5 py-4 border-b border-inkline">
          <h3 className="text-[15px] font-bold">{title}</h3>
          <IconButton label="بستن" onClick={onClose} className="h-9 w-9"><X size={17} /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-inkline bg-cream-50/60">{footer}</div>}
      </div>
    </div>
  );
}

export function Popover({ trigger, children, align = "end" }: { trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className={cn("absolute top-full mt-2 z-50 min-w-52 bg-cream-0 border border-inkline rounded-card shadow-[var(--shadow-pop)] p-1.5 anim-pop", align === "end" ? "end-0" : "start-0")}>
          {typeof children === "function" ? (children as (close: () => void) => React.ReactNode)(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

/* ================================ Table ================================ */
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}

export function DataTable<T extends { id: Id }>({ columns, rows, loading, error, onRetry, empty, onRowClick, actions, dense }: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  dense?: boolean;
}) {
  return (
    <div className="border border-inkline rounded-card bg-cream-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[560px]">
          <thead>
            <tr className="bg-cream-50/80 text-charcoal-500 text-[11.5px] font-medium">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 whitespace-nowrap font-medium",
                  c.align === "end" ? "text-end" : c.align === "center" ? "text-center" : "text-start", c.className)}>{c.header}</th>
              ))}
              {actions && <th className="px-4 py-3 w-12"><span className="sr-only">عملیات</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-inkline/70">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((c) => <td key={c.key} className="px-4 py-3.5"><Skeleton className="h-4 w-4/5" /></td>)}
                {actions && <td className="px-4"><Skeleton className="h-4 w-6" /></td>}
              </tr>
            ))}
            {!loading && error && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center">
                <p className="text-danger text-[13px] mb-3">{error}</p>
                {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>تلاش دوباره</Button>}
              </td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-12">
                {empty ?? (
                  <div className="text-center">
                    <Inbox size={28} className="mx-auto text-charcoal-500/50 mb-2" />
                    <p className="text-charcoal-500 text-[13px]">رکوردی یافت نشد</p>
                  </div>
                )}
              </td></tr>
            )}
            {!loading && !error && rows.map((row) => (
              <tr key={String(row.id)} onClick={() => onRowClick?.(row)}
                className={cn("transition-colors", onRowClick && "cursor-pointer", "hover:bg-gold-50/70")}>
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 whitespace-nowrap", dense ? "py-2.5" : "py-3.5",
                    c.align === "end" ? "text-end" : c.align === "center" ? "text-center" : "text-start", c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
                {actions && <td className="px-4 text-end" onClick={(e) => e.stopPropagation()}>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPage, total }: { page: number; totalPages: number; onPage: (p: number) => void; total?: number }) {
  if (totalPages <= 1) return total ? <p className="text-[12px] text-charcoal-500 mt-3">{fa(total)} رکورد</p> : null;
  return (
    <div className="flex items-center justify-between mt-3 gap-2">
      <p className="text-[12px] text-charcoal-500">{total !== undefined ? `${fa(total)} رکورد — ` : ""}صفحه {fa(page)} از {fa(totalPages)}</p>
      <div className="flex gap-1">
        <IconButton label="صفحه قبل" className="h-9 w-9 border border-inkline bg-cream-0 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronEnd size={15} />
        </IconButton>
        <IconButton label="صفحه بعد" className="h-9 w-9 border border-inkline bg-cream-0 disabled:opacity-40" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronStart size={15} />
        </IconButton>
      </div>
    </div>
  );
}

export function FiltersBar({ search, onSearch, chips, onClear, children }: {
  search?: string; onSearch?: (q: string) => void; chips?: React.ReactNode; onClear?: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {onSearch && (
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input value={search ?? ""} onChange={(e) => onSearch(e.target.value)} placeholder="جستجو…"
            className={cn(inputCls(), "ps-9 h-10 text-[13px]")} />
        </div>
      )}
      {children}
      {onClear && (
        <button onClick={onClear} className="text-[12.5px] text-charcoal-500 hover:text-danger transition-colors underline underline-offset-4">پاک‌کردن فیلترها</button>
      )}
    </div>
  );
}

export function StatCard({ label, value, delta, spark, icon, tone }: {
  label: React.ReactNode; value: React.ReactNode; delta?: number; spark?: React.ReactNode; icon?: React.ReactNode; tone?: "gold" | "plain";
}) {
  return (
    <div className={cn("rounded-card border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
      tone === "gold" ? "bg-charcoal-900 border-charcoal-800 text-cream-0" : "bg-cream-0 border-inkline")}>
      <div className="flex items-center justify-between mb-2">
        <p className={cn("text-[12px] font-medium", tone === "gold" ? "text-cream-0/60" : "text-charcoal-500")}>{label}</p>
        {icon && <span className={tone === "gold" ? "text-gold-500" : "text-gold-600"}>{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={cn("text-[19px] font-extrabold tnum leading-7", tone === "gold" ? "text-cream-0" : "text-charcoal-900")}>{value}</p>
          {delta !== undefined && (
            <p className={cn("text-[11.5px] font-semibold tnum mt-0.5", delta >= 0 ? "text-success" : "text-danger")} dir="ltr">
              {delta >= 0 ? "▲" : "▼"} {fa(Math.abs(delta).toFixed(1))}٪
            </p>
          )}
        </div>
        {spark && <div className="w-20 h-9 shrink-0">{spark}</div>}
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: { at: string; label: string }[] }) {
  return (
    <ol className="relative ms-2.5">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <li key={i} className="relative ps-6 pb-5 last:pb-0">
            {!last && <span className="absolute start-[5px] top-4 bottom-0 w-px bg-inkline" />}
            <span className={cn("absolute start-0 top-1.5 h-[11px] w-[11px] rounded-full border-2",
              last ? "bg-gold-500 border-gold-300" : "bg-cream-0 border-gold-400")} />
            <p className="text-[13px] font-medium text-charcoal-900">{it.label}</p>
            <p className="text-[11.5px] text-charcoal-500 tnum" dir="ltr">{it.at}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function DateRangePicker({ value, onChange }: { value: 7 | 30 | 90; onChange: (v: 7 | 30 | 90) => void }) {
  return (
    <div className="inline-flex rounded-[8px] border border-inkline bg-cream-0 p-0.5 gap-0.5">
      {([7, 30, 90] as const).map((d) => (
        <button key={d} onClick={() => onChange(d)}
          className={cn("px-3 h-9 rounded-md text-[12.5px] font-medium transition-all",
            value === d ? "bg-charcoal-900 text-cream-0 shadow" : "text-charcoal-500 hover:text-charcoal-900")}>
          {fa(d)} روز
        </button>
      ))}
    </div>
  );
}

export function FileDropzone({ label, onFiles, files, hint }: {
  label: React.ReactNode; onFiles: (names: string[]) => void; files: string[]; hint?: string;
}) {
  const id = useId();
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <label htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          const names = Array.from(e.dataTransfer.files).map((f) => f.name);
          if (names.length) onFiles([...files, ...names]);
        }}
        className={cn("flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed py-7 cursor-pointer transition-all",
          drag ? "border-gold-500 bg-gold-50" : "border-inkline bg-cream-50/50 hover:border-gold-300 hover:bg-gold-50/40")}>
        <Upload size={22} className={drag ? "text-gold-600" : "text-charcoal-500"} />
        <span className="text-[13px] font-medium text-charcoal-700">{label}</span>
        <span className="text-[11.5px] text-charcoal-500">{hint ?? "JPG یا PNG — حداکثر ۵ مگابایت"}</span>
        <input id={id} type="file" className="sr-only" multiple accept="image/*,.pdf"
          onChange={(e) => {
            const names = Array.from(e.target.files ?? []).map((f) => f.name);
            if (names.length) onFiles([...files, ...names]);
          }} />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11.5px] bg-gold-50 border border-gold-100 rounded-full px-2.5 py-1 text-charcoal-700">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />{f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================ Page scaffolding ================================ */
export function PageHead({ title, subtitle, actions, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-[21px] font-black text-charcoal-900 flex items-center gap-2">
          {back && <button onClick={() => history.back()} className="text-charcoal-500 hover:text-charcoal-900" aria-label="بازگشت"><ChevronEnd size={18} /></button>}
          {title}
        </h1>
        {subtitle && <p className="text-[12.5px] text-charcoal-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  return <div className={cn("bg-cream-0 border border-inkline rounded-card", pad && "p-4 sm:p-5", className)}>{children}</div>;
}
