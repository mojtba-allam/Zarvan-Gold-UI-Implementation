import { useMemo, useState } from "react";
import { adminApi, priceHistory } from "../api";
import { cn, fa, formatIrr, usePageData } from "../lib";
import { Badge, Button, Card, DateRangePicker, PageHead, Skeleton, StatCard, Switch } from "../components/ui";
import { Banner, useToast } from "../components/feedback";
import { DonutChartX, FunnelChart, GaugeChart, GoldAreaChart, GoldBarChart, GoldLineChart, Sparkline } from "../components/charts";
import { Download, Landmark, ShieldOff } from "../components/icons";

/* ================================ AdminDashboardPage ================================ */
export function AdminDashboardPage() {
  const dash = usePageData(() => adminApi.dashboard());
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [show24, setShow24] = useState(false);
  const [haltOpen, setHaltOpen] = useState(false);
  const [haltConfirm, setHaltConfirm] = useState("");
  const [haltBusy, setHaltBusy] = useState(false);
  const toast = useToast();

  const d = dash.data;
  const slice = (pts: { t: string; value: number }[]) => pts.slice(-range);
  const halted = adminApi.settings.trading_halt;

  return (
    <div className="space-y-6">
      <PageHead title="داشبورد مدیریت" subtitle="نمای زنده فروش، طلا، موجودی و سلامت عملیات"
        actions={<>
          <DateRangePicker value={range} onChange={setRange} />
          <Button variant={halted ? "secondary" : "danger"} icon={<ShieldOff size={15} />} onClick={() => { setHaltOpen(true); setHaltConfirm(""); }}>
            {halted ? "معاملات متوقف است" : "توقف معاملات"}
          </Button>
        </>} />

      {halted && <Banner kind="halt"><ShieldOff size={15} className="inline -mt-0.5 me-1" /> معاملات از پنل تنظیمات/قیمت‌گذاری متوقف شده است — مشتریان پیام توقف می‌بینند.</Banner>}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 stagger">
        {dash.loading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)
          : (d?.kpis ?? []).map((k, i) => (
            <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} icon={i === 4 ? <Landmark size={16} /> : undefined}
              spark={k.sparkline ? <Sparkline data={k.sparkline} /> : undefined} />
          ))}
      </div>

      {/* 8 mandatory charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* 1 — sales IRR 30d bar */}
        <GoldBarChart title="① فروش ریالی — ۳۰ روز اخیر" data={slice(d?.sales_irr_30d ?? [])} loading={dash.loading} error={dash.error} onRetry={dash.retry} unit="irr" height={250} />
        {/* 2 — gold volume mg line */}
        <GoldLineChart title="② حجم طلای معامله‌شده (mg) — ۳۰ روز" data={slice(d?.gold_volume_mg_30d ?? [])} loading={dash.loading} error={dash.error} onRetry={dash.retry} unit="mg" height={250} />
        {/* 3 — spot 90d area + 24k toggle */}
        <GoldAreaChart title="③ نرخ لحظه‌ای ۱۸ عیار — ۹۰ روز" data={(d?.spot_90d ?? []).map((p) => ({ t: p.t, value: p.value }))}
          data2={show24 ? priceHistory("90D", 24).map((p) => ({ t: p.t, value: p.price_irr })) : undefined}
          loading={dash.loading} error={dash.error} onRetry={dash.retry} unit="irr" height={250}
          actions={
            <label className="flex items-center gap-1.5 text-[11.5px] font-medium text-charcoal-700 cursor-pointer">
              <input type="checkbox" checked={show24} onChange={(e) => setShow24(e.target.checked)} className="accent-[#C9A227]" />۲۴ عیار
            </label>
          } />
        {/* 4 — orders funnel */}
        <FunnelChart title="④ قیف سفارش‌ها" steps={d?.orders_funnel ?? []} loading={dash.loading} error={dash.error} onRetry={dash.retry} />
        {/* 5 — inventory health horizontal bars */}
        <GoldBarChart title="⑤ سلامت موجودی (low / ok / over)" horizontal
          data={(d?.inventory_health ?? []).map((r) => ({ t: r.sku, value: r.qty, id: r.sku }))}
          loading={dash.loading} error={dash.error} onRetry={dash.retry} unit="raw" height={250} />
        {/* 6 — KYC funnel donut */}
        <DonutChartX title="⑥ قیف احراز هویت" data={(d?.kyc_funnel ?? []).map((s) => ({ label: s.label, value: s.count }))}
          centerValue={d ? fa(d.kyc_funnel.reduce((s, x) => s + x.count, 0)) : "—"} centerLabel="کل پرونده‌ها"
          loading={dash.loading} error={dash.error} onRetry={dash.retry} height={250} />
        {/* 7 — solvency gauge */}
        <GaugeChart title="⑦ نسبت پشتیبانی خزانه" pct={d?.solvency.ratio_pct ?? 0} label="پوشش تعهدات مشتریان"
          sub={d ? `${(d.solvency.vault_mg / 1_000_000).toFixed(1)}g vault / ${(d.solvency.liabilities_mg / 1_000_000).toFixed(1)}g liabilities` : undefined}
          loading={dash.loading} error={dash.error} onRetry={dash.retry} />
        {/* 8 — new customers */}
        <Card>
          <h3 className="text-[14px] font-bold mb-1">⑧ مشتریان جدید — ۳۰ روز</h3>
          <p className="text-[11.5px] text-charcoal-500 mb-4">میانگین روزانه {fa(d ? Math.round((d.new_customers_30d ?? []).reduce((s, x) => s + x, 0) / 30) : 0)} ثبت‌نام</p>
          {dash.loading ? <Skeleton className="h-40" /> : (
            <>
              <div className="h-40"><Sparkline data={d?.new_customers_30d ?? []} height={160} /></div>
              <div className="flex justify-between text-[10.5px] text-charcoal-500 tnum mt-2">
                <span>{fa(30)} روز پیش</span><span>امروز</span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* spreads quick view */}
      <Card className="flex flex-wrap items-center gap-x-10 gap-y-3">
        <span className="text-[13px] font-black">اسپرد فعلی</span>
        <span className="text-[12.5px] text-charcoal-700">Bid <b className="tnum text-danger">{fa(adminApi.settings.bid_bps)}</b> bps</span>
        <span className="text-[12.5px] text-charcoal-700">Ask <b className="tnum text-success">{fa(adminApi.settings.ask_bps)}</b> bps</span>
        <span className="text-[12.5px] text-charcoal-700">TTL قیمت <b className="tnum">{fa(adminApi.settings.quote_ttl_sec)}</b> ثانیه</span>
        <span className="text-[12.5px] text-charcoal-700">حداقل معامله <b className="tnum">{fa(adminApi.settings.min_trade_mg)}</b> mg</span>
        <span className="ms-auto"><Button size="sm" variant="secondary" onClick={() => (window.location.hash = "#/admin/settings")}>ویرایش در تنظیمات</Button></span>
      </Card>

      {/* halt modal */}
      {haltOpen && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-overlay anim-fade-in" onClick={() => setHaltOpen(false)} />
          <div className="relative w-full max-w-md bg-cream-0 rounded-card shadow-[var(--shadow-pop)] p-6 anim-pop">
            <h3 className="text-[16px] font-black text-danger flex items-center gap-2"><ShieldOff size={18} /> توقف کامل معاملات</h3>
            <p className="text-[13px] text-charcoal-700 leading-7 mt-2.5">
              با توقف، خرید و فروش برای همه مشتریان غیرفعال می‌شود و تابلو پیام «معاملات متوقف است» نمایش می‌دهد. برای تأیید کلمه <b className="text-danger">HALT</b> را تایپ کنید.
            </p>
            <input dir="ltr" value={haltConfirm} onChange={(e) => setHaltConfirm(e.target.value)} placeholder="HALT"
              className={cn("mt-4 w-full h-12 rounded-[8px] border-2 px-4 text-center font-black tracking-[0.3em] uppercase focus-ring",
                halted ? "border-success" : "border-danger/50 focus:border-danger")} />
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" full onClick={() => setHaltOpen(false)}>انصراف</Button>
              <Button variant={halted ? "primary" : "danger"} full loading={haltBusy}
                disabled={!halted && haltConfirm !== "HALT"}
                onClick={async () => {
                  setHaltBusy(true);
                  await adminApi.saveSettings({ trading_halt: !halted });
                  setHaltBusy(false);
                  setHaltOpen(false);
                  toast(halted ? "معاملات دوباره فعال شد" : "معاملات متوقف شد", halted ? "success" : "warning");
                  dash.retry();
                }}>
                {halted ? "فعال‌سازی معاملات" : "توقف معاملات"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================ ReportsPage ================================ */
export function ReportsPage() {
  const dash = usePageData(() => adminApi.dashboard());
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [exporting, setExporting] = useState<string | null>(null);
  const toast = useToast();
  const d = dash.data;

  const exportCsv = (name: string, rows: { t: string; value: number }[]) => {
    setExporting(name);
    setTimeout(() => {
      const csv = rows.map((r) => `${r.t},${r.value}`).join("\n");
      const blob = new Blob([`date,value\n${csv}`], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zarvan-${name}.csv`;
      a.click();
      setExporting(null);
      toast(`گزارش ${name} آماده شد — دانلود شروع شد`);
    }, 900);
  };

  const reports = [
    { key: "sales", title: "گزارش فروش ریالی", desc: "جمع روزانه فروش به تفکیک درگاه و کیف پول", rows: d?.sales_irr_30d ?? [] },
    { key: "gold", title: "گزارش حجم طلا", desc: "وزن معامله‌شده خرید و فروش به تفکیک روز", rows: d?.gold_volume_mg_30d ?? [] },
    { key: "spot", title: "گزارش نرخ بازار", desc: "اسنپ‌شات‌های نرخ ۱۸ عیار در بازه انتخابی", rows: d?.spot_90d ?? [] },
  ];

  return (
    <div>
      <PageHead title="گزارش‌ها" subtitle="خروجی CSV گزارش‌های عملیاتی و مالی" actions={<DateRangePicker value={range} onChange={setRange} />} />
      <div className="grid md:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.key} className="flex flex-col">
            <h3 className="text-[14.5px] font-black">{r.title}</h3>
            <p className="text-[12px] text-charcoal-500 leading-6 mt-1.5 flex-1">{r.desc}</p>
            {dash.loading ? <Skeleton className="h-16 mt-3" /> : (
              <div className="h-14 mt-3"><Sparkline data={r.rows.slice(-range).map((x) => x.value)} /></div>
            )}
            <Button className="mt-4" variant="secondary" icon={<Download size={15} />} loading={exporting === r.key} onClick={() => exportCsv(r.key, r.rows)}>
              خروجی CSV ({fa(r.rows.length)} ردیف)
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <h3 className="text-[14px] font-black mb-4">پیش‌نمایش — فروش ریالی بازه انتخابی</h3>
        {dash.loading ? <Skeleton className="h-64" /> : (
          <GoldBarChart data={(d?.sales_irr_30d ?? []).slice(-range)} unit="irr" height={260} />
        )}
      </Card>
    </div>
  );
}
