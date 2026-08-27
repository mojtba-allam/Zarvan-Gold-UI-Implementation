import { useCallback, useEffect, useRef, useState } from "react";

/* ---------------- class names ---------------- */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------- Persian digits & number formats ---------------- */
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export function fa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]).replace(/,/g, "٬").replace(/\./g, "٫");
}
export function faNum(n: number | string): string {
  return fa(String(n));
}
/** 23284000 → «۲۳٬۲۸۴٬۰۰۰» */
export function formatIrr(n: number | null | undefined, withUnit = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const s = Math.abs(Math.round(n)).toLocaleString("en-US");
  return sign + fa(s) + (withUnit ? " ریال" : "");
}
/** compact: 1854000000 → «۱٫۸۵ میلیارد» */
export function formatIrrCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return fa((n / 1_000_000_000).toFixed(2)) + " میلیارد ریال";
  if (abs >= 1_000_000) return fa((n / 1_000_000).toFixed(1)) + " میلیون ریال";
  return formatIrr(n) + " ریال";
}
/** mg → «۱۲٬۴۵۰ میلی‌گرم» or grams «۴٫۲ گرم» */
export function formatMg(mg: number | null | undefined): string {
  if (mg === null || mg === undefined || Number.isNaN(mg)) return "—";
  if (mg >= 1000) return fa((mg / 1000).toFixed(mg % 1000 === 0 ? 0 : 2)) + " گرم";
  return fa(mg) + " میلی‌گرم";
}
export function formatMgRaw(mg: number): string {
  return fa(mg.toLocaleString("en-US")) + " mg";
}
export function formatPct(p: number | null | undefined, signed = true): string {
  if (p === null || p === undefined || Number.isNaN(p)) return "—";
  const s = p > 0 && signed ? "+" : "";
  return s + fa(p.toFixed(1).replace(".", ".")) + "٪";
}
export function maskMobile(m: string): string {
  return m.length >= 10 ? m.slice(0, 4) + "•••" + m.slice(-3) : m;
}

/* ---------------- Jalali calendar ---------------- */
export function toJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let jm: number, jd: number;
  if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
  else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
  return { jy, jm, jd };
}
const J_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export function jalaliDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const { jy, jm, jd } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return fa(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}
export function jalaliLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const { jy, jm, jd } = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return fa(jd) + " " + J_MONTHS[jm - 1] + " " + fa(jy);
}
export function timeHHMM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return fa(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
}
export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "همین حالا";
  if (m < 60) return fa(m) + " دقیقه پیش";
  const h = Math.floor(m / 60);
  if (h < 24) return fa(h) + " ساعت پیش";
  const d = Math.floor(h / 24);
  return fa(d) + " روز پیش";
}
export function countdownLabel(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return fa(`0:${String(s).padStart(2, "0")}`);
}

/* ---------------- misc ---------------- */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

/* deterministic pseudo-random for chart series */
export function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- hooks ---------------- */
export interface PageData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  setData: (fn: (prev: T | null) => T | null) => void;
}
export function usePageData<T>(fn: () => Promise<T>, deps: unknown[] = []): PageData<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fnRef.current()
      .then((d) => { if (alive) { setDataState(d); setLoading(false); } })
      .catch((e: unknown) => { if (alive) { setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات"); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const retry = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((fn2: (prev: T | null) => T | null) => setDataState((p) => fn2(p)), []);
  return { data, loading, error, retry, setData };
}

/** countdown to an ISO expiry; returns remaining ms and expired flag */
export function useCountdown(expiresAt: string | null | undefined): { ms: number; expired: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return { ms: 0, expired: true };
  const ms = new Date(expiresAt).getTime() - now;
  return { ms, expired: ms <= 0 };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/** live ticking value for the price ticker */
export function useLive(base: number, intervalMs = 3000, jitterPct = 0.0012): number {
  const [val, setVal] = useState(base);
  useEffect(() => {
    setVal(base);
    const id = setInterval(() => {
      setVal((v) => v * (1 + (Math.random() - 0.5) * 2 * jitterPct));
    }, intervalMs);
    return () => clearInterval(id);
  }, [base, intervalMs, jitterPct]);
  return val;
}
