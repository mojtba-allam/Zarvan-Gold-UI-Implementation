import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Product, PriceRange } from "../types";
import { catalogApi, orderApi, pricingApi, IMG } from "../api";
import { useApp } from "../auth";
import { cn, fa, formatIrr, formatMg, jalaliDate, timeHHMM, usePageData } from "../lib";
import {
  Badge, Button, Checkbox, DataTable, Drawer, Modal, Pagination,
  Select, Skeleton, Tabs,
} from "../components/ui";
import { EmptyState, StalePriceBanner, TradingHaltedBanner, useToast } from "../components/feedback";
import { GoldAreaChart } from "../components/charts";
import { ProductCard, PackagingPicker } from "../components/commerce";
import {
  SlidersHorizontal, ShoppingBag, Heart, Share2, RotateCw, ZoomIn, BellRing, Download,
  ArrowLeft, Gem, PackagePlus, BadgeCheck,
} from "../components/icons";

/* ================================ CatalogPage ================================ */
export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "all";
  const karat = params.get("karat") ?? "";
  const occ = params.get("occ") ?? "";
  const inStock = params.get("stock") === "1";
  const sort = params.get("sort") ?? "featured";

  const data = usePageData(() => catalogApi.products({ type, karat: karat ? Number(karat) : undefined, q, inStock, sort, page, occ }), [type, karat, q, inStock, sort, page, occ]);

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value); else p.delete(key);
    setParams(p, { replace: true });
    setPage(1);
  };

  const activeCount = [type !== "all", karat, inStock, q, occ].filter(Boolean).length;
  const types = [
    { key: "all", label: "همه" }, { key: "jewelry", label: "جواهرات" }, { key: "coin", label: "سکه" },
    { key: "bar", label: "شمش" }, { key: "melted", label: "آب‌شده" },
  ];

  const Filters = (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-bold text-charcoal-500 mb-2.5">نوع محصول</p>
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <button key={t.key} onClick={() => setParam("type", t.key === "all" ? null : t.key)}
              className={cn("px-3 h-9 rounded-full border text-[12.5px] font-medium transition-all",
                type === t.key ? "bg-charcoal-900 text-cream-0 border-charcoal-900" : "border-inkline bg-cream-0 text-charcoal-700 hover:border-gold-400")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-bold text-charcoal-500 mb-2.5">عیار</p>
        <div className="flex gap-1.5">
          {[["18", "۱۸ عیار"], ["24", "۲۴ عیار"]].map(([v, l]) => (
            <button key={v} onClick={() => setParam("karat", karat === v ? null : v)}
              className={cn("px-4 h-9 rounded-full border text-[12.5px] font-medium transition-all",
                karat === v ? "bg-gold-500 border-gold-500 text-charcoal-900 font-bold" : "border-inkline bg-cream-0 text-charcoal-700 hover:border-gold-400")}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        <p className="text-[12px] font-bold text-charcoal-500">مناسبت</p>
        {["هدیه", "نامزدی", "ازدواج", "جهیزیه"].map((o) => (
          <Checkbox key={o} label={o} checked={occ === o} onChange={(v) => setParam("occ", v ? o : null)} />
        ))}
      </div>
      <Checkbox label="فقط کالاهای موجود" checked={inStock} onChange={(v) => setParam("stock", v ? "1" : null)} />
      <Select label="مرتب‌سازی" value={sort} onChange={(e) => setParam("sort", e.target.value === "featured" ? null : e.target.value)}
        options={[{ value: "featured", label: "پیشنهادی" }, { value: "price_asc", label: "ارزان‌ترین" }, { value: "price_desc", label: "گران‌ترین" }, { value: "weight", label: "سنگین‌ترین" }]} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[24px] font-black text-charcoal-900">فروشگاه زرون</h1>
          <p className="text-[13px] text-charcoal-500 mt-1">{data.data ? `${fa(data.data.meta.total)} محصول` : "جواهرات، سکه و شمش با قیمت لحظه‌ای"}</p>
        </div>
        <Button variant="secondary" className="lg:hidden" icon={<SlidersHorizontal size={15} />} onClick={() => setFiltersOpen(true)}>
          فیلترها {activeCount > 0 && <span className="bg-gold-500 text-charcoal-900 rounded-full h-5 w-5 grid place-items-center text-[10.5px] font-black tnum">{fa(activeCount)}</span>}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-24 bg-cream-0 border border-inkline rounded-card p-4">{Filters}</div>
        </aside>
        <div>
          {data.error ? (
            <div className="bg-cream-0 border border-inkline rounded-card"><EmptyState title="خطا در بارگذاری فروشگاه" body={data.error} action={<Button onClick={data.retry}>تلاش دوباره</Button>} /></div>
          ) : data.loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-cream-0 border border-inkline rounded-card overflow-hidden">
                  <Skeleton className="aspect-[4/3] rounded-none" />
                  <div className="p-3.5 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-5 w-2/3" /></div>
                </div>
              ))}
            </div>
          ) : data.data && data.data.data.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
                {data.data.data.map((p) => <ProductCard key={p.sku} product={p} />)}
              </div>
              <Pagination page={page} totalPages={Math.max(1, data.data.meta.last_page)} onPage={setPage} total={data.data.meta.total} />
            </>
          ) : (
            <div className="bg-cream-0 border border-inkline rounded-card">
              <EmptyState icon={<Gem size={24} />} title="محصولی با این فیلتر نیست"
                body="فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید."
                action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>حذف همه فیلترها</Button>} />
            </div>
          )}
        </div>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="فیلترها"
        footer={<Button full onClick={() => setFiltersOpen(false)}>اعمال فیلترها</Button>}>
        {Filters}
      </Drawer>
    </div>
  );
}

/* ================================ ProductDetailPage ================================ */
export function ProductDetailPage() {
  const { slug } = useParams();
  const data = usePageData(() => catalogApi.productBySlug(slug ?? ""), [slug]);
  const [img, setImg] = useState(0);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [qty, setQty] = useState(1);
  const [packaging, setPackaging] = useState<"standard" | "luxury">("standard");
  const [reserveOpen, setReserveOpen] = useState(false);
  const [wish, setWish] = useState(false);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const { user, refreshCart } = useApp();
  const navigate = useNavigate();

  const p = data.data;
  const isBullion = p?.type === "bar" || p?.type === "coin";
  const making = p ? (p.making_charge_type === "per_gram" ? Math.round((p.weight_mg / 1000) * p.making_charge_irr) : p.making_charge_irr) : 0;
  const goldValue = p ? Math.round((p.weight_mg / 1000) * (p.karat === 18 ? 3_520_000 : 4_690_000)) : 0;

  const add = async () => {
    if (!p) return;
    if (!user) { navigate("/login"); return; }
    setAdding(true);
    try {
      await orderApi.addLine(Number(p.id), qty);
      await refreshCart();
      toast("افزوده شد به سبد");
    } catch { toast("خطا در افزودن به سبد", "error"); }
    finally { setAdding(false); }
  };

  if (data.loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-8">
      <Skeleton className="aspect-square" /><div className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-32" /><Skeleton className="h-12 w-1/2" /></div>
    </div>
  );
  if (data.error || !p) return (
    <div className="max-w-3xl mx-auto px-4 py-16 bg-cream-0 border border-inkline rounded-card">
      <EmptyState icon={<Gem size={24} />} title="محصول پیدا نشد" body="ممکن است این محصول از فروشگاه حذف شده باشد."
        action={<Link to="/catalog"><Button>بازگشت به فروشگاه</Button></Link>} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <nav className="text-[12px] text-charcoal-500 mb-5 flex items-center gap-1.5">
        <Link to="/catalog" className="hover:text-gold-700">فروشگاه</Link><span>/</span><span className="font-bold text-charcoal-900">{p.name}</span>
      </nav>
      <div className="grid lg:grid-cols-2 gap-8">
        {/* gallery */}
        <div>
          <div className={cn("relative aspect-square rounded-card overflow-hidden border border-inkline bg-cream-100 select-none", p.has_360 && "cursor-grab active:cursor-grabbing")}
            onPointerDown={(e) => { if (p.has_360) { setDragging(true); (e.target as HTMLElement).setPointerCapture(e.pointerId); } }}
            onPointerUp={() => setDragging(false)}
            onPointerMove={(e) => { if (dragging && p.has_360) setRot((r) => r + e.movementX * 0.8); }}
            onClick={() => setLightbox(true)}>
            <img src={p.images[img]} alt={p.name} className="h-full w-full object-cover transition-transform duration-300"
              style={p.has_360 ? { transform: `scaleX(${Math.cos((rot * Math.PI) / 180)}) scale(1.08)` } : undefined} draggable={false} />
            <button className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 bg-charcoal-900/80 text-cream-0 text-[11px] font-bold rounded-full px-3 py-1.5 backdrop-blur-sm" aria-label="نمایش تمام‌صفحه">
              <ZoomIn size={13} /> بزرگ‌نمایی
            </button>
            {p.has_360 && (
              <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 bg-gold-500 text-charcoal-900 text-[11px] font-black rounded-full px-3 py-1.5">
                <RotateCw size={12} /> بکشید تا بچرخد — {fa(Math.round(((rot % 360) + 360) % 360))}°
              </span>
            )}
          </div>
        </div>

        {/* info */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge status="gold">{fa(p.karat)} عیار</Badge>
                <Badge status={p.status === "out_of_stock" ? "danger" : "success"}>{p.status === "out_of_stock" ? "اتمام موجودی" : `موجود: ${fa(p.stock_on_hand ?? 0)} عدد`}</Badge>
              </div>
              <h1 className="text-[24px] font-black text-charcoal-900">{p.name}</h1>
              <p className="text-[12px] text-charcoal-500 mt-1 font-mono" dir="ltr">SKU: {p.sku}</p>
            </div>
            <div className="flex gap-1.5">
              <button aria-label="علاقه‌مندی" aria-pressed={wish} onClick={() => { setWish(!wish); toast(wish ? "از علاقه‌مندی‌ها حذف شد" : "به علاقه‌مندی‌ها اضافه شد", "info"); }}
                className={cn("h-11 w-11 rounded-[8px] border grid place-items-center transition-all active:scale-90", wish ? "bg-danger/10 border-danger/30 text-danger" : "border-inkline text-charcoal-500 hover:text-danger hover:border-danger/40")}>
                <Heart size={17} fill={wish ? "currentColor" : "none"} />
              </button>
              <button aria-label="اشتراک‌گذاری" onClick={async () => { const ok = await import("../lib").then((l) => l.copyText(window.location.href)); toast(ok ? "پیوند کپی شد" : "کپی ناموفق بود", ok ? "success" : "error"); }}
                className="h-11 w-11 rounded-[8px] border border-inkline grid place-items-center text-charcoal-500 hover:text-charcoal-900 hover:border-gold-400 transition-all active:scale-90">
                <Share2 size={17} />
              </button>
            </div>
          </div>

          {/* price / quote */}
          <div className="mt-5 bg-charcoal-900 rounded-card p-5 text-cream-0">
            {isBullion ? (
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[11px] text-cream-0/50">فروش به شما (Ask)</p><p className="text-[19px] font-black tnum text-gold-500 mt-1">{formatIrr(p.ask_irr)}</p></div>
                <div><p className="text-[11px] text-cream-0/50">خرید از شما (Bid)</p><p className="text-[19px] font-black tnum text-success mt-1">{formatIrr(p.bid_irr)}</p></div>
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div><p className="text-[11px] text-cream-0/50">قیمت کل با اجرت</p><p className="text-[24px] font-black tnum text-gold-500 mt-1">{formatIrr(p.quote_irr)} <span className="text-[11px] font-medium text-cream-0/50">ریال</span></p></div>
                  <Badge status="gold" className="mb-1"><BadgeCheck size={11} /> قیمت لحظه‌ای</Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-cream-0/10 text-[11.5px]">
                  <div><dt className="text-cream-0/50">ارزش طلا</dt><dd className="font-bold tnum mt-0.5">{formatIrr(goldValue)}</dd></div>
                  <div><dt className="text-cream-0/50">اجرت ساخت</dt><dd className="font-bold tnum mt-0.5">{formatIrr(making)}</dd></div>
                  <div><dt className="text-cream-0/50">وزن</dt><dd className="font-bold tnum mt-0.5">{formatMg(p.weight_mg)}</dd></div>
                </dl>
              </>
            )}
          </div>

          {/* qty + packaging + actions */}
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium text-charcoal-700">تعداد</span>
              <div className="inline-flex items-center border border-inkline rounded-[8px] overflow-hidden bg-cream-0">
                <button className="h-11 w-11 text-[17px] font-bold hover:bg-gold-50 transition-colors" onClick={() => setQty(Math.min(9, qty + 1))} aria-label="افزایش تعداد">+</button>
                <span className="w-10 text-center font-black tnum">{fa(qty)}</span>
                <button className="h-11 w-11 text-[17px] font-bold hover:bg-gold-50 transition-colors disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="کاهش تعداد">−</button>
              </div>
            </div>
            {!isBullion && p.type === "jewelry" && (
              <div>
                <p className="text-[13px] font-medium text-charcoal-700 mb-2">بسته‌بندی</p>
                <PackagingPicker value={packaging} onChange={setPackaging} />
              </div>
            )}
            <div className="flex gap-2.5 pt-1">
              <Button size="lg" full loading={adding} disabled={p.status === "out_of_stock"} icon={<ShoppingBag size={17} />} onClick={add}>
                {p.status === "out_of_stock" ? "ناموجود" : "افزودن به سبد"}
              </Button>
              <Button size="lg" variant="sell" onClick={() => user ? navigate("/app/trade") : navigate("/login")}>خرید فوری</Button>
            </div>
            {p.status === "out_of_stock" ? (
              <Button full variant="secondary" icon={<BellRing size={15} />} onClick={() => toast("به‌محض موجود شدن خبرتان می‌دهیم", "info")}>اطلاع از موجودی</Button>
            ) : (
              <Button full variant="ghost" icon={<PackagePlus size={15} />} onClick={() => user ? setReserveOpen(true) : navigate("/login")}>رزرو با بیعانه ۱۰٪</Button>
            )}
          </div>

          {/* tabs */}
          <div className="mt-7">
            <Tabs size="sm" value="desc" onChange={() => undefined} items={[
              { key: "desc", label: "شرح" }, { key: "spec", label: "مشخصات" }, { key: "fee", label: "اجرت" }, { key: "ship", label: "ارسال" },
            ]} />
            <div className="py-4 text-[13px] leading-7 text-charcoal-700">
              <p>{p.description}</p>
              {p.attributes && (
                <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                  {Object.entries(p.attributes).map(([k, v]) => (
                    <li key={k} className="flex justify-between border border-inkline rounded-lg px-3 py-2 text-[12px]"><span className="text-charcoal-500">{k}</span><b>{String(v)}</b></li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[12px] text-charcoal-500">ارسال با بیمه کامل و بسته‌بندی پلمب؛ در تهران تحویل اکسپرس همان روز. اجرت ساخت این محصول {p.making_charge_type === "per_gram" ? "به ازای هر گرم " + formatIrr(p.making_charge_irr) + " ریال" : "به صورت مقطوع " + formatIrr(p.making_charge_irr) + " ریال"} است.</p>
            </div>
          </div>
        </div>
      </div>

      {/* lightbox */}
      <Modal open={lightbox} onClose={() => setLightbox(false)} title={p.name} size="lg">
        <img src={p.images[img]} alt={p.name} className="w-full max-h-[65vh] object-contain rounded-card bg-cream-100" />
      </Modal>

      <ReserveProductModal open={reserveOpen} onClose={() => setReserveOpen(false)} product={p} />
    </div>
  );
}

function ReserveProductModal({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const deposit = Math.round((product.quote_irr ?? 0) * 0.1);
  return (
    <Modal open={open} onClose={onClose} title="رزرو با بیعانه" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>انصراف</Button>
        <Button loading={busy} onClick={async () => {
          setBusy(true);
          await new Promise((r) => setTimeout(r, 1100));
          setBusy(false); onClose();
          toast("رزرو ثبت شد — ۷۲ ساعت برای تسویه فرصت دارید");
        }}>پرداخت بیعانه</Button>
      </>}>
      <div className="flex gap-3.5">
        <img src={product.images[0]} alt="" className="h-20 w-20 rounded-card object-cover bg-cream-100" />
        <div className="text-[13px] leading-6">
          <p className="font-bold">{product.name}</p>
          <p className="text-charcoal-500 tnum mt-1">قیمت کل: {formatIrr(product.quote_irr)} ریال</p>
          <p className="font-black text-gold-700 tnum">بیعانه (۱۰٪): {formatIrr(deposit)} ریال</p>
        </div>
      </div>
      <p className="text-[12px] text-charcoal-500 leading-6 mt-4 bg-cream-50 border border-inkline rounded-lg p-3">
        پس از رزرو، قیمت تا ۷۲ ساعت برای شما قفل می‌شود. در صورت انصراف، بیعانه به کیف پول برمی‌گردد.
      </p>
    </Modal>
  );
}

/* ================================ LivePricesPage ================================ */
const ranges: PriceRange[] = ["1D", "1W", "1M", "90D", "1Y"];
type Snap = { id: number | string; t: string; price_irr: number };

export function LivePricesPage() {
  const [range, setRange] = useState<PriceRange>("1M");
  const [show24, setShow24] = useState(false);
  const h18 = usePageData(() => pricingApi.history(range, 18), [range]);
  const h24 = usePageData(() => pricingApi.history(range, 24), [range, show24]);
  const spot = usePageData(() => pricingApi.spot());
  const { user } = useApp();
  const navigate = useNavigate();
  const toast = useToast();

  const snapshots = useMemo(() => (h18.data ?? []).slice(-10).reverse(), [h18.data]);

  const exportCsv = () => {
    if (!user) { navigate("/login"); return; }
    const rows = (h18.data ?? []).map((p) => `${p.t},${p.price_irr}`).join("\n");
    const blob = new Blob([`time,price_irr_per_gram_18k\n${rows}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zarvan-gold-18k-${range}.csv`;
    a.click();
    toast("فایل CSV آماده است");
  };

  const stale = (spot.data?.[0]?.stale_seconds ?? 0) > 30;
  const halted = spot.data?.[0]?.trading_halt;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[24px] font-black text-charcoal-900 flex items-center gap-2.5">
            قیمت لحظه‌ای طلا
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 border border-success/20 rounded-full px-2.5 py-1"><span className="h-1.5 w-1.5 rounded-full bg-success live-dot" />زنده</span>
          </h1>
          <p className="text-[13px] text-charcoal-500 mt-1">ریال بر گرم — Bid و Ask اعلام‌شده، بدون کارمزد پنهان</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[8px] border border-inkline bg-cream-0 p-0.5 gap-0.5">
            {ranges.map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={cn("px-3 h-9 rounded-md text-[12px] font-bold transition-all", range === r ? "bg-charcoal-900 text-cream-0" : "text-charcoal-500 hover:text-charcoal-900")}>{r}</button>
            ))}
          </div>
          <Button variant="secondary" icon={<Download size={15} />} onClick={exportCsv}>CSV</Button>
        </div>
      </div>

      {halted ? <div className="mb-4"><TradingHaltedBanner /></div> : stale ? <div className="mb-4"><StalePriceBanner seconds={spot.data?.[0]?.stale_seconds ?? 0} /></div> : null}

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        {spot.loading ? [0, 1].map((i) => <Skeleton key={i} className="h-28" />) : spot.data?.map((s) => (
          <div key={s.karat} className="bg-cream-0 border border-inkline rounded-card p-4 flex items-center justify-between hover:shadow-[var(--shadow-card)] transition-shadow">
            <div>
              <p className="text-[12.5px] font-bold text-charcoal-500">طلای {fa(s.karat)} عیار</p>
              <p className="text-[21px] font-black tnum text-charcoal-900 mt-1">{formatIrr(s.price_irr_per_gram)} <span className="text-[11px] font-medium text-charcoal-500">ریال/گرم</span></p>
              <p className={cn("text-[11.5px] font-bold tnum", (s.change_pct_24h ?? 0) >= 0 ? "text-success" : "text-danger")}>{(s.change_pct_24h ?? 0) >= 0 ? "▲" : "▼"} {fa(Math.abs(s.change_pct_24h ?? 0).toFixed(1))}٪ در ۲۴ ساعت</p>
            </div>
            <div className="text-[11px] tnum space-y-1.5 text-end">
              <p><span className="text-charcoal-500">Bid </span><b className="text-success">{formatIrr(s.bid_irr)}</b></p>
              <p><span className="text-charcoal-500">Ask </span><b className="text-gold-700">{formatIrr(s.ask_irr)}</b></p>
            </div>
          </div>
        ))}
      </div>

      <GoldAreaChart
        title={`نمودار قیمت — طلای ${show24 ? "۱۸ و ۲۴" : "۱۸"} عیار (${range})`}
        data={(h18.data ?? []).map((p) => ({ t: p.t, value: p.price_irr }))}
        data2={show24 ? (h24.data ?? []).map((p) => ({ t: p.t, value: p.price_irr })) : undefined}
        loading={h18.loading} error={h18.error} onRetry={h18.retry} unit="irr" height={320}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11.5px] font-medium text-charcoal-700 cursor-pointer">
              <input type="checkbox" checked={show24} onChange={(e) => setShow24(e.target.checked)} className="accent-[#C9A227]" />
              مقایسه ۲۴ عیار
            </label>
            <span className="flex items-center gap-1 text-[10.5px] text-charcoal-500"><span className="h-0.5 w-4 bg-[#C9A227] rounded" />۱۸ عیار</span>
            {show24 && <span className="flex items-center gap-1 text-[10.5px] text-charcoal-500"><span className="h-0.5 w-4 bg-charcoal-700 rounded border-dashed" />۲۴ عیار</span>}
          </div>
        } />

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <h2 className="text-[15px] font-bold mb-3">۱۰ رویداد آخر قیمت</h2>
          <DataTable<Snap>
            columns={[
              { key: "t", header: "زمان", render: (r) => <span className="tnum text-charcoal-700">{jalaliDate(r.t)} — {timeHHMM(r.t)}</span> },
              { key: "price_irr", header: "ریال/گرم", align: "end", render: (r) => <b className="tnum">{formatIrr(r.price_irr)}</b> },
            ]}
            rows={snapshots.map((s, i) => ({ ...s, id: i }))}
            loading={h18.loading} dense
          />
        </div>
        <div className="bg-gradient-to-b from-gold-50 to-cream-0 border border-gold-200 rounded-card p-6 h-fit">
          <BellRing size={22} className="text-gold-600" />
          <h3 className="text-[16px] font-black mt-3">هشدار قیمت</h3>
          <p className="text-[12.5px] text-charcoal-700 leading-6 mt-1.5">بگو وقتی ۱۸ عیار از ۳٬۶۰۰٬۰۰۰ ریال رد شد، خبرت کنیم.</p>
          <Button className="mt-4" full onClick={() => navigate(user ? "/app/alerts" : "/login")}>ساخت هشدار رایگان</Button>
        </div>
      </div>
    </div>
  );
}
