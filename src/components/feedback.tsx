import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X, Clock, ShieldOff, RotateCcw } from "./icons";
import { cn } from "../lib";

/* ================================ Toasts ================================ */
export type ToastKind = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; kind: ToastKind; message: string }

const ToastCtx = createContext<{ toast: (message: string, kind?: ToastKind) => void } | null>(null);

export function useToast() {
  const v = useContext(ToastCtx);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v.toast;
}

const toastIcons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={17} className="text-success" />,
  error: <XCircle size={17} className="text-danger" />,
  info: <Info size={17} className="text-info" />,
  warning: <AlertTriangle size={17} className="text-warning" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l.slice(-3), { id, kind, message }]);
    window.setTimeout(() => remove(id), 4200);
  }, [remove]);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 inset-x-0 z-[120] flex flex-col items-center gap-2 px-4 pointer-events-none" dir="rtl">
        {items.map((t) => (
          <div key={t.id} role="status"
            className="pointer-events-auto flex items-center gap-2.5 bg-cream-0 border border-inkline rounded-card shadow-[var(--shadow-pop)] ps-3.5 pe-2 py-2.5 min-w-64 max-w-md anim-pop">
            {toastIcons[t.kind]}
            <p className="text-[13px] font-medium text-charcoal-900 flex-1 leading-5">{t.message}</p>
            <button onClick={() => remove(t.id)} aria-label="بستن پیام" className="p-1.5 rounded-md text-charcoal-500 hover:text-charcoal-900 hover:bg-cream-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ================================ Banner / Alert ================================ */
const bannerStyles = {
  info: "bg-info/8 border-info/20 text-info",
  warning: "bg-warning/8 border-warning/25 text-warning",
  danger: "bg-danger/8 border-danger/20 text-danger",
  stale: "bg-warning/10 border-warning/30 text-warning",
  halt: "bg-danger text-cream-0 border-danger",
  success: "bg-success/8 border-success/20 text-success",
} as const;

export function Banner({ kind = "info", children, className, onClose }: {
  kind?: keyof typeof bannerStyles; children: React.ReactNode; className?: string; onClose?: () => void;
}) {
  return (
    <div role={kind === "danger" || kind === "halt" ? "alert" : "status"}
      className={cn("flex items-center gap-2.5 rounded-card border px-4 py-3 text-[13px] font-medium leading-6", bannerStyles[kind], className)}>
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose} aria-label="بستن" className="opacity-70 hover:opacity-100"><X size={15} /></button>}
    </div>
  );
}

export function Alert({ kind = "info", title, children }: { kind?: "info" | "warning" | "danger" | "success"; title?: string; children?: React.ReactNode }) {
  const icons = { info: <Info size={16} />, warning: <AlertTriangle size={16} />, danger: <ShieldOff size={16} />, success: <CheckCircle2 size={16} /> };
  return (
    <div className={cn("rounded-card border p-3.5 flex gap-2.5 text-[13px] leading-6", bannerStyles[kind])}>
      <span className="mt-1 shrink-0">{icons[kind]}</span>
      <div>
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function StalePriceBanner({ seconds }: { seconds: number }) {
  return (
    <Banner kind="stale">
      <Clock size={15} className="inline -mt-0.5 me-1" />
      قیمت با تأخیر (<b className="tnum">{seconds.toLocaleString("fa-IR")} ثانیه</b>) — معامله با آخرین قیمت معتبر انجام می‌شود.
    </Banner>
  );
}

export function TradingHaltedBanner() {
  return (
    <Banner kind="halt">
      <ShieldOff size={15} className="inline -mt-0.5 me-1" />
      معاملات موقتاً متوقف است — ثبت سفارش خرید و فروش تا اطلاع ثانوی ممکن نیست.
    </Banner>
  );
}

/* ================================ Empty / Error ================================ */
export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-gold-500/15 blur-xl scale-150" aria-hidden />
        <div className="relative h-16 w-16 rounded-full bg-gold-50 border border-gold-100 grid place-items-center text-gold-600">
          {icon ?? <Info size={24} />}
        </div>
      </div>
      <h3 className="text-[15.5px] font-bold text-charcoal-900">{title}</h3>
      {body && <p className="text-[13px] text-charcoal-500 mt-1.5 max-w-sm leading-6">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-16 w-16 rounded-full bg-warning/10 border border-warning/25 grid place-items-center text-warning mb-4">
        <AlertTriangle size={24} />
      </div>
      <h3 className="text-[15px] font-bold text-charcoal-900">خطا در دریافت اطلاعات</h3>
      <p className="text-[13px] text-charcoal-500 mt-1.5">{message ?? "اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-[8px] border border-inkline bg-cream-0 text-[13px] font-medium hover:border-gold-500 hover:bg-gold-50 transition-colors focus-ring">
          <RotateCcw size={14} /> تلاش دوباره
        </button>
      )}
    </div>
  );
}
