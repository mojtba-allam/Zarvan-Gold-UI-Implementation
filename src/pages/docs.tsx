/**
 * DocsPage — مرکز مستندات توسعه زرون گلد
 * مرجع بصری کامل API + ERD + نگاشت UI↔API + حسابرسی پوشش
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ALL_MODULES, ROLE_LABEL } from "../docs/spec-b";
import type { DocModule, DocMethod, Endpoint } from "../docs/spec-a";
import { TABLES, RELATIONS, TABLE_GROUPS, type Table as DbTable } from "../docs/schema";
import {
  ENVELOPE_OK, ENVELOPE_LIST, ENVELOPE_ERR, ERROR_CODES, ROLES_MATRIX, RATE_LIMITS,
  UPLOADS, AUTH_FLOW, BG_JOBS, MAPPING, AUDIT,
} from "../docs/meta";
import { copyText, fa } from "../lib";
import { useToast } from "../components/feedback";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Copy, Database, GitBranch,
  KeyRound, Layers, ListChecks, Lock, RefreshCw, Search, Server, ShieldCheck,
  Terminal, Upload, Webhook, Zap,
} from "../components/icons";

/* ------------------------------ helpers ------------------------------ */

const METHOD_STYLE: Record<DocMethod, string> = {
  GET: "bg-success/15 text-[#7fc79f] border-success/40",
  POST: "bg-gold-500/15 text-gold-300 border-gold-500/40",
  PUT: "bg-warning/15 text-[#e8a45c] border-warning/40",
  PATCH: "bg-warning/15 text-[#e8a45c] border-warning/40",
  DELETE: "bg-danger/15 text-[#e08a8a] border-danger/40",
};
const ROLE_STYLE: Record<string, string> = {
  public: "bg-cream-0/10 text-cream-0/80 border-cream-0/20",
  customer: "bg-gold-500/15 text-gold-300 border-gold-500/40",
  dealer: "bg-info/20 text-[#8fb8d4] border-info/50",
  staff: "bg-success/15 text-[#7fc79f] border-success/40",
  admin: "bg-danger/15 text-[#e08a8a] border-danger/40",
};

function MethodBadge({ m, sm }: { m: DocMethod; sm?: boolean }) {
  return (
    <span dir="ltr" className={`inline-grid place-items-center rounded-md border font-mono font-bold ${sm ? "text-[9.5px] px-1.5 py-0.5 min-w-[44px]" : "text-[11px] px-2 py-1 min-w-[56px]"} ${METHOD_STYLE[m]}`}>
      {m}
    </span>
  );
}
function RoleChip({ r, sm }: { r: string; sm?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${sm ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-0.5"} ${ROLE_STYLE[r] ?? ROLE_STYLE.public}`}>
      {r !== "public" && <Lock size={10} />}
      {ROLE_LABEL[r] ?? r}
    </span>
  );
}
function KeyBadge({ k }: { k?: string }) {
  if (!k) return null;
  const map: Record<string, string> = {
    PK: "bg-gold-500/20 text-gold-300 border-gold-500/50",
    FK: "bg-info/20 text-[#8fb8d4] border-info/50",
    UQ: "bg-success/15 text-[#7fc79f] border-success/40",
    IX: "bg-cream-0/10 text-cream-0/60 border-cream-0/20",
  };
  return <span className={`font-mono text-[9px] font-bold px-1 rounded border ${map[k]}`} dir="ltr">{k}</span>;
}

function highlight(src: string): string {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-gold-300">"$1"</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span class="text-[#b8d4a8]">"$1"</span>')
    .replace(/:\s*(-?\d[\d_,.]*)/g, ': <span class="text-[#e8c07c]">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="text-[#c792ea]">$1</span>');
}

function CodeBlock({ code, title, h = "max-h-80" }: { code: string; title?: string; h?: string }) {
  const toast = useToast();
  return (
    <div className="rounded-xl border border-cream-0/10 bg-[#0d0b08] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-cream-0/8 bg-cream-0/[0.03]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger/60" />
          <span className="h-2 w-2 rounded-full bg-warning/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
          {title && <span className="text-[10.5px] font-mono text-cream-0/40 ms-2" dir="ltr">{title}</span>}
        </div>
        <button
          onClick={async () => { const ok = await copyText(code); toast(ok ? "کپی شد" : "کپی ناموفق بود", ok ? "success" : "error"); }}
          className="inline-flex items-center gap-1 text-[10.5px] text-cream-0/50 hover:text-gold-300 transition-colors"
        >
          <Copy size={11} /> کپی
        </button>
      </div>
      <pre dir="ltr" className={`p-4 overflow-auto text-left font-mono text-[11.5px] leading-[1.75] text-cream-0/85 ${h}`}>
        <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
      </pre>
    </div>
  );
}

function Panel({ title, icon, children, className = "" }: { title?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-cream-0/10 bg-cream-0/[0.025] ${className}`}>
      {title && (
        <header className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-cream-0/8">
          {icon && <span className="text-gold-400">{icon}</span>}
          <h3 className="text-[14.5px] font-extrabold text-cream-0">{title}</h3>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ------------------------------ endpoint card ------------------------------ */

function EndpointCard({ ep, module, open, onToggle }: { ep: Endpoint; module: DocModule; open: boolean; onToggle: () => void }) {
  return (
    <article className={`rounded-xl border transition-all duration-200 overflow-hidden ${open ? "border-gold-500/40 bg-gold-500/[0.04] shadow-gold" : "border-cream-0/10 bg-cream-0/[0.02] hover:border-cream-0/25"}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-start focus-ring" aria-expanded={open}>
        <MethodBadge m={ep.method} />
        <span dir="ltr" className="font-mono text-[12.5px] text-cream-0/90 tracking-tight flex-1 truncate text-left">{ep.path}</span>
        <span className="hidden md:block text-[12px] text-cream-0/55 truncate max-w-[220px]">{ep.name}</span>
        <RoleChip r={ep.auth} sm />
        <ChevronDown size={16} className={`text-cream-0/40 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 anim-fade-up space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-bold text-gold-200">{ep.name}</span>
            <span className="text-[11px] text-cream-0/40 font-mono" dir="ltr">{module.code} · {ep.id}</span>
          </div>
          {ep.desc && <p className="text-[13px] leading-7 text-cream-0/70">{ep.desc}</p>}

          {ep.params && ep.params.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-cream-0/45 mb-2">پارامترها</p>
              <div className="overflow-x-auto rounded-lg border border-cream-0/10">
                <table className="w-full text-[12px]">
                  <thead className="bg-cream-0/[0.04] text-cream-0/50">
                    <tr>
                      <th className="px-3 py-2 text-start font-semibold">نام</th>
                      <th className="px-3 py-2 text-start font-semibold">محل</th>
                      <th className="px-3 py-2 text-start font-semibold">نوع</th>
                      <th className="px-3 py-2 text-start font-semibold">الزامی</th>
                      <th className="px-3 py-2 text-start font-semibold">توضیح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-0/6">
                    {ep.params.map((p) => (
                      <tr key={p.name} className="hover:bg-gold-500/[0.04] transition-colors">
                        <td className="px-3 py-2 font-mono text-gold-200" dir="ltr">{p.name}</td>
                        <td className="px-3 py-2 text-cream-0/60">{p.loc === "path" ? "مسیر" : p.loc === "query" ? "کوئری" : "هدر"}</td>
                        <td className="px-3 py-2 font-mono text-cream-0/60" dir="ltr">{p.type}</td>
                        <td className="px-3 py-2">{p.req ? <span className="text-danger text-[11px] font-bold">بله</span> : <span className="text-cream-0/40 text-[11px]">خیر</span>}</td>
                        <td className="px-3 py-2 text-cream-0/70">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={`grid gap-4 ${ep.body ? "lg:grid-cols-2" : ""}`}>
            {ep.body && <CodeBlock title="Request" code={ep.body} h="max-h-64" />}
            <CodeBlock title="Response 200" code={ep.res} h="max-h-64" />
          </div>

          {ep.rules && ep.rules.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-cream-0/45 mb-2">قواعد اعتبارسنجی و رفتار</p>
              <ul className="space-y-1.5">
                {ep.rules.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-cream-0/70 leading-6">
                    <span className="text-gold-400 mt-1 shrink-0"><Check size={13} /></span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ep.errors && ep.errors.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-cream-0/45 mb-2">خطاهای خاص</p>
              <div className="flex flex-wrap gap-2">
                {ep.errors.map((e) => (
                  <span key={e.code} className="inline-flex items-center gap-1.5 rounded-lg border border-danger/35 bg-danger/10 px-2.5 py-1.5 text-[11.5px] text-[#e0a0a0]">
                    <b className="font-mono" dir="ltr">{e.status}</b>
                    <code className="font-mono text-gold-200" dir="ltr">{e.code}</code>
                    <span className="text-cream-0/60">{e.desc}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-x-8 gap-y-3 pt-1">
            <div>
              <p className="text-[11px] font-bold text-cream-0/45 mb-1.5">جدول‌های درگیر</p>
              <div className="flex flex-wrap gap-1.5">
                {ep.tables.map((t) => (
                  <span key={t} className="font-mono text-[10.5px] px-2 py-0.5 rounded-md border border-info/40 bg-info/15 text-[#8fb8d4]" dir="ltr">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-cream-0/45 mb-1.5">صفحات UI</p>
              <div className="flex flex-wrap gap-1.5">
                {ep.ui.map((u) => (
                  <span key={u} className="text-[10.5px] px-2 py-0.5 rounded-md border border-cream-0/15 bg-cream-0/5 text-cream-0/65">{u}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* ------------------------------ tabs content ------------------------------ */

function OverviewTab() {
  const [errQ, setErrQ] = useState("");
  const codes = ERROR_CODES.filter((e) => !errQ || e.code.toLowerCase().includes(errQ.toLowerCase()) || e.fa.includes(errQ) || String(e.status).includes(errQ));
  const totalEp = ALL_MODULES.reduce((s, m) => s + m.endpoints.length, 0);

  return (
    <div className="space-y-6 anim-fade-up">
      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { v: fa(totalEp), l: "Endpoint", s: "در ۱۷ ماژول نقش‌محور", i: <Terminal size={16} /> },
          { v: fa(TABLES.length), l: "جدول MySQL", s: "۹ گروه + pivotها", i: <Database size={16} /> },
          { v: fa(RELATIONS.length), l: "رابطه", s: "1-1 / 1-N / N-M", i: <GitBranch size={16} /> },
          { v: fa(MAPPING.length), l: "نگاشت UI↔API", s: "تعامل‌های کلیدی", i: <Layers size={16} /> },
        ].map((k) => (
          <div key={k.l} className="group rounded-xl border border-cream-0/10 bg-cream-0/[0.025] px-4 py-4 hover:border-gold-500/40 hover:bg-gold-500/[0.04] transition-all duration-200">
            <div className="flex items-center justify-between text-gold-400/80 group-hover:text-gold-300 transition-colors">{k.i}<span className="text-[9.5px] font-mono text-cream-0/30">v1.0</span></div>
            <p className="text-[26px] font-black tnum text-cream-0 mt-2">{k.v}</p>
            <p className="text-[12px] font-bold text-gold-200">{k.l}</p>
            <p className="text-[10.5px] text-cream-0/45 mt-0.5">{k.s}</p>
          </div>
        ))}
      </div>

      {/* envelopes */}
      <Panel title="پاکت پاسخ استاندارد" icon={<BookOpen size={15} />}>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <CodeBlock title="200 — ApiSuccess<T>" code={ENVELOPE_OK} h="max-h-52" />
            <CodeBlock title="422 — ApiError" code={ENVELOPE_ERR} h="max-h-52" />
          </div>
          <CodeBlock title="200 — ApiList<T> با meta و links" code={ENVELOPE_LIST} h="max-h-56" />
          <ul className="text-[12px] text-cream-0/60 leading-6 list-disc ps-5 space-y-1">
            <li>Base URL: <code dir="ltr" className="font-mono text-gold-300 bg-gold-500/10 px-1.5 py-0.5 rounded">{'{VITE_API_URL}'}/api/v1</code> — هدر <code dir="ltr" className="font-mono text-gold-300">Authorization: Bearer …</code></li>
            <li>پول و وزن فقط <b className="text-cream-0/85">عدد صحیح</b>: ریال (IRR) و میلی‌گرم (mg). تاریخ‌ها ISO-8601 UTC.</li>
            <li>عملیات‌های حساس (پرداخت، وب‌هوک، broadcast) باید <b className="text-cream-0/85">idempotent</b> باشند — هدر <code dir="ltr" className="font-mono text-gold-300">Idempotency-Key</code>.</li>
            <li>محدودیت نرخ در هدرهای <code dir="ltr" className="font-mono text-gold-300">X-RateLimit-*</code>؛ خطای 429 با Retry-After.</li>
          </ul>
        </div>
      </Panel>

      {/* auth flow */}
      <Panel title="جریان احراز هویت (OTP-first)" icon={<KeyRound size={15} />}>
        <div className="grid md:grid-cols-5 gap-3">
          {AUTH_FLOW.map((s, i) => (
            <div key={s.step} className="relative rounded-xl border border-cream-0/10 bg-[#0d0b08] p-4 hover:border-gold-500/40 transition-colors">
              {i < AUTH_FLOW.length - 1 && <ArrowLeft size={14} className="hidden md:block absolute -start-2.5 top-1/2 -translate-y-1/2 text-gold-500/60 z-10" />}
              <span className="inline-grid place-items-center h-7 w-7 rounded-full bg-gold-500 text-charcoal-900 text-[12px] font-black">{s.step}</span>
              <p className="text-[13px] font-extrabold text-cream-0 mt-2.5">{s.title}</p>
              <p className="text-[11px] leading-5 text-cream-0/55 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-cream-0/10">
          <table className="w-full text-[12px] min-w-[560px]">
            <thead className="bg-cream-0/[0.04] text-cream-0/50">
              <tr><th className="px-3 py-2 text-start">نقش</th><th className="px-3 py-2 text-start">Auth</th><th className="px-3 py-2 text-start">دسترسی</th></tr>
            </thead>
            <tbody className="divide-y divide-cream-0/6">
              {ROLES_MATRIX.map((r) => (
                <tr key={r.role} className="hover:bg-gold-500/[0.04] transition-colors">
                  <td className="px-3 py-2.5 font-bold text-gold-200">{r.role}</td>
                  <td className="px-3 py-2.5 font-mono text-cream-0/60" dir="ltr">{r.fa}</td>
                  <td className="px-3 py-2.5 text-cream-0/70">{r.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* error codes */}
        <Panel title="رجیستری کدهای خطا" icon={<ShieldCheck size={15} />}>
          <div className="relative mb-3">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-0/35" />
            <input value={errQ} onChange={(e) => setErrQ(e.target.value)} placeholder="جستجوی کد، وضعیت یا پیام…"
              className="w-full h-10 rounded-lg bg-[#0d0b08] border border-cream-0/12 text-[12.5px] text-cream-0 placeholder:text-cream-0/30 ps-9 pe-3 focus:border-gold-500/60 focus:outline-none transition-colors" />
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border border-cream-0/10 divide-y divide-cream-0/6">
            {codes.map((e) => (
              <div key={e.code + e.status} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gold-500/[0.05] transition-colors">
                <span className="font-mono text-[11px] font-bold text-cream-0/70 w-9 shrink-0" dir="ltr">{e.status}</span>
                <code className="font-mono text-[10.5px] text-gold-300 bg-gold-500/10 border border-gold-500/30 rounded px-1.5 py-0.5 shrink-0" dir="ltr">{e.code}</code>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-cream-0/85 truncate">«{e.fa}»</p>
                  <p className="text-[10.5px] text-cream-0/45 truncate">{e.desc}</p>
                </div>
              </div>
            ))}
            {codes.length === 0 && <p className="p-6 text-center text-[12px] text-cream-0/40">موردی یافت نشد</p>}
          </div>
        </Panel>

        {/* rate limits + uploads */}
        <div className="space-y-6">
          <Panel title="محدودیت نرخ" icon={<Zap size={15} />}>
            <div className="space-y-2.5">
              {RATE_LIMITS.map((r) => (
                <div key={r.route} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-cream-0/8 bg-[#0d0b08] px-3 py-2.5">
                  <code className="font-mono text-[11px] text-gold-200" dir="ltr">{r.route}</code>
                  <span className="text-[11.5px] text-cream-0/75">{r.limit}</span>
                  <span className="text-[10.5px] text-cream-0/40 ms-auto">{r.note}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="آپلود و رسانه" icon={<Upload size={15} />}>
            <div className="space-y-2.5">
              {UPLOADS.map((u) => (
                <div key={u.where} className="rounded-lg border border-cream-0/8 bg-[#0d0b08] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[12px] font-bold text-cream-0/85">{u.where}</span>
                    <code className="font-mono text-[10.5px] text-gold-200" dir="ltr">{u.ep}</code>
                  </div>
                  <p className="text-[10.5px] text-cream-0/50 mt-1">
                    <span dir="ltr" className="font-mono">{u.mime}</span> · سقف {u.size} · {u.store}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* background jobs */}
      <Panel title="Jobهای پس‌زمینه که UI به آن‌ها وابسته است" icon={<Webhook size={15} />}>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {BG_JOBS.map((j) => (
            <div key={j.name} className="rounded-lg border border-cream-0/8 bg-[#0d0b08] p-3.5 hover:border-gold-500/35 transition-colors">
              <div className="flex items-center justify-between">
                <code className="font-mono text-[11.5px] font-bold text-gold-300" dir="ltr">{j.name}</code>
                <span className="text-[10px] text-cream-0/40 flex items-center gap-1"><RefreshCw size={10} />{j.cron}</span>
              </div>
              <p className="text-[11px] leading-5 text-cream-0/60 mt-2">{j.desc}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ReferenceTab() {
  const [module, setModule] = useState<string>("all");
  const [method, setMethod] = useState<DocMethod | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>("otp-verify");

  const grouped = useMemo(() => {
    const roles: DocModule["role"][] = ["public", "customer", "dealer", "staff", "admin"];
    return roles.map((r) => ({ role: r, modules: ALL_MODULES.filter((m) => m.role === r) })).filter((g) => g.modules.length > 0);
  }, []);

  const totalEp = ALL_MODULES.reduce((s, m) => s + m.endpoints.length, 0);
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return ALL_MODULES
      .filter((m) => module === "all" || m.id === module)
      .map((m) => ({
        module: m,
        endpoints: m.endpoints.filter((e) =>
          (method === "ALL" || e.method === method) &&
          (!qq || e.path.toLowerCase().includes(qq) || e.name.includes(qq) || e.id.includes(qq) || m.name.includes(qq)),
        ),
      }))
      .filter((g) => g.endpoints.length > 0);
  }, [module, method, q]);
  const shown = list.reduce((s, g) => s + g.endpoints.length, 0);

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start anim-fade-up">
      {/* modules sidebar */}
      <aside className="rounded-xl border border-cream-0/10 bg-cream-0/[0.02] p-3 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-auto">
        <button onClick={() => { setModule("all"); }}
          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] font-bold transition-colors ${module === "all" ? "bg-gold-500/15 text-gold-200 border border-gold-500/40" : "text-cream-0/65 hover:bg-cream-0/5 border border-transparent"}`}>
          همه ماژول‌ها <span className="font-mono text-[10.5px] text-cream-0/40">{fa(totalEp)}</span>
        </button>
        {grouped.map((g) => (
          <div key={g.role} className="mt-3">
            <p className="px-2 mb-1 text-[10px] font-bold text-cream-0/35">{ROLE_LABEL[g.role]}</p>
            <div className="space-y-0.5">
              {g.modules.map((m) => {
                const active = module === m.id;
                return (
                  <button key={m.id} onClick={() => setModule(active ? "all" : m.id)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-[12px] transition-all duration-150 ${active ? "bg-gold-500/15 text-gold-200 border border-gold-500/40" : "text-cream-0/65 hover:bg-cream-0/5 hover:text-cream-0 border border-transparent"}`}>
                    <span className="truncate">{m.name}</span>
                    <span className="font-mono text-[10px] text-cream-0/35 shrink-0">{fa(m.endpoints.length)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* endpoints */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-0/35" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در مسیر، نام یا شناسه…"
              className="w-full h-10 rounded-lg bg-[#0d0b08] border border-cream-0/12 text-[12.5px] text-cream-0 placeholder:text-cream-0/30 ps-9 pe-3 focus:border-gold-500/60 focus:outline-none transition-colors" />
          </div>
          {(["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)}
              className={`h-10 px-3 rounded-lg border font-mono text-[11px] font-bold transition-all duration-150 ${method === m ? "bg-gold-500 text-charcoal-900 border-gold-500" : "bg-cream-0/[0.03] text-cream-0/55 border-cream-0/12 hover:border-cream-0/30"}`}
              dir="ltr">{m}</button>
          ))}
        </div>
        <p className="text-[11.5px] text-cream-0/40 mb-3">{fa(shown)} endpoint از {fa(totalEp)} — کلیک روی هر ردیف، جزئیات کامل را باز می‌کند.</p>

        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-cream-0/15 p-12 text-center">
            <Server size={28} className="mx-auto text-cream-0/25" />
            <p className="text-[13.5px] font-bold text-cream-0/60 mt-3">endpointی با این فیلتر پیدا نشد</p>
            <p className="text-[12px] text-cream-0/40 mt-1">عبارت جستجو یا متد را تغییر دهید</p>
          </div>
        )}

        <div className="space-y-6">
          {list.map(({ module: m, endpoints }) => (
            <section key={m.id}>
              <div className="flex flex-wrap items-baseline gap-2 mb-2.5">
                <span className="font-mono text-[10.5px] text-gold-400/80 border border-gold-500/30 rounded px-1.5 py-0.5" dir="ltr">{m.code}</span>
                <h3 className="text-[15px] font-extrabold text-cream-0">{m.name}</h3>
                <RoleChip r={m.role} sm />
              </div>
              <p className="text-[12px] text-cream-0/50 leading-6 mb-3">{m.intro}</p>
              <div className="space-y-2">
                {endpoints.map((ep) => (
                  <EndpointCard key={ep.id} ep={ep} module={m} open={openId === ep.id} onToggle={() => setOpenId(openId === ep.id ? null : ep.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function DatabaseTab() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");

  const tables = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return TABLES.filter((t) =>
      (group === "all" || t.group === group) &&
      (!qq || t.name.includes(qq) || t.desc.includes(qq) || t.cols.some((c) => c.n.includes(qq))),
    );
  }, [q, group]);

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-0/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی جدول یا ستون…"
            className="w-full h-10 rounded-lg bg-[#0d0b08] border border-cream-0/12 text-[12.5px] text-cream-0 placeholder:text-cream-0/30 ps-9 pe-3 focus:border-gold-500/60 focus:outline-none transition-colors" />
        </div>
        <button onClick={() => setGroup("all")} className={`h-10 px-3 rounded-lg border text-[11.5px] font-bold transition-all ${group === "all" ? "bg-gold-500 text-charcoal-900 border-gold-500" : "bg-cream-0/[0.03] text-cream-0/55 border-cream-0/12 hover:border-cream-0/30"}`}>همه</button>
        {TABLE_GROUPS.map((g) => (
          <button key={g} onClick={() => setGroup(g === group ? "all" : g)}
            className={`h-10 px-3 rounded-lg border text-[11.5px] font-bold transition-all duration-150 ${group === g ? "bg-gold-500 text-charcoal-900 border-gold-500" : "bg-cream-0/[0.03] text-cream-0/55 border-cream-0/12 hover:border-cream-0/30"}`}>{g}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-cream-0/50">
        <span className="flex items-center gap-1.5"><KeyBadge k="PK" /> کلید اصلی</span>
        <span className="flex items-center gap-1.5"><KeyBadge k="FK" /> کلید خارجی</span>
        <span className="flex items-center gap-1.5"><KeyBadge k="UQ" /> یکتا</span>
        <span className="flex items-center gap-1.5"><KeyBadge k="IX" /> ایندکس</span>
        <span className="flex items-center gap-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded border border-danger/40 bg-danger/10 text-[#e08a8a]">soft</span> حذف نرم</span>
        <span className="ms-auto">MySQL 8 · InnoDB · utf8mb4_persian_ci</span>
      </div>

      {tables.length === 0 && (
        <div className="rounded-xl border border-dashed border-cream-0/15 p-12 text-center">
          <Database size={28} className="mx-auto text-cream-0/25" />
          <p className="text-[13.5px] font-bold text-cream-0/60 mt-3">جدولی یافت نشد</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tables.map((t: DbTable) => (
          <article key={t.name} className="group rounded-xl border border-cream-0/10 bg-cream-0/[0.02] overflow-hidden hover:border-gold-500/35 transition-all duration-200">
            <header className="flex items-center justify-between px-4 py-3 border-b border-cream-0/8 bg-[#0d0b08]">
              <h4 className="font-mono text-[13px] font-bold text-gold-300" dir="ltr">{t.name}</h4>
              <div className="flex items-center gap-1.5">
                {t.soft && <span className="text-[9px] px-1.5 py-0.5 rounded border border-danger/40 bg-danger/10 text-[#e08a8a]">soft</span>}
                <span className="text-[9.5px] text-cream-0/35">{t.group}</span>
              </div>
            </header>
            <p className="px-4 pt-2.5 text-[11px] text-cream-0/50">{t.desc}</p>
            <div className="px-4 py-2.5 max-h-56 overflow-auto">
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-cream-0/5">
                  {t.cols.map((c) => (
                    <tr key={c.n} className="group/row hover:bg-gold-500/[0.05] transition-colors">
                      <td className="py-1.5 pe-2 font-mono text-cream-0/80 whitespace-nowrap" dir="ltr">
                        <span className="inline-flex items-center gap-1.5">{c.n}<KeyBadge k={c.k} /></span>
                      </td>
                      <td className="py-1.5 pe-2 font-mono text-[10px] text-cream-0/45 whitespace-nowrap" dir="ltr">{c.t}</td>
                      <td className="py-1.5 text-cream-0/40">{c.ref ? <span className="font-mono text-[9.5px] text-[#8fb8d4]" dir="ltr">→ {c.ref}</span> : c.d ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {t.enums && t.enums.length > 0 && (
              <footer className="px-4 pb-3 space-y-1">
                {t.enums.map((e) => (
                  <p key={e.col} className="text-[10px] leading-5">
                    <code className="font-mono text-gold-200" dir="ltr">{e.col}</code>
                    <span className="text-cream-0/40"> ← </span>
                    <code className="font-mono text-[9.5px] text-[#b8d4a8]" dir="ltr">{e.values}</code>
                  </p>
                ))}
              </footer>
            )}
          </article>
        ))}
      </div>

      <Panel title={`روابط بین جداول (${fa(RELATIONS.length)})`} icon={<GitBranch size={15} />}>
        <div className="grid md:grid-cols-2 gap-2">
          {RELATIONS.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-cream-0/8 bg-[#0d0b08] px-3 py-2.5 hover:border-gold-500/30 transition-colors">
              <code className="font-mono text-[11px] text-gold-200" dir="ltr">{r.from}</code>
              <span className={`font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${r.type === "1-1" ? "border-success/40 bg-success/10 text-[#7fc79f]" : r.type === "1-N" ? "border-gold-500/40 bg-gold-500/10 text-gold-300" : "border-info/50 bg-info/15 text-[#8fb8d4]"}`} dir="ltr">{r.type}{r.via ? ` · ${r.via}` : ""}</span>
              <code className="font-mono text-[11px] text-gold-200" dir="ltr">{r.to}</code>
              <span className="text-[10.5px] text-cream-0/45 w-full sm:w-auto sm:ms-1">{r.desc}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MappingTab() {
  const [q, setQ] = useState("");
  const rows = MAPPING.filter((r) => !q || r.page.includes(q) || r.comp.includes(q) || r.action.includes(q) || r.path.toLowerCase().includes(q.toLowerCase()) || r.table.includes(q.toLowerCase()));
  return (
    <div className="space-y-4 anim-fade-up">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-cream-0/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در صفحه، کامپوننت، endpoint یا جدول…"
            className="w-full h-10 rounded-lg bg-[#0d0b08] border border-cream-0/12 text-[12.5px] text-cream-0 placeholder:text-cream-0/30 ps-9 pe-3 focus:border-gold-500/60 focus:outline-none transition-colors" />
        </div>
        <span className="text-[11.5px] text-cream-0/40">{fa(rows.length)} ردیف</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-cream-0/10">
        <table className="w-full text-[12px] min-w-[900px]">
          <thead className="bg-cream-0/[0.045] text-cream-0/55 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-start font-bold">صفحه</th>
              <th className="px-4 py-3 text-start font-bold">عنصر UI</th>
              <th className="px-4 py-3 text-start font-bold">عمل</th>
              <th className="px-4 py-3 text-start font-bold">متد</th>
              <th className="px-4 py-3 text-start font-bold">Endpoint</th>
              <th className="px-4 py-3 text-start font-bold">جدول</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-0/6">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gold-500/[0.05] transition-colors">
                <td className="px-4 py-2.5 text-cream-0/85 font-semibold whitespace-nowrap">{r.page}</td>
                <td className="px-4 py-2.5 text-cream-0/70">{r.comp}</td>
                <td className="px-4 py-2.5 text-cream-0/55">{r.action}</td>
                <td className="px-4 py-2.5"><MethodBadge m={r.method} sm /></td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-gold-200" dir="ltr">{r.path}</td>
                <td className="px-4 py-2.5 font-mono text-[10.5px] text-[#8fb8d4]" dir="ltr">{r.table}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-[12.5px] text-cream-0/40">ردیفی با این عبارت پیدا نشد</p>}
      </div>
    </div>
  );
}

function AuditTab() {
  return (
    <div className="space-y-6 anim-fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AUDIT.stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-cream-0/10 bg-cream-0/[0.025] px-4 py-4 hover:border-gold-500/35 transition-colors">
            <p className="text-[28px] font-black tnum text-gold-300">{fa(s.value)}</p>
            <p className="text-[12.5px] font-bold text-cream-0 mt-1">{s.label}</p>
            <p className="text-[10.5px] text-cream-0/45 mt-0.5">{s.note}</p>
          </div>
        ))}
      </div>

      <Panel title="چک‌لیست یکپارچگی UI → API → Database" icon={<ListChecks size={15} />}>
        <div className="grid md:grid-cols-2 gap-2">
          {AUDIT.checklist.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-cream-0/8 bg-[#0d0b08] px-3.5 py-3">
              <span className="inline-grid place-items-center h-5 w-5 rounded-full bg-success/20 border border-success/50 text-[#7fc79f] shrink-0 mt-0.5"><Check size={11} /></span>
              <p className="text-[12.5px] leading-6 text-cream-0/75">{c}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="شکاف‌های شناسایی‌شده برای پیاده‌سازی بک‌اند" icon={<Server size={15} />}>
          <div className="space-y-2.5">
            {AUDIT.gaps.map((g, i) => (
              <div key={i} className="rounded-lg border border-warning/30 bg-warning/[0.07] px-3.5 py-3">
                <p className="text-[12.5px] font-bold text-[#e8c07c]">{g.item}</p>
                <p className="text-[11.5px] leading-6 text-cream-0/60 mt-1">{g.status}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="عملیات صرفاً کلاینتی (بدون نیاز به endpoint)" icon={<Terminal size={15} />}>
            <ul className="space-y-2">
              {AUDIT.clientOnly.map((c, i) => (
                <li key={i} className="flex gap-2.5 text-[12px] leading-6">
                  <ArrowRight size={13} className="text-gold-400 shrink-0 mt-1.5" />
                  <span className="text-cream-0/75"><b className="text-cream-0/90">{c.item}</b> — {c.why}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="خارج از دامنه v1" icon={<Lock size={15} />}>
            <div className="flex flex-wrap gap-2">
              {AUDIT.excluded.map((e, i) => (
                <span key={i} className="text-[11.5px] px-3 py-1.5 rounded-full border border-cream-0/12 bg-cream-0/[0.03] text-cream-0/55">{e}</span>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

type TabKey = "overview" | "api" | "db" | "mapping" | "audit";

export default function DocsPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const toast = useToast();
  const totalEp = ALL_MODULES.reduce((s, m) => s + m.endpoints.length, 0);

  const tabs: { key: TabKey; label: string; icon: ReactNode; count?: number }[] = [
    { key: "overview", label: "نمای کلی", icon: <BookOpen size={14} /> },
    { key: "api", label: "مرجع API", icon: <Terminal size={14} />, count: totalEp },
    { key: "db", label: "پایگاه داده", icon: <Database size={14} />, count: TABLES.length },
    { key: "mapping", label: "نگاشت UI↔API", icon: <Layers size={14} />, count: MAPPING.length },
    { key: "audit", label: "حسابرسی", icon: <ListChecks size={14} /> },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#14110c] text-cream-0" style={{ backgroundImage: "radial-gradient(1000px 480px at 88% -140px, rgba(201,162,39,0.09), transparent 65%), radial-gradient(800px 400px at 5% -100px, rgba(201,162,39,0.05), transparent 60%)" }}>
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-cream-0/10 bg-[#14110c]/90 backdrop-blur">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="inline-grid place-items-center h-9 w-9 rounded-[10px] bg-gold-500 text-charcoal-900 group-hover:bg-gold-400 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 16.5 7.5 8h9L20 16.5H4Z" /><path d="M9 8l1.5-3h3L15 8" /><path d="M4 16.5h16v2H4z" /></svg>
            </span>
            <span className="hidden sm:block">
              <span className="block text-[15px] font-black leading-4">زرون گلد</span>
              <span className="block text-[9.5px] font-mono text-gold-400/80 tracking-[0.18em] uppercase" dir="ltr">Developer Docs</span>
            </span>
          </Link>

          <span className="hidden md:inline text-[11px] text-cream-0/40 border-s border-cream-0/10 ps-4">مرکز مستندات بک‌اند — ساخته‌شده از روی UI</span>

          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={async () => { const ok = await copyText("/api/v1"); toast(ok ? "Base URL کپی شد" : "کپی ناموفق بود", ok ? "success" : "error"); }}
              className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-cream-0/15 bg-[#0d0b08] hover:border-gold-500/50 transition-colors focus-ring"
            >
              <code className="font-mono text-[11.5px] text-gold-300" dir="ltr">/api/v1</code>
              <Copy size={12} className="text-cream-0/40" />
            </button>
            <span className="hidden sm:inline-flex h-9 items-center px-2.5 rounded-lg border border-gold-500/40 bg-gold-500/10 font-mono text-[11px] text-gold-300" dir="ltr">v1.0.0</span>
            <Link to="/" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gold-500 text-charcoal-900 text-[12px] font-bold hover:bg-gold-400 active:scale-95 transition-all focus-ring">
              <ArrowRight size={14} /> بازگشت به فروشگاه
            </Link>
          </div>
        </div>

        {/* tabs */}
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative shrink-0 inline-flex items-center gap-2 px-4 h-11 text-[12.5px] font-bold transition-colors focus-ring ${active ? "text-gold-300" : "text-cream-0/50 hover:text-cream-0/85"}`}>
                {t.icon}{t.label}
                {t.count !== undefined && <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-gold-500/20 text-gold-300" : "bg-cream-0/8 text-cream-0/40"}`}>{fa(t.count)}</span>}
                <span className={`absolute bottom-0 inset-x-2 h-0.5 rounded-full transition-all duration-200 ${active ? "bg-gold-500 opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8" key={tab}>
        {tab === "overview" && <OverviewTab />}
        {tab === "api" && <ReferenceTab />}
        {tab === "db" && <DatabaseTab />}
        {tab === "mapping" && <MappingTab />}
        {tab === "audit" && <AuditTab />}
      </main>

      <footer className="border-t border-cream-0/8 mt-6">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-5 flex flex-wrap items-center gap-3 text-[11px] text-cream-0/35">
          <span>مستندات از تحلیل کامل frontend (تایپ‌ها، ماژول‌های API و ۶۰+ صفحه) استخراج شده است.</span>
          <span className="ms-auto font-mono" dir="ltr">Zarvan Gold · REST /api/v1 · Laravel-ready</span>
        </div>
      </footer>
    </div>
  );
}
