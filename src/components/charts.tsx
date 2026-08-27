import React, { useState } from "react";
import {
  ResponsiveContainer, AreaChart as RAreaChart, Area, LineChart as RLineChart, Line,
  BarChart as RBarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Skeleton } from "./ui";
import { EmptyState, ErrorState } from "./feedback";
import { Table2, ChevronDown } from "./icons";
import { cn, fa, jalaliDate, formatIrr } from "../lib";
import type { SeriesPoint } from "../types";

export const GOLD = "#C9A227";
export const GOLD_DARK = "#A68516";
export const CHARCOAL = "#3F3A34";
export const CREAM = "#E8CE7E";

function TipContent({ active, payload, label, unit }: { active?: boolean; payload?: Array<{ value: number; dataKey?: string }>; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="bg-cream-0 border border-inkline rounded-lg shadow-[var(--shadow-pop)] px-3 py-2 text-[12px]">
      {label && <p className="text-charcoal-500 mb-1 tnum">{jalaliDate(String(label))}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-charcoal-900 tnum">
          {unit === "irr" ? formatIrr(p.value) : fa(p.value.toLocaleString("en-US"))}{unit === "mg" ? " mg" : unit === "irr" ? " ریال" : ""}
        </p>
      ))}
    </div>
  );
}

const fmtAxis = (v: number) => {
  if (v >= 1_000_000_000) return fa((v / 1_000_000_000).toFixed(1)) + "B";
  if (v >= 1_000_000) return fa((v / 1_000_000).toFixed(1)) + "M";
  if (v >= 1_000) return fa((v / 1_000).toFixed(0)) + "k";
  return fa(v);
};
const tickDate = (iso: string) => {
  const d = new Date(iso);
  return fa(`${d.getMonth() + 1}/${d.getDate()}`);
};

export function ChartCard({ title, subtitle, actions, loading, empty, error, onRetry, data, unit, height = 240, children, emptyTitle = "هنوز داده‌ای نیست" }: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode;
  loading?: boolean; empty?: boolean; error?: string | null; onRetry?: () => void;
  data?: { t: string; value: number }[]; unit?: "irr" | "mg" | "raw";
  height?: number; children: React.ReactNode; emptyTitle?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="bg-cream-0 border border-inkline rounded-card p-4 sm:p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
      {(title || actions) && (
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            {title && <h3 className="text-[14px] font-bold text-charcoal-900">{title}</h3>}
            {subtitle && <p className="text-[11.5px] text-charcoal-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {data && data.length > 0 && !loading && (
              <button onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}
                className="inline-flex items-center gap-1 text-[11.5px] text-charcoal-500 hover:text-gold-700 transition-colors focus-ring rounded px-1.5 py-1">
                <Table2 size={13} /> داده جدولی <ChevronDown size={12} className={cn("transition-transform", showTable && "rotate-180")} />
              </button>
            )}
          </div>
        </div>
      )}
      {loading ? (
        <div className="space-y-2.5" style={{ height }}>
          <Skeleton className="h-3/4 w-full" />
          <div className="flex gap-2"><Skeleton className="h-6 flex-1" /><Skeleton className="h-6 flex-1" /><Skeleton className="h-6 flex-1" /></div>
        </div>
      ) : error ? (
        <div style={{ minHeight: height }}><ErrorState message={error} onRetry={onRetry} /></div>
      ) : empty ? (
        <div style={{ minHeight: height }} className="grid place-items-center"><EmptyState title={emptyTitle} body="به‌محض ثبت داده، نمودار اینجا رسم می‌شود." /></div>
      ) : (
        <>
          <div style={{ height }} dir="ltr">{children}</div>
          {showTable && data && (
            <div className="mt-3 max-h-44 overflow-y-auto border border-inkline rounded-lg" dir="rtl">
              <table className="w-full text-[12px]">
                <thead className="bg-cream-50 text-charcoal-500"><tr><th className="px-3 py-2 text-start font-medium">تاریخ</th><th className="px-3 py-2 text-end font-medium">مقدار</th></tr></thead>
                <tbody className="divide-y divide-inkline/60">
                  {data.slice(-12).map((d) => (
                    <tr key={d.t}><td className="px-3 py-1.5 tnum text-charcoal-700">{jalaliDate(d.t)}</td>
                      <td className="px-3 py-1.5 text-end tnum font-semibold">{unit === "irr" ? formatIrr(d.value) : fa(d.value.toLocaleString("en-US"))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Pt = SeriesPoint | { t: string; [k: string]: string | number };

export function GoldAreaChart({ data, data2, loading, error, onRetry, unit = "irr", height = 240, title, actions }: {
  data: Pt[]; data2?: Pt[]; loading?: boolean; error?: string | null; onRetry?: () => void; unit?: "irr" | "mg" | "raw"; height?: number; title?: React.ReactNode; actions?: React.ReactNode;
}) {
  const empty = !loading && !error && data.length === 0;
  const merged = data.map((d, i) => ({ t: d.t, v1: d.value ?? 0, v2: data2?.[i]?.value ?? null }));
  return (
    <ChartCard title={title} actions={actions} loading={loading} empty={empty} error={error} onRetry={onRetry} data={data as SeriesPoint[]} unit={unit} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={merged} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.12} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EDE6D6" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="t" tickFormatter={tickDate} tick={{ fontSize: 10.5, fill: "#6B645C", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={{ stroke: "#E6DFD0" }} minTickGap={38} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10.5, fill: "#6B645C", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} tickCount={5} />
          <Tooltip content={<TipContent unit={unit} />} />
          <Area type="monotone" dataKey="v1" stroke={GOLD} strokeWidth={2} fill="url(#goldFill)" dot={false} activeDot={{ r: 4, fill: GOLD, stroke: "#FFFDF8", strokeWidth: 2 }} />
          {data2 && <Line type="monotone" dataKey="v2" stroke={CHARCOAL} strokeWidth={1.6} strokeDasharray="5 4" dot={false} />}
        </RAreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GoldLineChart(props: { data: Pt[]; loading?: boolean; error?: string | null; onRetry?: () => void; unit?: "irr" | "mg" | "raw"; height?: number; title?: React.ReactNode; actions?: React.ReactNode }) {
  const { data, loading, error, onRetry, unit = "raw", height = 240, title, actions } = props;
  const empty = !loading && !error && data.length === 0;
  return (
    <ChartCard title={title} actions={actions} loading={loading} empty={empty} error={error} onRetry={onRetry} data={data as SeriesPoint[]} unit={unit} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={data.map((d) => ({ t: d.t, v1: d.value ?? 0 }))} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#EDE6D6" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="t" tickFormatter={tickDate} tick={{ fontSize: 10.5, fill: "#6B645C", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={{ stroke: "#E6DFD0" }} minTickGap={38} />
          <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10.5, fill: "#6B645C", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} tickCount={5} />
          <Tooltip content={<TipContent unit={unit} />} />
          <Line type="monotone" dataKey="v1" stroke={GOLD} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: GOLD, stroke: "#FFFDF8", strokeWidth: 2 }} />
        </RLineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GoldBarChart({ data, loading, error, onRetry, unit = "irr", height = 240, title, horizontal }: {
  data: Pt[]; loading?: boolean; error?: string | null; onRetry?: () => void; unit?: "irr" | "mg" | "raw"; height?: number; title?: React.ReactNode; horizontal?: boolean;
}) {
  const empty = !loading && !error && data.length === 0;
  return (
    <ChartCard title={title} loading={loading} empty={empty} error={error} onRetry={onRetry} data={data as SeriesPoint[]} unit={unit} height={height}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data.map((d) => ({ t: d.t, v1: d.value ?? 0 }))} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#EDE6D6" strokeDasharray="4 4" vertical={!!horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={fmtAxis} tick={{ fontSize: 10.5, fill: "#6B645C", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={false} tickCount={4} />
              <YAxis type="category" dataKey="t" width={86} tick={{ fontSize: 10.5, fill: "#3F3A34", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey="t" tickFormatter={tickDate} tick={{ fontSize: 10.5, fill: "#6B645C", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={{ stroke: "#E6DFD0" }} minTickGap={30} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10.5, fill: "#6B645C", fontFamily: "Vazirmatn" }} tickLine={false} axisLine={false} width={44} tickCount={5} />
            </>
          )}
          <Tooltip content={<TipContent unit={unit} />} cursor={{ fill: "rgba(201,162,39,0.07)" }} />
          <Bar dataKey="v1" fill={GOLD} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={18} />
        </RBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DonutChartX({ data, centerLabel, centerValue, loading, error, onRetry, title, height = 240 }: {
  data: { label: string; value: number }[]; centerLabel?: string; centerValue?: React.ReactNode;
  loading?: boolean; error?: string | null; onRetry?: () => void; title?: React.ReactNode; height?: number;
}) {
  const empty = !loading && !error && data.length === 0;
  const colors = [GOLD, CHARCOAL, "#D9CBA8", "#8C7B45", CREAM, "#B45309"];
  return (
    <ChartCard title={title} loading={loading} empty={empty} error={error} onRetry={onRetry} height={height}>
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0] as { name?: string; value?: number };
              return <div dir="rtl" className="bg-cream-0 border border-inkline rounded-lg shadow px-3 py-1.5 text-[12px] font-bold tnum">{p.name}: {fa((p.value ?? 0).toLocaleString("en-US"))}</div>;
            }} />
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-[17px] font-extrabold tnum text-charcoal-900">{centerValue}</p>
            {centerLabel && <p className="text-[10.5px] text-charcoal-500">{centerLabel}</p>}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export function Sparkline({ data, color = GOLD, height = 36, id }: { data: number[]; color?: string; height?: number; id?: string }) {
  const gid = "spark" + (id ?? Math.abs(data[0] ?? 1));
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 88 - 6}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height, width: "100%" }} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${pts} 100,100`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FunnelChart({ steps, loading, error, onRetry, title }: {
  steps: { label: string; count: number; key?: string }[]; loading?: boolean; error?: string | null; onRetry?: () => void; title?: React.ReactNode;
}) {
  const empty = !loading && !error && steps.length === 0;
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <ChartCard title={title} loading={loading} empty={empty} error={error} onRetry={onRetry} height={steps.length * 46 + 20}>
      <div dir="rtl" className="space-y-2.5 py-1">
        {steps.map((s, i) => (
          <div key={s.key ?? i} className="flex items-center gap-3">
            <span className="w-28 text-[11.5px] text-charcoal-700 font-medium text-start shrink-0">{s.label}</span>
            <div className="flex-1 h-7 bg-cream-100/70 rounded-md overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-700 ease-out"
                style={{ width: `${Math.max(6, (s.count / max) * 100)}%`, background: `linear-gradient(90deg, ${GOLD}, ${i % 2 ? "#B08D1F" : GOLD_DARK})` }} />
            </div>
            <span className="w-12 text-end text-[12px] font-bold tnum text-charcoal-900">{fa(s.count.toLocaleString("en-US"))}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export function GaugeChart({ pct, label, sub, loading, error, onRetry, title }: {
  pct: number; label?: string; sub?: string; loading?: boolean; error?: string | null; onRetry?: () => void; title?: React.ReactNode;
}) {
  const empty = false;
  const angle = (Math.min(pct, 100) / 100) * 180;
  const rad = (a: number) => ((180 - a) * Math.PI) / 180;
  const x = 100 + 78 * Math.cos(rad(angle));
  const y = 100 - 78 * Math.sin(rad(angle));
  return (
    <ChartCard title={title} loading={loading} empty={empty} error={error} onRetry={onRetry} height={190}>
      <div className="flex flex-col items-center justify-center h-full">
        <svg viewBox="0 0 200 115" className="w-52" aria-hidden>
          <path d="M 22 100 A 78 78 0 0 1 178 100" fill="none" stroke="#EDE6D6" strokeWidth="14" strokeLinecap="round" />
          <path d={`M 22 100 A 78 78 0 0 1 ${x} ${y}`} fill="none" stroke={pct < 90 ? "#B45309" : GOLD} strokeWidth="14" strokeLinecap="round" />
          <circle cx={x} cy={y} r="5" fill="#1A1714" stroke="#FFFDF8" strokeWidth="2.5" />
        </svg>
        <p className="text-[24px] font-black tnum text-charcoal-900 -mt-1">{fa(pct.toLocaleString("en-US"))}٪</p>
        {label && <p className="text-[12px] font-medium text-charcoal-700">{label}</p>}
        {sub && <p className="text-[11px] text-charcoal-500 tnum" dir="ltr">{sub}</p>}
      </div>
    </ChartCard>
  );
}
