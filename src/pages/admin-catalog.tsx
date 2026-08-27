import { useMemo, useState } from "react";
import type { Category, Product } from "../types";
import { adminApi, catalogApi, pricingApi } from "../api";
import { cn, fa, formatIrr, formatMg, jalaliDate, usePageData } from "../lib";
import { Badge, Button, Card, DataTable, Drawer, FileDropzone, Input, Modal, MoneyInput, PageHead, Select, Skeleton, Switch, Textarea, type Column } from "../components/ui";
import { Banner, EmptyState, ErrorState, StalePriceBanner, useToast } from "../components/feedback";
import { GoldAreaChart, GaugeChart } from "../components/charts";
import { Plus, Pencil, Trash2, Search, Boxes, Landmark, ShieldOff, CandlestickChart, FolderPlus, GripVertical } from "../components/icons";

const STATUS_FA: Record<string, { label: string; status: "success" | "neutral" | "danger" | "warning" }> = {
  active: { label: "فعال", status: "success" }, draft: { label: "پیش‌نویس", status: "neutral" },
  inactive: { label: "غیرفعال", status: "warning" }, out_of_stock: { label: "ناموجود", status: "danger" },
};
const TYPE_FA: Record<string, string> = { jewelry: "جواهرات", bar: "شمش", coin: "سکه", melted: "آب‌شده" };

/* ================================ AdminProductsPage ================================ */
export function AdminProductsPage() {
  const products = usePageData(() => catalogApi.products({}));
  const [q, setQ] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteFor, setDeleteFor] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const filtered = useMemo(() => (products.data?.data ?? []).filter((p) =>
    !q || p.name.includes(q) || p.sku.toLowerCase().includes(q.toLowerCase())), [products.data, q]);

  return (
    <div>
      <PageHead title="محصولات" subtitle="مدیریت کاتالوگ، اجرت و انتشار"
        actions={<Button icon={<Plus size={15} />} onClick={() => { setEditing(null); setEditOpen(true); }}>محصول جدید</Button>} />
      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا SKU…" className="w-full h-10 rounded-[8px] border border-inkline bg-cream-0 ps-9 pe-3 text-[13px] focus-ring focus:border-gold-500" />
      </div>
      {products.error ? <Card pad={false}><ErrorState message={products.error} onRetry={products.retry} /></Card> : (
        <DataTable<Product>
          columns={[
            { key: "thumb", header: "تصویر", render: (p) => <img src={p.images[0]} alt="" className="h-11 w-11 rounded-lg object-cover bg-cream-100" /> },
            { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-[11.5px]" dir="ltr">{p.sku}</span> },
            { key: "name", header: "نام", render: (p) => <b className="text-[13px]">{p.name}</b> },
            { key: "type", header: "نوع", render: (p) => <Badge status="neutral">{TYPE_FA[p.type]}</Badge> },
            { key: "karat", header: "عیار", align: "center", render: (p) => <span className="tnum font-bold">{fa(p.karat)}</span> },
            { key: "weight_mg", header: "وزن", align: "end", render: (p) => <span className="tnum">{formatMg(p.weight_mg)}</span> },
            { key: "quote_irr", header: "قیمت", align: "end", render: (p) => <b className="tnum">{formatIrr(p.quote_irr ?? p.ask_irr ?? 0)}</b> },
            { key: "status", header: "وضعیت", render: (p) => <Badge status={STATUS_FA[p.status]?.status}>{STATUS_FA[p.status]?.label}</Badge> },
          ]}
          rows={filtered} loading={products.loading}
          actions={(p) => (
            <div className="flex justify-end gap-1">
              <button aria-label="ویرایش" className="p-2 rounded-md text-charcoal-500 hover:text-gold-700 hover:bg-gold-50 transition-colors" onClick={() => { setEditing(p); setEditOpen(true); }}><Pencil size={15} /></button>
              <button aria-label="حذف" className="p-2 rounded-md text-charcoal-500 hover:text-danger hover:bg-danger/10 transition-colors" onClick={() => setDeleteFor(p)}><Trash2 size={15} /></button>
            </div>
          )}
          empty={<EmptyState icon={<Boxes size={24} />} title="محصولی نیست" action={<Button size="sm" onClick={() => setEditOpen(true)}>افزودن محصول</Button>} /> as never}
        />
      )}

      <ProductFormDrawer open={editOpen} onClose={() => setEditOpen(false)} product={editing} onSaved={() => { setEditOpen(false); products.retry(); }} />

      <Modal open={!!deleteFor} onClose={() => setDeleteFor(null)} title="حذف محصول" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setDeleteFor(null)}>انصراف</Button>
          <Button variant="danger" loading={busy} onClick={async () => {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 700));
            setBusy(false); setDeleteFor(null);
            products.retry();
            toast("محصول حذف شد", "info");
          }}>حذف دائمی</Button>
        </>}>
        <p className="text-[13.5px] leading-7 text-charcoal-700">
          «<b>{deleteFor?.name}</b>» برای همیشه حذف می‌شود و از فروشگاه خارج خواهد شد. این عمل قابل بازگشت نیست.
        </p>
      </Modal>
    </div>
  );
}

function ProductFormDrawer({ open, onClose, product, onSaved }: { open: boolean; onClose: () => void; product: Product | null; onSaved: () => void }) {
  const [form, setForm] = useState({ sku: "", name: "", type: "jewelry", karat: 18, weight_mg: 1000, making: 0, desc: "", status: "draft" });
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const toast = useToast();

  useMemo(() => {
    if (open) {
      setForm(product
        ? { sku: product.sku, name: product.name, type: product.type, karat: product.karat, weight_mg: product.weight_mg, making: product.making_charge_irr, desc: product.description ?? "", status: product.status }
        : { sku: "", name: "", type: "jewelry", karat: 18, weight_mg: 1000, making: 0, desc: "", status: "draft" });
      setFiles([]);
    }
  }, [open, product]);

  return (
    <Drawer open={open} onClose={onClose} title={product ? `ویرایش ${product.name}` : "محصول جدید"}
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button variant="secondary" onClick={async () => { setForm({ ...form, status: "draft" }); await save("draft"); }}>ذخیره پیش‌نویس</Button>
          <Button className="flex-1" loading={busy} onClick={() => save("active")}>انتشار محصول</Button>
        </div>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3.5">
          <Input label="SKU" dir="ltr" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="BR-18-000" error={err && !form.sku ? "الزامی" : undefined} />
          <Select label="نوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[{ value: "jewelry", label: "جواهرات" }, { value: "bar", label: "شمش" }, { value: "coin", label: "سکه" }, { value: "melted", label: "آب‌شده" }]} />
        </div>
        <Input label="نام محصول" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={err && !form.name ? "الزامی" : undefined} />
        <div className="grid grid-cols-2 gap-3.5">
          <Select label="عیار" value={form.karat} onChange={(e) => setForm({ ...form, karat: Number(e.target.value) })} options={[{ value: 18, label: "۱۸ عیار" }, { value: 24, label: "۲۴ عیار" }]} />
          <MoneyInput label="وزن (mg)" value={form.weight_mg} onChange={(v) => setForm({ ...form, weight_mg: v })} />
        </div>
        <MoneyInput label="اجرت ساخت (ریال)" value={form.making} onChange={(v) => setForm({ ...form, making: v })} />
        <Textarea label="شرح محصول" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
        <FileDropzone label="تصاویر و فایل ۳۶۰ درجه" files={files} onFiles={setFiles} hint="چند تصویر + فایل چرخش ۳۶۰" />
        <p className="text-[11.5px] text-charcoal-500 leading-5">قیمت به‌صورت خودکار از نرخ لحظه‌ای + اجرت محاسبه می‌شود.</p>
      </div>
    </Drawer>
  );

  async function save(status: string) {
    if (!form.sku || !form.name) { setErr("required"); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    toast(status === "active" ? "محصول منتشر شد" : "پیش‌نویس ذخیره شد");
    onSaved();
  }
}

/* ================================ AdminCategoriesPage ================================ */
export function AdminCategoriesPage() {
  const cats = usePageData(() => catalogApi.categories());
  const [newName, setNewName] = useState("");
  const [parent, setParent] = useState<number | null>(null);
  const toast = useToast();

  return (
    <div className="max-w-3xl">
      <PageHead title="دسته‌بندی‌ها" subtitle="درخت دسته‌ها، فعال‌سازی و ترتیب نمایش" />
      <Card className="mb-5 flex flex-wrap items-end gap-3">
        <Input label="دسته جدید" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثلاً: پابند" className="flex-1 min-w-44" />
        <Select label="زیرمجموعهٔ" value={parent ?? ""} onChange={(e) => setParent(e.target.value ? Number(e.target.value) : null)} className="min-w-40"
          options={[{ value: "", label: "(دسته اصلی)" }, ...(cats.data ?? []).map((c) => ({ value: Number(c.id), label: c.name }))]} />
        <Button icon={<FolderPlus size={15} />} disabled={newName.trim().length < 2} onClick={() => { setNewName(""); toast("دسته‌بندی افزوده شد"); }}>افزودن</Button>
      </Card>
      {cats.loading ? <div className="space-y-2.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        : cats.error ? <Card pad={false}><ErrorState message={cats.error} onRetry={cats.retry} /></Card>
        : (
          <div className="space-y-3">
            {(cats.data ?? []).map((c, idx) => (
              <div key={String(c.id)}>
                <CategoryRow c={c} idx={idx} toast={toast} />
                {c.children && c.children.length > 0 && (
                  <div className="ms-8 mt-2.5 space-y-2 border-s-2 border-inkline ps-4">
                    {c.children.map((ch, i) => <CategoryRow key={String(ch.id)} c={ch} idx={i} toast={toast} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function CategoryRow({ c, idx, toast }: { c: Category; idx: number; toast: (m: string, k?: "success" | "info") => void }) {
  return (
    <div className="flex items-center gap-3 bg-cream-0 border border-inkline rounded-card px-4 py-3 hover:border-gold-300 transition-colors">
      <GripVertical size={15} className="text-charcoal-500/50 cursor-grab" />
      <span className="text-[11px] font-black text-charcoal-500 tnum w-5">{fa(idx + 1)}</span>
      <span className="flex-1 text-[13.5px] font-bold">{c.name}</span>
      <Badge status="neutral">{c.type === "jewelry" ? "جواهرات" : c.type === "bullion" ? "شمش و سکه" : "آب‌شده"}</Badge>
      <span className="text-[11px] text-charcoal-500 tnum">{fa(c.slug)} </span>
      <Switch checked={c.is_active} onChange={(v) => toast(v ? `«${c.name}» فعال شد` : `«${c.name}» غیرفعال شد`, "info")} />
    </div>
  );
}

/* ================================ AdminInventoryPage ================================ */
export function AdminInventoryPage() {
  const inv = usePageData(() => adminApi.inventory());
  const dash = usePageData(() => adminApi.dashboard());
  const toast = useToast();
  const [lotOpen, setLotOpen] = useState(false);
  const [lotSku, setLotSku] = useState("");
  const [lotQty, setLotQty] = useState(0);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <PageHead title="موجودی و خزانه" subtitle="لات‌های خزانه و سلامت موجودی انبار"
        actions={<Button icon={<Plus size={15} />} onClick={() => { setLotSku("BAR-24-50"); setLotQty(0); setLotOpen(true); }}>افزودن لات خزانه</Button>} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <h2 className="text-[15px] font-black mb-3">انبار فروشگاه</h2>
          {inv.error ? <Card pad={false}><ErrorState message={inv.error} onRetry={inv.retry} /></Card>
            : inv.loading ? <div className="space-y-2.5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            : (
              <Card pad={false}>
                <ul className="divide-y divide-inkline/70">
                  {inv.data?.map((r) => (
                    <li key={r.sku} className="flex items-center gap-3 px-4 py-3">
                      <Boxes size={16} className={r.on_hand <= r.reorder ? "text-warning" : "text-gold-600"} />
                      <span className="flex-1"><b className="block text-[13px]">{r.name}</b><span className="text-[11px] text-charcoal-500 font-mono" dir="ltr">{r.sku}</span></span>
                      {r.on_hand <= r.reorder && <Badge status="warning">کمبود — سفارش کارگاه</Badge>}
                      <span className="tnum font-black text-[15px] w-10 text-end">{fa(r.on_hand)}</span>
                      <span className="text-[11px] text-charcoal-500 tnum">رزرو {fa(r.reserved)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
        </div>
        <div className="space-y-5">
          <GaugeChart title="نسبت پشتیبانی خزانه" pct={dash.data?.solvency.ratio_pct ?? 0} label="vault / liabilities"
            loading={dash.loading} error={dash.error} onRetry={dash.retry} />
          <Card>
            <h3 className="text-[13.5px] font-black mb-3 flex items-center gap-2"><Landmark size={15} className="text-gold-600" /> لات‌های خزانه</h3>
            <ul className="space-y-2 text-[12.5px]">
              {[
                ["شمش ۱۰۰ گرمی × ۸۴", "۸٬۴۰۰٬۰۰۰ mg"],
                ["شمش ۵۰ گرمی × ۱۱۲", "۵٬۶۰۰٬۰۰۰ mg"],
                ["سکه بهار × ۵۴۳", "۴٬۴۲۰٬۰۰۰ mg"],
              ].map(([t, v]) => (
                <li key={t} className="flex justify-between border border-inkline rounded-lg px-3 py-2.5"><span>{t}</span><b className="tnum">{v}</b></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={lotOpen} onClose={() => setLotOpen(false)} title="افزودن لات به خزانه" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setLotOpen(false)}>انصراف</Button>
          <Button loading={busy} disabled={!lotSku || lotQty <= 0} onClick={async () => {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 800));
            setBusy(false); setLotOpen(false);
            toast("لات خزانه ثبت شد");
          }}>ثبت لات</Button>
        </>}>
        <div className="space-y-4">
          <Select label="SKU" value={lotSku} onChange={(e) => setLotSku(e.target.value)}
            options={(catalogApi.all).map((p) => ({ value: p.sku, label: `${p.sku} — ${p.name}` }))} />
          <MoneyInput label="وزن لات (mg)" value={lotQty} onChange={setLotQty} min={1000} />
          <p className="text-[11.5px] text-charcoal-500 leading-5">لات با سریال یکتا ثبت و به نسبت پشتیبانی اضافه می‌شود.</p>
        </div>
      </Modal>
    </div>
  );
}

/* ================================ AdminPricingPage ================================ */
export function AdminPricingPage() {
  const spot = usePageData(() => pricingApi.spot());
  const h = usePageData(() => pricingApi.history("1M", 18));
  const [bidBps, setBidBps] = useState(adminApi.settings.bid_bps);
  const [askBps, setAskBps] = useState(adminApi.settings.ask_bps);
  const [manual, setManual] = useState(0);
  const [busy, setBusy] = useState(false);
  const [haltOpen, setHaltOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const toast = useToast();
  const s18 = spot.data?.[0];
  const stale = (s18?.stale_seconds ?? 0) > 30;
  const halted = adminApi.settings.trading_halt;

  return (
    <div>
      <PageHead title="قیمت‌گذاری" subtitle="نرخ پایه، اسپرد و کنترل توقف بازار"
        actions={<Button variant="danger" icon={<ShieldOff size={15} />} onClick={() => { setHaltOpen(true); setConfirmText(""); }}>توقف بازار</Button>} />

      {halted && <div className="mb-4"><Banner kind="halt"><ShieldOff size={15} className="inline -mt-0.5 me-1" /> بازار متوقف است — قیمت‌ها برای معامله قفل هستند.</Banner></div>}
      {stale && !halted && <div className="mb-4"><StalePriceBanner seconds={s18?.stale_seconds ?? 0} /></div>}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {spot.loading ? [0, 1].map((i) => <Skeleton key={i} className="h-32" />) : spot.data?.map((s) => (
              <Card key={s.karat}>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-charcoal-500 flex items-center gap-2"><CandlestickChart size={14} className="text-gold-600" /> طلای {fa(s.karat)} عیار</p>
                  <Badge status={s.trading_halt ? "halted" : "success"}>{s.trading_halt ? "متوقف" : "فعال"}</Badge>
                </div>
                <p className="text-[22px] font-black tnum mt-2">{formatIrr(s.price_irr_per_gram)} <span className="text-[11px] font-medium text-charcoal-500">ریال/گرم</span></p>
                <div className="flex gap-4 mt-2 text-[11.5px] tnum">
                  <span className="text-danger">Bid {formatIrr(s.bid_irr)}</span>
                  <span className="text-success">Ask {formatIrr(s.ask_irr)}</span>
                </div>
                <p className="text-[10.5px] text-charcoal-500 mt-2 tnum">آخرین مشاهده: {jalaliDate(s.observed_at)} — {s.observed_at.slice(11, 16)}</p>
              </Card>
            ))}
          </div>
          <GoldAreaChart title="تاریخچه ۳۰ روزه — ۱۸ عیار" data={(h.data ?? []).map((p) => ({ t: p.t, value: p.price_irr }))} loading={h.loading} error={h.error} onRetry={h.retry} unit="irr" height={240} />
        </div>
        <div className="space-y-5">
          <Card>
            <h3 className="text-[14px] font-black mb-4">تنظیم اسپرد</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[12.5px] font-medium text-charcoal-700 mb-2">Bid (خرید از مشتری): <b className="tnum">{fa(bidBps)}</b> bps</p>
                <input type="range" min={0} max={200} value={bidBps} onChange={(e) => setBidBps(Number(e.target.value))} className="zr-slider w-full" style={{ ["--fill" as string]: `${(bidBps / 200) * 100}%` }} dir="ltr" aria-label="اسپرد خرید" />
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-charcoal-700 mb-2">Ask (فروش به مشتری): <b className="tnum">{fa(askBps)}</b> bps</p>
                <input type="range" min={0} max={200} value={askBps} onChange={(e) => setAskBps(Number(e.target.value))} className="zr-slider w-full" style={{ ["--fill" as string]: `${(askBps / 200) * 100}%` }} dir="ltr" aria-label="اسپرد فروش" />
              </div>
              <Button full loading={busy} onClick={async () => {
                setBusy(true);
                await adminApi.saveSettings({ bid_bps: bidBps, ask_bps: askBps });
                spot.retry();
                setBusy(false);
                toast("اسپرد به‌روزرسانی شد");
              }}>ذخیره اسپرد</Button>
            </div>
          </Card>
          <Card>
            <h3 className="text-[14px] font-black mb-3">قیمت دستی (اضطراری)</h3>
            <MoneyInput label="نرخ ۱۸ عیار (ریال/گرم)" value={manual} onChange={setManual} min={1_000_000} />
            <Button full variant="secondary" className="mt-3.5" disabled={manual < 1_000_000} loading={busy} onClick={async () => {
              setBusy(true);
              await new Promise((r) => setTimeout(r, 700));
              setBusy(false);
              toast("نرخ دستی ثبت شد — تا اتصال مجدد خوراک بازار معتبر است", "warning");
            }}>ثبت نرخ دستی</Button>
            <p className="text-[11px] text-charcoal-500 leading-5 mt-2.5">فقط وقتی خوراک بازار قطع است؛ رویداد آن در لاگ قیمت ثبت می‌شود.</p>
          </Card>
        </div>
      </div>

      <Modal open={haltOpen} onClose={() => setHaltOpen(false)} title="توقف بازار (Halt)" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setHaltOpen(false)}>انصراف</Button>
          <Button variant="danger" disabled={confirmText !== "HALT"} loading={busy} onClick={async () => {
            setBusy(true);
            await adminApi.saveSettings({ trading_halt: !halted });
            setBusy(false); setHaltOpen(false);
            spot.retry();
            toast(halted ? "بازار دوباره فعال شد" : "بازار متوقف شد", halted ? "success" : "warning");
          }}>{halted ? "فعال‌سازی بازار" : "توقف"}</Button>
        </>}>
        <p className="text-[13px] leading-7 text-charcoal-700">
          برای تأیید {halted ? "فعال‌سازی مجدد" : "توقف"} معاملات، کلمه <b className="text-danger">HALT</b> را وارد کنید.
        </p>
        <input dir="ltr" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="HALT"
          className="mt-3 w-full h-12 rounded-[8px] border-2 border-danger/40 px-4 text-center font-black tracking-[0.3em] uppercase focus-ring" />
      </Modal>
    </div>
  );
}
