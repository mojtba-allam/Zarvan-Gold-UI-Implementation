import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { catalogApi, IMG, pricingApi } from "../api";
import { useApp } from "../auth";
import { cn, copyText, fa, formatIrr, formatPct, jalaliLong, useLive, usePageData } from "../lib";
import { Badge, Button, Slider, Tabs, Textarea, Input, MobileInput, Accordion, Card, Skeleton } from "../components/ui";
import { EmptyState, useToast } from "../components/feedback";
import { GoldAreaChart, Sparkline, GOLD } from "../components/charts";
import { ProductCard } from "../components/commerce";
import {
  ArrowLeft, ShieldCheck, Truck, FileCheck2, Landmark, PhoneCall, Copy, Sparkles, Gem,
  Ruler, Printer, Save, Clock3, CheckCircle2, Scale, PackageCheck,
} from "../components/icons";

/* ================================ HomePage ================================ */
export function HomePage() {
  const spot = usePageData(() => pricingApi.spot());
  const products = usePageData(() => catalogApi.products({ sort: "price_asc" }));
  const history = usePageData(() => pricingApi.history("1W", 18));
  const toast = useToast();
  const { user } = useApp();
  const navigate = useNavigate();
  const live18 = useLive(spot.data?.[0]?.price_irr_per_gram ?? 3_520_000, 3000);

  const s18 = spot.data?.[0];
  const s24 = spot.data?.[1];
  const featured = products.data?.data.filter((p) => ["BR-18-221", "RING-18-105", "NK-18-412", "BAR-24-50"].includes(p.sku)) ?? [];
  const bullion = products.data?.data.filter((p) => p.type === "bar" || p.type === "coin") ?? [];

  return (
    <div>
      {/* ---- opening: live price board ---- */}
      <section className="relative overflow-hidden">
        <div className="paper-lines absolute inset-0 opacity-60" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-14 grid lg:grid-cols-12 gap-8 items-center relative">
          <div className="lg:col-span-6 stagger">
            <p className="inline-flex items-center gap-2 text-[12px] font-bold text-gold-700 bg-gold-50 border border-gold-100 rounded-full px-3.5 py-1.5">
              <Sparkles size={13} /> بازار باز است — معامله ۲۴/۷
            </p>
            <h1 className="text-[34px] sm:text-[44px] font-black leading-[1.35] text-charcoal-900 mt-5">
              طلا، <span className="relative inline-block">شفاف<svg className="absolute -bottom-1.5 inset-x-0 w-full" height="7" viewBox="0 0 120 7" preserveAspectRatio="none" aria-hidden><path d="M2 5C30 1 90 1 118 5" stroke="#C9A227" strokeWidth="3" fill="none" strokeLinecap="round" /></svg></span> و در دسترس
            </h1>
            <p className="text-[15px] leading-8 text-charcoal-700 mt-5 max-w-lg">
              از یک میلی‌گرم تا شمش صد گرمی؛ با نرخ لحظه‌ای، اسپرد اعلام‌شده و فاکتور رسمی.
              طلای شما در خزانه بیمه‌شده می‌ماند یا با بسته‌بندی پلمب به درب منزل می‌رسد.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <Button size="lg" onClick={() => navigate(user ? "/app/trade" : "/login")}>شروع معامله</Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("/catalog")} icon={<ArrowLeft size={16} />}>مشاهده فروشگاه</Button>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-9 pt-6 border-t border-inkline">
              {[["۴۸۹ هزار", "مشتری فعال"], ["۱۸٫۴ کیلوگرم", "طلای خزانه"], ["۹۶٫۳٪", "نسبت پشتیبانی"]].map(([v, l]) => (
                <div key={l}><dt className="text-[11.5px] text-charcoal-500">{l}</dt><dd className="text-[16px] font-black tnum text-charcoal-900">{v}</dd></div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-6 anim-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gold-500/10 blur-2xl rounded-[30px]" aria-hidden />
              <div className="relative bg-charcoal-900 rounded-[20px] border border-gold-500/25 shadow-[var(--shadow-pop)] overflow-hidden">
                <img src={IMG.hero} alt="دستبند طلای ۱۸ عیار روی linen" className="h-44 w-full object-cover opacity-80" />
                <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-charcoal-900/70 to-transparent" />
                <div className="absolute top-3.5 start-4 flex items-center gap-2 text-cream-0">
                  <span className="h-2 w-2 rounded-full bg-gold-500 live-dot" />
                  <span className="text-[11.5px] font-bold">تابلوی لحظه‌ای بازار</span>
                  <span className="text-[10.5px] text-cream-0/50 tnum">{jalaliLong("2026-08-13T12:00:00Z")}</span>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4">
                  <SpotBoard karat="۱۸ عیار" price={live18} change={s18?.change_pct_24h} bid={s18?.bid_irr} ask={s18?.ask_irr}
                    spark={history.data?.slice(-20).map((p) => p.price_irr)} loading={spot.loading} />
                  <SpotBoard karat="۲۴ عیار" price={s24?.price_irr_per_gram} change={s24?.change_pct_24h} bid={s24?.bid_irr} ask={s24?.ask_irr}
                    spark={history.data?.slice(-20).map((p) => Math.round(p.price_irr * 4 / 3))} loading={spot.loading} />
                </div>
                <div className="px-5 pb-5 flex items-center gap-2.5">
                  <Button full onClick={() => navigate(user ? "/app/trade" : "/login")}>معامله با این قیمت</Button>
                  <Button full variant="ghost" className="text-cream-0/80 hover:bg-cream-0/10 hover:text-cream-0 border border-cream-0/20" onClick={() => navigate("/prices")}>نمودار ۹۰ روزه</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- featured products ---- */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <SectionHead title="پیشخوان فروشگاه" sub="منتخب این هفته کارگاه زرون" link="/catalog" linkLabel="همه محصولات" />
        {products.loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            {featured.map((p) => <ProductCard key={p.sku} product={p} />)}
          </div>
        )}
      </section>

      {/* ---- bullion bid/ask table ---- */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <SectionHead title="تابلوی شمش و سکه" sub="خرید ما از شما (Bid) و فروش ما به شما (Ask) — بدون کارمزد پنهان" link="/catalog?type=bar" linkLabel="خرید شمش و سکه" />
        <div className="border border-inkline rounded-card bg-cream-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[620px]">
              <thead>
                <tr className="bg-charcoal-900 text-cream-0 text-[11.5px]">
                  <th className="px-4 py-3.5 text-start font-bold">دارایی</th>
                  <th className="px-4 py-3.5 text-end font-bold">وزن</th>
                  <th className="px-4 py-3.5 text-end font-bold text-gold-500">فروش به شما (Ask)</th>
                  <th className="px-4 py-3.5 text-end font-bold text-success">خرید از شما (Bid)</th>
                  <th className="px-4 py-3.5 text-end font-bold">اسپرد</th>
                  <th className="px-4 py-3.5 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inkline/70">
                {products.loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-4 py-4"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))}
                {!products.loading && bullion.map((p) => {
                  const spread = p.bid_irr && p.ask_irr ? ((p.ask_irr - p.bid_irr) / p.ask_irr) * 100 : 0;
                  return (
                    <tr key={p.sku} className="hover:bg-gold-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5 font-bold text-charcoal-900">
                          <img src={p.images[0]} alt="" className="h-9 w-9 rounded-lg object-cover bg-cream-100" />{p.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end tnum text-charcoal-700">{fa((p.weight_mg / 1000).toFixed(2))} گرم</td>
                      <td className="px-4 py-3 text-end tnum font-extrabold text-charcoal-900">{formatIrr(p.ask_irr)}</td>
                      <td className="px-4 py-3 text-end tnum font-bold text-success">{formatIrr(p.bid_irr)}</td>
                      <td className="px-4 py-3 text-end tnum text-charcoal-500">{fa(spread.toFixed(2))}٪</td>
                      <td className="px-4 py-3 text-end">
                        <Link to={`/catalog/${p.slug}`} className="text-[12px] font-bold text-gold-700 hover:text-gold-600 inline-flex items-center gap-1">جزئیات<ArrowLeft size={12} /></Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- chart band ---- */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <GoldAreaChart title="طلای ۱۸ عیار — ۷ روز اخیر" data={(history.data ?? []).map((p) => ({ t: p.t, value: p.price_irr }))}
              loading={history.loading} unit="irr" height={280}
              actions={<Link to="/prices" className="text-[12px] font-bold text-gold-700 hover:text-gold-600 inline-flex items-center gap-1">نمودار کامل<ArrowLeft size={12} /></Link>} />
          </div>
          <div className="bg-charcoal-900 rounded-card p-6 text-cream-0 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-8 -start-8 w-44 h-44 rounded-full bg-gold-500/15 blur-2xl" aria-hidden />
            <div className="relative">
              <p className="text-[12px] font-bold text-gold-500 mb-2">هدیه طلا</p>
              <h3 className="text-[20px] font-black leading-8">به‌جای دسته‌گل، میلی‌گرم طلا هدیه بدهید.</h3>
              <p className="text-[12.5px] text-cream-0/65 leading-6 mt-3">کد هدیه با بسته‌بندی لوکس و کارت تبریک، برای هر مناسبتی.</p>
            </div>
            <Button variant="primary" className="relative mt-6" onClick={() => navigate(user ? "/app/gifts" : "/login")}>ساخت هدیه طلا</Button>
          </div>
        </div>
      </section>

      {/* ---- trust strip ---- */}
      <section className="mt-6 border-y border-inkline bg-cream-0">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 divide-x divide-x-reverse divide-inkline">
          {[
            { icon: <Landmark size={20} />, t: "خزانه بیمه‌شده", d: "نسبت پشتیبانی ۹۶٫۳٪ منتشر می‌شود" },
            { icon: <Scale size={20} />, t: "عیار تضمینی", d: "فاکتور رسمی و کد رهگیری اصالت" },
            { icon: <Truck size={20} />, t: "تحویل امن", d: "پلمب ضدتقلب تا درب منزل" },
            { icon: <Clock3 size={20} />, t: "معامله ۲۴/۷", d: "حتی روزهای تعطیل، با نرخ لحظه‌ای" },
          ].map((f) => (
            <div key={f.t} className="py-7 px-5 flex items-start gap-3.5 group">
              <span className="text-gold-600 group-hover:scale-110 transition-transform mt-0.5">{f.icon}</span>
              <span><b className="block text-[13.5px] font-bold text-charcoal-900">{f.t}</b><span className="text-[12px] text-charcoal-500 leading-5 block mt-0.5">{f.d}</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- referral teaser ---- */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-0 border border-gold-200 rounded-card overflow-hidden bg-gradient-to-l from-gold-50 to-cream-0">
          <div className="p-7 sm:p-9">
            <p className="text-[12px] font-bold text-gold-700">باشگاه معرفی</p>
            <h3 className="text-[22px] font-black text-charcoal-900 mt-2 leading-9">هر معرفی، ۱٬۲۰۰ میلی‌گرم طلا جایزه — برای هر دو نفر</h3>
            <p className="text-[13px] text-charcoal-700 leading-7 mt-2">کد خود را برای دوستانتان بفرستید؛ بعد از اولین معامله، طلای جایزه مستقیم به کیف پول‌تان می‌نشیند.</p>
            <div className="flex items-center gap-2 mt-5">
              <code className="bg-charcoal-900 text-gold-500 rounded-[8px] px-4 py-2.5 text-[15px] font-black tracking-widest" dir="ltr">ZARV-9K2P</code>
              <Button variant="secondary" icon={<Copy size={15} />} onClick={async () => { await copyText("ZARV-9K2P"); toast("کد معرف کپی شد"); }}>کپی کد</Button>
            </div>
          </div>
          <div className="relative min-h-56">
            <img src={IMG.necklace} alt="گردنبند طلای هدیه" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-l from-gold-50 via-transparent to-transparent" />
          </div>
        </div>
      </section>
    </div>
  );
}

function SpotBoard({ karat, price, change, bid, ask, spark, loading }: {
  karat: string; price?: number; change?: number; bid?: number; ask?: number; spark?: number[]; loading?: boolean;
}) {
  if (loading || !price) return <Skeleton className="h-32 bg-cream-0/10" />;
  const up = (change ?? 0) >= 0;
  return (
    <div className="bg-cream-0/5 border border-cream-0/10 rounded-card p-4 hover:bg-cream-0/10 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-cream-0/70">{karat}</p>
        <span className={cn("text-[11px] font-bold tnum inline-flex items-center gap-1", up ? "text-gold-500" : "text-danger")}>{up ? "▲" : "▼"} {formatPct(change)}</span>
      </div>
      <p className="text-[21px] font-black text-cream-0 tnum mt-1.5">{formatIrr(Math.round(price))}</p>
      <p className="text-[10px] text-cream-0/45">ریال بر گرم</p>
      <div className="flex items-end justify-between mt-2 gap-2">
        <div className="text-[10.5px] tnum space-y-0.5">
          <p className="text-success">Bid {formatIrr(bid)}</p>
          <p className="text-gold-500">Ask {formatIrr(ask)}</p>
        </div>
        {spark && spark.length > 2 && <span className="w-16"><Sparkline data={spark} height={26} color={up ? GOLD : "#9B2C2C"} /></span>}
      </div>
    </div>
  );
}

function SectionHead({ title, sub, link, linkLabel }: { title: string; sub?: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="text-[20px] font-black text-charcoal-900">{title}</h2>
        {sub && <p className="text-[12.5px] text-charcoal-500 mt-1">{sub}</p>}
      </div>
      {link && <Link to={link} className="text-[12.5px] font-bold text-gold-700 hover:text-gold-600 inline-flex items-center gap-1 whitespace-nowrap">{linkLabel}<ArrowLeft size={13} /></Link>}
    </div>
  );
}

/* ================================ SizeGuidePage ================================ */
const ringSizeTable = [
  { mm: 15.3, ir: 9, us: "4.5" }, { mm: 15.7, ir: 10, us: "5" }, { mm: 16.1, ir: 11, us: "5.5" },
  { mm: 16.5, ir: 12, us: "6" }, { mm: 16.9, ir: 13, us: "6.5" }, { mm: 17.3, ir: 14, us: "7" },
  { mm: 17.7, ir: 15, us: "7.5" }, { mm: 18.1, ir: 16, us: "8" }, { mm: 18.5, ir: 17, us: "8.5" },
  { mm: 19.0, ir: 18, us: "9" }, { mm: 19.4, ir: 19, us: "9.5" }, { mm: 19.8, ir: 20, us: "10" },
];

export function SizeGuidePage() {
  const [tab, setTab] = useState("ring");
  const [mm, setMm] = useState(17);
  const [bracelet, setBracelet] = useState(17);
  const toast = useToast();
  const { user } = useApp();

  const nearest = useMemo(() => [...ringSizeTable].sort((a, b) => Math.abs(a.mm - mm) - Math.abs(b.mm - mm))[0], [mm]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-7">
        <h1 className="text-[26px] font-black text-charcoal-900">راهنمای سایز</h1>
        <p className="text-[13.5px] text-charcoal-500 mt-1.5 leading-6">سایز دقیق، هدیه‌ای است که اندازه می‌شود. قطر داخلی انگشتر یا دور مچ را با خط‌کش میلی‌متری اندازه بگیرید.</p>
      </div>
      <Tabs value={tab} onChange={setTab} items={[
        { key: "ring", label: "انگشتر" },
        { key: "bracelet", label: "دستبند و النگو" },
      ]} />
      {tab === "ring" ? (
        <div className="grid lg:grid-cols-2 gap-5 mt-6">
          <Card className="p-6">
            <p className="text-[13px] font-bold mb-4 flex items-center gap-2"><Ruler size={15} className="text-gold-600" /> قطر داخلی انگشتر (میلی‌متر)</p>
            <Slider value={mm} min={14} max={22} step={0.1} onChange={setMm} unit="mm" />
            <div className="mt-6 bg-charcoal-900 rounded-card p-5 text-cream-0 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-[11px] text-cream-0/50">قطر</p><p className="text-[19px] font-black tnum text-gold-500 mt-1">{fa(mm.toFixed(1))} mm</p></div>
              <div><p className="text-[11px] text-cream-0/50">سایز ایران</p><p className="text-[19px] font-black tnum mt-1">{fa(nearest.ir)}</p></div>
              <div><p className="text-[11px] text-cream-0/50">سایز US</p><p className="text-[19px] font-black tnum mt-1" dir="ltr">{nearest.us}</p></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" icon={<Printer size={15} />} onClick={() => window.print()}>چاپ راهنما</Button>
              <Button icon={<Save size={15} />} onClick={() => user ? toast("سایز شما ذخیره شد") : toast("برای ذخیره سایز وارد شوید", "warning")}>ذخیره سایز من</Button>
            </div>
          </Card>
          <Card pad={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr className="bg-cream-50 text-charcoal-500 text-[11px]"><th className="px-4 py-3 text-start font-medium">قطر (mm)</th><th className="px-4 py-3 text-start font-medium">سایز ایران</th><th className="px-4 py-3 text-start font-medium">US</th></tr></thead>
                <tbody className="divide-y divide-inkline/70">
                  {ringSizeTable.map((r) => (
                    <tr key={r.ir} className={cn(nearest.ir === r.ir && "bg-gold-100/60 font-bold")}>
                      <td className="px-4 py-2.5 tnum">{fa(r.mm.toFixed(1))}</td>
                      <td className="px-4 py-2.5 tnum">{fa(r.ir)}</td>
                      <td className="px-4 py-2.5 tnum" dir="ltr">{r.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6 mt-6 max-w-xl">
          <p className="text-[13px] font-bold mb-4 flex items-center gap-2"><Ruler size={15} className="text-gold-600" /> دور مچ دست (سانتی‌متر)</p>
          <Slider value={bracelet} min={13} max={22} onChange={setBracelet} unit="cm" />
          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <div className="border border-inkline rounded-card p-4"><p className="text-[12px] text-charcoal-500">دستبند زنجیری</p><p className="text-[17px] font-black tnum mt-1">{fa(bracelet + 1)} سانتی‌متر</p></div>
            <div className="border border-inkline rounded-card p-4"><p className="text-[12px] text-charcoal-500">النگو</p><p className="text-[17px] font-black tnum mt-1">قطر {fa(((bracelet + 1.5) / Math.PI).toFixed(1))} سانتی‌متر</p></div>
          </div>
          <p className="text-[12px] text-charcoal-500 leading-6 mt-4">برای النگو، کاغذی به دور مچ بپیچید و محل تلاقی را علامت بزنید؛ سپس طول را با خط‌کش بخوانید.</p>
        </Card>
      )}
    </div>
  );
}

/* ================================ AboutPage ================================ */
export function AboutPage() {
  return (
    <div>
      <section className="relative">
        <img src={IMG.vault} alt="خزانه طلای زرون" className="h-72 sm:h-96 w-full object-cover" />
        <div className="absolute inset-0 bg-charcoal-900/70" />
        <div className="absolute inset-0 grid place-items-center text-center px-4">
          <div className="anim-fade-up max-w-2xl">
            <p className="font-display text-[13px] tracking-[0.3em] text-gold-500 uppercase">Since 1402 — Tehran</p>
            <h1 className="text-[30px] sm:text-[38px] font-black text-cream-0 mt-3 leading-[1.5]">خزانه‌ای که می‌توانید ببینید</h1>
            <p className="text-[14px] text-cream-0/75 leading-7 mt-4">هر میلی‌گرم طلای دیجیتال زرون، پشتوانه فیزیکی در خزانه بیمه‌شده دارد و نسبت پشتیبانی آن ماهانه منتشر می‌شود.</p>
          </div>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-5">
        {[
          { icon: <Landmark size={20} />, t: "خزانه و امنیت", d: "طلای مشتریان در خزانه طبقه منفی سه، با بیمه کامل و حسابرسی ماهانه نگهداری می‌شود. تحویل فیزیکی هر زمان که بخواهید ممکن است." },
          { icon: <FileCheck2 size={20} />, t: "مجوزها", d: "پروانه کسب از اتحادیه طلا و جواهر تهران، نماد اعتماد الکترونیکی و عضویت در شبکه شتاب برای تسویه آنی." },
          { icon: <Gem size={20} />, t: "کارگاه", d: "جواهرات زرون در کارگاه اختصاصی با عیار استاندارد ۷۵۰ ساخته می‌شود؛ هر قطعه شناسنامه عیار و گارانتی دارد." },
        ].map((c) => (
          <div key={c.t} className="bg-cream-0 border border-inkline rounded-card p-6 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] transition-all">
            <span className="h-11 w-11 rounded-card bg-gold-50 border border-gold-100 grid place-items-center text-gold-600">{c.icon}</span>
            <h3 className="text-[15px] font-bold mt-4">{c.t}</h3>
            <p className="text-[12.5px] text-charcoal-500 leading-6 mt-2">{c.d}</p>
          </div>
        ))}
      </section>
      <section className="max-w-3xl mx-auto px-4 pb-14">
        <h2 className="text-[19px] font-black mb-6">مسیر زرون</h2>
        <ol className="relative ms-3">
          {[
            ["۱۴۰۲", "تأسیس کارگاه و فروشگاه حضوری در بازار بزرگ"],
            ["۱۴۰۳", "راه‌اندازی خزانه بیمه‌شده و خرید میلی‌گرمی"],
            ["۱۴۰۴", "عبور از ۴۰۰ هزار مشتری و انتشار نسبت پشتیبانی"],
            ["۱۴۰۵", "تابلوی لحظه‌ای ۲۴/۷ و تحویل در ۳۱ استان"],
          ].map(([y, t], i, arr) => (
            <li key={y} className="relative ps-7 pb-7 last:pb-0">
              {i < arr.length - 1 && <span className="absolute start-[5px] top-5 bottom-0 w-px bg-inkline" />}
              <span className="absolute start-0 top-1 h-[11px] w-[11px] rounded-full bg-gold-500 border-2 border-gold-200" />
              <p className="text-[13px] font-black text-gold-700 tnum">{y}</p>
              <p className="text-[13.5px] text-charcoal-700 mt-0.5">{t}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ================================ FaqPage ================================ */
export function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-[26px] font-black text-charcoal-900 mb-1.5">سؤالات متداول</h1>
      <p className="text-[13.5px] text-charcoal-500 mb-7">پاسخ پرسش‌های پرتکرار درباره کارمزد، خزانه، تحویل، فاکتور و احراز هویت.</p>
      <Accordion items={[
        { title: "کارمزد معامله چقدر است؟", body: "خرید و فروش طلای آب‌شده فقط اسپرد اعلام‌شده روی تابلو دارد (معمولاً ۴۵ تا ۶۰ واحد پایه). جواهرات اجرت ساخت دارند که پیش از پرداخت، شفاف نمایش داده می‌شود — هیچ کارمزد پنهانی وجود ندارد." },
        { title: "طلای من کجا نگهداری می‌شود؟", body: "در خزانه بیمه‌شده زرون در تهران. هر میلی‌گرم خرید شما به‌صورت لات ثبت می‌شود و نسبت پشتیبانی خزانه ماهانه منتشر می‌شود. هر زمان بخواهید می‌توانید معادل فیزیکی را تحویل بگیرید." },
        { title: "تحویل فیزیکی چطور انجام می‌شود؟", body: "پس از احراز هویت، درخواست تحویل ثبت می‌کنید. مرسوله با بسته‌بندی پلمب ضدتقلب، بیمه کامل و کد رهگیری پست ارسال می‌شود؛ در شهر تهران تحویل اکسپرس همان روز هم داریم." },
        { title: "فاکتور رسمی صادر می‌شود؟", body: "بله. برای هر معامله و سفارش، فاکتور رسمی با جزئیات عیار، وزن و اجرت صادر و در بخش فاکتورها قابل دانلود است." },
        { title: "احراز هویت چقدر طول می‌کشد؟", body: "معمولاً کمتر از ۲ ساعت در روزهای کاری. بدون احراز هویت هم می‌توانید تا سقف روزانه ۵۰ میلیون ریال معامله کنید؛ برای تحویل فیزیکی و مبالغ بالاتر، احراز الزامی است." },
      ]} />
    </div>
  );
}

/* ================================ ContactPage ================================ */
export function ContactPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 grid md:grid-cols-5 gap-6">
      <div className="md:col-span-3">
        <h1 className="text-[26px] font-black text-charcoal-900">تماس با زرون</h1>
        <p className="text-[13.5px] text-charcoal-500 mt-1.5 mb-6 leading-6">پیام شما مستقیم به تیم پشتیبانی می‌رسد؛ پاسخ حداکثر تا ۲۴ ساعت.</p>
        <div className="space-y-4">
          <Input label="نام و نام خانوادگی" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً سارا کریمی" />
          <MobileInput label="شماره تماس" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Textarea label="پیام شما" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="چطور می‌توانیم کمک کنیم؟" />
          <Button size="lg" loading={busy} disabled={!name || mobile.length !== 11 || msg.length < 5} onClick={async () => {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 900));
            setBusy(false);
            toast("پیام شما ارسال شد — به‌زودی تماس می‌گیریم");
            setName(""); setMobile(""); setMsg("");
          }}>ارسال پیام</Button>
        </div>
      </div>
      <div className="md:col-span-2 space-y-3.5">
        <Card className="flex items-center gap-3.5"><span className="h-10 w-10 rounded-card bg-gold-50 border border-gold-100 grid place-items-center text-gold-600"><PhoneCall size={17} /></span><div><p className="text-[12px] text-charcoal-500">تلفن پشتیبانی</p><p className="text-[14px] font-black tnum" dir="ltr">۰۲۱-۹۱۰۰۰۰۰۰</p></div></Card>
        <Card className="flex items-center gap-3.5"><span className="h-10 w-10 rounded-card bg-gold-50 border border-gold-100 grid place-items-center text-gold-600"><PackageCheck size={17} /></span><div><p className="text-[12px] text-charcoal-500">نشانی فروشگاه</p><p className="text-[12.5px] font-bold">تهران، خیابان فردوسی، مجتمع طلای زرون</p></div></Card>
        <Card className="flex items-center gap-3.5"><span className="h-10 w-10 rounded-card bg-gold-50 border border-gold-100 grid place-items-center text-gold-600"><CheckCircle2 size={17} /></span><div><p className="text-[12px] text-charcoal-500">ساعت پاسخگویی</p><p className="text-[12.5px] font-bold">همه‌روزه ۹ تا ۲۱ — معامله ۲۴/۷</p></div></Card>
      </div>
    </div>
  );
}
