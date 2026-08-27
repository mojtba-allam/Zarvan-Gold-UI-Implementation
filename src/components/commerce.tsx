import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Product, SpotPrice, TradeQuote, Wallet } from "../types";
import { pricingApi, IMG } from "../api";
import { cn, fa, formatIrr, formatMg, formatPct, useCountdown, countdownLabel, useLive } from "../lib";
import { Badge, Button, Modal, OtpInput, Skeleton } from "./ui";
import { StalePriceBanner, TradingHaltedBanner, useToast } from "./feedback";
import { Sparkline, GOLD } from "./charts";
import { ShoppingCart, TrendingUp, TrendingDown, BarChart3, Zap, Gift, Landmark } from "./icons";
import { useApp } from "../auth";

/* ================================ LivePriceTicker ================================ */
export function LivePriceTicker() {
  const [spots, setSpots] = useState<SpotPrice[] | null>(null);
  const [spark18, setSpark18] = useState<number[]>([]);
  const [spark24, setSpark24] = useState<number[]>([]);
  const navigate = useNavigate();
  const { user } = useApp();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, h18, h24] = await Promise.all([pricingApi.spot(), pricingApi.history("1D", 18), pricingApi.history("1D", 24)]);
        if (!alive) return;
        setSpots(s);
        setSpark18(h18.slice(-24).map((p) => p.price_irr));
        setSpark24(h24.slice(-24).map((p) => p.price_irr));
      } catch { /* offline */ }
    };
    load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const p18 = useLive(spots?.[0]?.price_irr_per_gram ?? 0, 3200);
  const p24 = useLive(spots?.[1]?.price_irr_per_gram ?? 0, 3200);
  const halt = spots?.[0]?.trading_halt;
  const stale = (spots?.[0]?.stale_seconds ?? 0) > 30;

  return (
    <div className="bg-charcoal-900 text-cream-0 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, #C9A227 0 1px, transparent 1px 14px)" }} />
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gold-500 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-500 live-dot" />
          قیمت لحظه‌ای
        </span>

        {halt ? (
          <span className="text-[12.5px] font-bold text-danger flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> معاملات متوقف است
          </span>
        ) : stale ? (
          <span className="text-[12px] font-semibold text-warning flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-warning live-dot" /> تأخیر در قیمت ({fa(spots?.[0]?.stale_seconds ?? 0)} ثانیه)
          </span>
        ) : (
          <>
            <TickerItem label="۱۸ عیار" price={p18} change={spots?.[0]?.change_pct_24h} spark={spark18}
              bid={spots?.[0]?.bid_irr} ask={spots?.[0]?.ask_irr} ready={!!spots} />
            <span className="h-6 w-px bg-cream-0/15 shrink-0" />
            <TickerItem label="۲۴ عیار" price={p24} change={spots?.[1]?.change_pct_24h} spark={spark24}
              bid={spots?.[1]?.bid_irr} ask={spots?.[1]?.ask_irr} ready={!!spots} />
          </>
        )}

        <div className="ms-auto flex items-center gap-2 shrink-0">
          <button onClick={() => navigate("/prices")}
            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium text-cream-0/80 hover:text-gold-500 transition-colors px-2 py-1.5 rounded focus-ring">
            <BarChart3 size={14} /> نمودار
          </button>
          <button onClick={() => navigate(user ? "/app/trade" : "/login")}
            className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-[8px] bg-gold-500 text-charcoal-900 text-[12px] font-bold hover:bg-gold-600 hover:text-cream-0 transition-colors focus-ring active:scale-95">
            <Zap size={13} /> معامله سریع
          </button>
        </div>
      </div>
    </div>
  );
}

function TickerItem({ label, price, change, spark, bid, ask, ready }: {
  label: string; price: number; change?: number; spark: number[]; bid?: number; ask?: number; ready: boolean;
}) {
  const [flash, setFlash] = useState(false);
  const prev = React.useRef(price);
  useEffect(() => {
    if (price !== prev.current && price > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      prev.current = price;
      return () => clearTimeout(t);
    }
  }, [price]);
  if (!ready) return <Skeleton className="h-6 w-40 bg-cream-0/10" />;
  const up = (change ?? 0) >= 0;
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap">
      <span className="text-[11.5px] text-cream-0/60 font-medium">{label}</span>
      <span key={flash ? "f" : "s"} className={cn("text-[15px] font-bold tnum", flash && "anim-tick")}>{formatIrr(Math.round(price))}</span>
      <span className="text-[10.5px] text-cream-0/50">ریال/گرم</span>
      <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-bold tnum", up ? "text-gold-500" : "text-danger")}>
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{formatPct(change)}
      </span>
      {spark.length > 2 && <span className="hidden md:block w-16"><Sparkline data={spark} height={20} color={up ? GOLD : "#9B2C2C"} /></span>}
      <span className="hidden lg:flex items-center gap-1 text-[10.5px]">
        <span className="rounded-full bg-success/15 text-success px-2 py-0.5 font-semibold tnum" title="خرید ما از شما (Bid)">فروش به ما {formatIrr(bid)}</span>
        <span className="rounded-full bg-gold-500/15 text-gold-500 px-2 py-0.5 font-semibold tnum" title="فروش ما به شما (Ask)">خرید از ما {formatIrr(ask)}</span>
      </span>
    </div>
  );
}

/* ================================ ProductCard ================================ */
export function ProductCard({ product }: { product: Product }) {
  const toast = useToast();
  const { user, refreshCart } = useApp();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const oos = product.status === "out_of_stock";
  const isBullion = product.type === "bar" || product.type === "coin";

  const add = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    setAdding(true);
    try {
      const { orderApi } = await import("../api");
      await orderApi.addLine(Number(product.id), 1);
      await refreshCart();
      toast("افزوده شد به سبد");
    } catch { toast("خطا در افزودن به سبد", "error"); }
    finally { setAdding(false); }
  };

  return (
    <Link to={`/catalog/${product.slug}`}
      className="group bg-cream-0 border border-inkline rounded-card overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] hover:border-gold-300/70 flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-100">
        <img src={product.images[0] ?? IMG.hero} alt={product.name} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
        <div className="absolute top-2.5 start-2.5 flex gap-1.5">
          <span className="bg-charcoal-900/85 text-cream-0 text-[10.5px] font-bold rounded-full px-2 py-0.5 backdrop-blur-sm">{fa(product.karat)} عیار</span>
          {product.has_360 && <span className="bg-gold-500/90 text-charcoal-900 text-[10.5px] font-bold rounded-full px-2 py-0.5">۳۶۰°</span>}
        </div>
        {oos && (
          <div className="absolute inset-0 bg-cream-50/70 backdrop-blur-[1.5px] grid place-items-center">
            <span className="bg-charcoal-900 text-cream-0 text-[11.5px] font-bold rounded-full px-3 py-1">اتمام موجودی</span>
          </div>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13.5px] font-bold text-charcoal-900 leading-5 group-hover:text-gold-700 transition-colors">{product.name}</h3>
          <span className="text-[10.5px] text-charcoal-500 font-mono shrink-0 mt-0.5" dir="ltr">{product.sku}</span>
        </div>
        <p className="text-[11.5px] text-charcoal-500 tnum">{formatMg(product.weight_mg)}{product.occasion ? ` · ${product.occasion}` : ""}</p>
        <div className="mt-auto pt-2.5 flex items-end justify-between gap-2">
          <div>
            {isBullion && product.bid_irr && product.ask_irr ? (
              <div className="text-[11px] tnum space-y-0.5">
                <p className="text-success font-semibold">خرید {formatIrr(product.bid_irr)}</p>
                <p className="text-charcoal-900 font-bold">فروش {formatIrr(product.ask_irr)}</p>
              </div>
            ) : (
              <>
                <p className="text-[14.5px] font-extrabold text-charcoal-900 tnum">{formatIrr(product.quote_irr)}</p>
                <p className="text-[10.5px] text-charcoal-500">ریال · با اجرت</p>
              </>
            )}
          </div>
          <button onClick={add} disabled={oos || adding} aria-label={`افزودن ${product.name} به سبد`}
            className="h-9.5 w-9.5 rounded-[8px] border border-inkline grid place-items-center text-charcoal-700 transition-all hover:bg-gold-500 hover:border-gold-500 hover:text-charcoal-900 active:scale-90 disabled:opacity-40 disabled:pointer-events-none focus-ring">
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
}

/* ================================ PriceQuoteBox ================================ */
export function PriceQuoteBox({ quote, onExpired }: { quote: TradeQuote; onExpired?: () => void }) {
  const { ms, expired } = useCountdown(quote.expires_at);
  const pct = Math.max(0, Math.min(100, (ms / 18000) * 100));
  useEffect(() => { if (expired) onExpired?.(); /* eslint-disable-next-line */ }, [expired]);
  const side = quote.side;
  return (
    <div className={cn("rounded-card border-2 p-4 transition-colors", expired ? "border-danger/40 bg-danger/5" : "border-gold-500/50 bg-gold-50/60")}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12.5px] font-bold text-charcoal-900 flex items-center gap-1.5">
          <Zap size={13} className="text-gold-600" />
          پیش‌فاکتور {side === "buy" ? "خرید" : "فروش"}
        </p>
        <span className={cn("text-[13px] font-black tnum px-2.5 py-1 rounded-md", expired ? "bg-danger/10 text-danger" : ms < 5000 ? "bg-warning/15 text-warning" : "bg-charcoal-900 text-cream-0")}>
          {expired ? "منقضی شد" : countdownLabel(ms)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-inkline overflow-hidden mb-3">
        <div className={cn("h-full rounded-full transition-all duration-300", expired ? "bg-danger" : ms < 5000 ? "bg-warning" : "bg-gold-500")} style={{ width: `${pct}%` }} />
      </div>
      <dl className="space-y-2 text-[12.5px]">
        <div className="flex justify-between"><dt className="text-charcoal-500">وزن</dt><dd className="font-bold tnum">{formatMg(quote.weight_mg)}</dd></div>
        <div className="flex justify-between"><dt className="text-charcoal-500">نرخ پایه (هر گرم)</dt><dd className="font-semibold tnum">{formatIrr(quote.spot_irr)}</dd></div>
        <div className="flex justify-between"><dt className="text-charcoal-500">اسپرد ({fa(quote.spread_bps)} واحد)</dt><dd className="font-semibold tnum">{formatIrr(Math.abs(quote.irr_amount - Math.round((quote.weight_mg / 1000) * quote.spot_irr)))}</dd></div>
        <div className="flex justify-between items-center border-t border-gold-200 pt-2.5 mt-1">
          <dt className="font-bold text-charcoal-900">{side === "buy" ? "مبلغ قابل پرداخت" : "مبلغ دریافتی"}</dt>
          <dd className="text-[16.5px] font-black text-gold-700 tnum">{formatIrr(quote.irr_amount)} <span className="text-[10.5px] font-medium text-charcoal-500">ریال</span></dd>
        </div>
      </dl>
    </div>
  );
}

/* ================================ WalletCard ================================ */
export function WalletCard({ wallet, accent }: { wallet: Wallet; accent?: "gold" | "ink" }) {
  const isGold = wallet.currency === "gold_mg";
  return (
    <div className={cn("relative overflow-hidden rounded-card border p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
      accent === "gold" || isGold ? "bg-charcoal-900 border-charcoal-800 text-cream-0" : "bg-cream-0 border-inkline")}>
      <svg viewBox="0 0 80 48" className={cn("absolute -bottom-3 -start-2 w-24 opacity-[0.13]", isGold ? "text-gold-500" : "text-charcoal-900")} aria-hidden>
        <path d="M18 6h44l12 36H6z" fill="currentColor" />
      </svg>
      <div className="flex items-center justify-between mb-3">
        <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", isGold ? "text-gold-500" : "text-charcoal-500")}>
          {isGold ? <Landmark size={14} /> : "کیف پول"} {isGold ? "طلای ۱۸ عیار" : "ریال"}
        </span>
        {isGold && <Badge status="gold">خزانه امن</Badge>}
      </div>
      <p className={cn("text-[24px] font-black tnum leading-8", isGold ? "text-cream-0" : "text-charcoal-900")}>
        {formatIrr(wallet.balance)}
        <span className="text-[12px] font-medium ms-1.5 opacity-70">{isGold ? "mg" : "ریال"}</span>
      </p>
      {isGold && <p className="text-[11.5px] text-cream-0/50 mt-1 tnum">معادل {formatIrr(Math.round(wallet.balance / 1000 * 3_520_000))} ریال</p>}
    </div>
  );
}

/* ================================ OtpStepUpModal ================================ */
export function OtpStepUpModal({ open, onClose, onVerify, title, mobile }: {
  open: boolean; onClose: () => void; onVerify: (code: string) => Promise<void> | void; title?: string; mobile?: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(59);
  useEffect(() => {
    if (!open) return;
    setCode(""); setError(""); setResendIn(59);
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title ?? "کد تأیید عملیات"} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button loading={busy} disabled={code.length < 6} onClick={async () => {
            setBusy(true); setError("");
            try { await onVerify(code); } catch (e) { setError(e instanceof Error ? e.message : "کد نامعتبر است"); }
            finally { setBusy(false); }
          }}>تأیید کد</Button>
        </>
      }>
      <div className="text-center">
        <p className="text-[13px] text-charcoal-700 leading-6 mb-4">
          برای امنیت حساب، کد ۶ رقمی ارسال‌شده به <b className="tnum" dir="ltr">{mobile ?? "شماره شما"}</b> را وارد کنید.
        </p>
        <OtpInput value={code} onChange={setCode} error={error} />
        <button disabled={resendIn > 0} onClick={() => setResendIn(59)}
          className="mt-4 text-[12.5px] font-medium text-gold-700 hover:text-gold-600 disabled:text-charcoal-500/60 transition-colors">
          {resendIn > 0 ? `ارسال دوباره کد (${fa(resendIn)} ثانیه)` : "ارسال دوباره کد"}
        </button>
        <p className="mt-3 text-[11px] text-charcoal-500">کد آزمایشی: هر ۶ رقم غیر از ۰۰۰۰۰۰</p>
      </div>
    </Modal>
  );
}

/* ================================ PackagingPicker ================================ */
export function PackagingPicker({ value, onChange }: { value: "standard" | "luxury"; onChange: (v: "standard" | "luxury") => void }) {
  const opts = useMemo(() => ([
    { key: "standard" as const, title: "بسته‌بندی استاندارد", desc: "جعبه کرافت با پلمپ امنیتی", price: 0, icon: <Gift size={17} /> },
    { key: "luxury" as const, title: "بسته‌بندی لوکس", desc: "جعبه مخمل، روبان و کارت تبریک", price: 1_500_000, icon: <Gift size={17} className="text-gold-600" /> },
  ]), []);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {opts.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)}
          className={cn("text-start rounded-card border-2 p-3.5 transition-all focus-ring",
            value === o.key ? "border-gold-500 bg-gold-50/70 shadow-[var(--shadow-card)]" : "border-inkline bg-cream-0 hover:border-gold-300")}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-bold text-charcoal-900">{o.icon}{o.title}</span>
            <span className={cn("h-4.5 w-4.5 rounded-full border-2 grid place-items-center", value === o.key ? "border-gold-500 bg-gold-500" : "border-inkline")}>
              {value === o.key && <span className="h-1.5 w-1.5 rounded-full bg-charcoal-900" />}
            </span>
          </div>
          <p className="text-[11.5px] text-charcoal-500 mt-1">{o.desc}</p>
          <p className="text-[12px] font-bold tnum mt-1.5">{o.price ? `${formatIrr(o.price)} ریال` : "رایگان"}</p>
        </button>
      ))}
    </div>
  );
}
