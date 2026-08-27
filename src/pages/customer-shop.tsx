import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Address, Cart, Fulfillment, Order } from "../types";
import { orderApi, profileApi } from "../api";
import { useApp } from "../auth";
import { cn, fa, formatIrr, formatMg, formatPct, jalaliDate, timeAgo, usePageData } from "../lib";
import {
  Badge, Button, Card, DataTable, Field, Input, Modal, ORDER_STATUS_FA, PageHead, Pagination,
  ProgressStepper, Radio, Select, Skeleton, Timeline, type Column,
} from "../components/ui";
import { Alert, EmptyState, ErrorState, useToast } from "../components/feedback";
import { PackagingPicker } from "../components/commerce";
import {
  ArrowLeft, CheckCircle2, FileText, Landmark, Lock, PackageX, Printer, Download, ShieldCheck,
  ShoppingBag, Ticket, Trash2, Truck, X, Minus, Plus,
} from "../components/icons";

/* ================================ CartPage ================================ */
export function CartPage() {
  const { cart, refreshCart, user } = useApp();
  const [couponOpen, setCouponOpen] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const setQty = async (lineId: number, qty: number) => { await orderApi.setQty(lineId, qty); refreshCart(); };
  const remove = async (lineId: number) => { await orderApi.removeLine(lineId); refreshCart(); toast("از سبد حذف شد", "info"); };

  if (!cart) return <div className="max-w-4xl mx-auto px-4 py-10 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-[24px] font-black mb-6">سبد خرید {cart.lines.length > 0 && <span className="text-[14px] font-medium text-charcoal-500">({fa(cart.lines.length)} قلم)</span>}</h1>
      {cart.lines.length === 0 ? (
        <Card pad={false}>
          <EmptyState icon={<ShoppingBag size={24} />} title="سبد خرید شما خالی است"
            body="جواهرات، سکه و شمش‌های زرون منتظر شما هستند."
            action={<Button size="lg" onClick={() => navigate("/catalog")}>مشاهده فروشگاه</Button>} />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            {cart.lines.map((l) => (
              <Card key={String(l.id)} className="flex gap-4 items-start">
                <img src={l.product?.images[0]} alt="" className="h-24 w-24 rounded-card object-cover bg-cream-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/catalog/${l.product?.slug}`} className="text-[14.5px] font-bold hover:text-gold-700 transition-colors">{l.product?.name}</Link>
                      <p className="text-[11.5px] text-charcoal-500 tnum mt-0.5">{fa(l.product?.karat ?? 18)} عیار · {formatMg(l.product?.weight_mg ?? 0)} · {l.product?.sku}</p>
                    </div>
                    <button onClick={() => remove(Number(l.id))} aria-label="حذف" className="p-2 rounded-md text-charcoal-500 hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={15} /></button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <div className="inline-flex items-center border border-inkline rounded-[8px] overflow-hidden">
                      <button className="h-9 w-9 grid place-items-center hover:bg-gold-50 transition-colors" onClick={() => setQty(Number(l.id), l.qty + 1)} aria-label="افزایش"><Plus size={14} /></button>
                      <span className="w-9 text-center font-black tnum text-[13.5px]">{fa(l.qty)}</span>
                      <button className="h-9 w-9 grid place-items-center hover:bg-gold-50 transition-colors disabled:opacity-30" disabled={l.qty <= 1} onClick={() => setQty(Number(l.id), l.qty - 1)} aria-label="کاهش"><Minus size={14} /></button>
                    </div>
                    <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", l.packaging === "luxury" ? "bg-gold-100 text-gold-700" : "bg-cream-100 text-charcoal-500")}>
                      {l.packaging === "luxury" ? "بسته‌بندی لوکس" : "بسته‌بندی استاندارد"}
                    </span>
                    <p className="text-[15.5px] font-black tnum">{formatIrr(l.unit_quote_irr * l.qty)} <span className="text-[10.5px] font-medium text-charcoal-500">ریال</span></p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="h-fit lg:sticky lg:top-24 space-y-3.5">
            <Card>
              <h3 className="text-[14.5px] font-black mb-3.5">خلاصه سفارش</h3>
              <dl className="space-y-2.5 text-[13px]">
                <div className="flex justify-between"><dt className="text-charcoal-500">جمع اقلام</dt><dd className="font-semibold tnum">{formatIrr(cart.subtotal_irr)}</dd></div>
                <div className="flex justify-between"><dt className="text-charcoal-500">تخفیف</dt><dd className={cn("font-semibold tnum", cart.discount_irr > 0 ? "text-success" : "")}>{cart.discount_irr > 0 ? `−${formatIrr(cart.discount_irr)}` : "—"}</dd></div>
                <div className="flex justify-between border-t border-inkline pt-3 text-[15px]"><dt className="font-black">مبلغ قابل پرداخت</dt><dd className="font-black tnum text-gold-700">{formatIrr(cart.total_irr)} <span className="text-[10.5px] font-medium text-charcoal-500">ریال</span></dd></div>
              </dl>
              {cart.coupon_code && <p className="text-[11.5px] text-success font-bold mt-2 flex items-center gap-1"><Ticket size={12} /> کد {cart.coupon_code} اعمال شد</p>}
              <button onClick={() => setCouponOpen(true)} className="mt-3 text-[12.5px] font-bold text-gold-700 hover:text-gold-600 underline underline-offset-4">
                {cart.coupon_code ? "تغییر کد تخفیف" : "کد تخفیف دارید؟"}
              </button>
              <Button full size="lg" className="mt-4" icon={<Lock size={15} />} onClick={() => navigate("/app/checkout")}>ادامه و پرداخت</Button>
              <p className="text-[11px] text-charcoal-500 text-center mt-2.5 flex items-center justify-center gap-1"><ShieldCheck size={12} className="text-success" /> پرداخت امن از درگاه شتاب</p>
            </Card>
          </div>
        </div>
      )}
      <CouponApplyModal open={couponOpen} onClose={() => setCouponOpen(false)} onApply={async (code) => {
        try { await orderApi.applyCoupon(code); await refreshCart(); toast("کد تخفیف اعمال شد"); setCouponOpen(false); }
        catch (e) { toast(e instanceof Error ? e.message : "کد تخفیف نامعتبر", "error"); throw e; }
      }} />
    </div>
  );
}

export function CouponApplyModal({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (code: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="کد تخفیف" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>انصراف</Button>
        <Button loading={busy} disabled={code.trim().length < 3} onClick={async () => { setBusy(true); try { await onApply(code); } finally { setBusy(false); } }}>اعمال کد</Button>
      </>}>
      <Field label="کد را وارد کنید" hint="مثال: GOLD-NOWRUZ">
        <input dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="GOLD-NOWRUZ"
          className="w-full h-12 rounded-[8px] border border-inkline bg-cream-0 px-4 text-center text-[16px] font-black tracking-[0.2em] uppercase focus-ring focus:border-gold-500" />
      </Field>
    </Modal>
  );
}

/* ================================ CheckoutPage ================================ */
export function CheckoutPage() {
  const { cart, refreshCart, user } = useApp();
  const [step, setStep] = useState(1);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("vault");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<number | string | null>(null);
  const [addressModal, setAddressModal] = useState(false);
  const [packDrawer, setPackDrawer] = useState(false);
  const [paying, setPaying] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const kycOk = user?.kyc_status === "approved";

  useMemo(() => {
    profileApi.addresses().then((a) => { setAddresses(a); setAddressId(a.find((x) => x.is_default)?.id ?? a[0]?.id ?? null); });
  }, []);

  if (!cart || cart.lines.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <EmptyState icon={<ShoppingBag size={24} />} title="سبدی برای پرداخت نیست" action={<Link to="/catalog"><Button>مشاهده فروشگاه</Button></Link>} />
    </div>
  );

  const canContinue = step === 1 ? true : step === 2 ? (fulfillment === "vault" || addressId !== null) : true;

  const pay = async () => {
    setPaying(true);
    try {
      const order = await orderApi.placeOrder(fulfillment);
      await refreshCart();
      toast("پرداخت موفق — فاکتور آماده است");
      navigate(`/app/orders/${order.number}`);
    } catch (e) { toast(e instanceof Error ? e.message : "پرداخت ناموفق بود", "error"); }
    finally { setPaying(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-[24px] font-black mb-6">تسویه حساب</h1>
      <div className="max-w-xl mx-auto mb-8">
        <ProgressStepper steps={["سبد", "ارسال", "پرداخت"]} current={step - 1} />
      </div>

      {step === 2 && !kycOk && (
        <div className="mb-5"><Alert kind="warning" title="تحویل فیزیکی نیازمند احراز هویت است">
          وضعیت حساب شما «{user?.kyc_status === "pending" ? "در انتظار بررسی" : "تأییدنشده"}» است. <Link to="/app/kyc" className="underline font-bold">احراز هویت</Link> یا انتخاب «نگهداری در خزانه».
        </Alert></div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {step === 1 && (
            <Card>
              <h2 className="text-[15.5px] font-black mb-4">اقلام سبد ({fa(cart.lines.length)})</h2>
              <ul className="divide-y divide-inkline/70">
                {cart.lines.map((l) => (
                  <li key={String(l.id)} className="py-3 flex items-center gap-3.5">
                    <img src={l.product?.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover bg-cream-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold truncate">{l.product?.name}</p>
                      <p className="text-[11.5px] text-charcoal-500 tnum">{fa(l.qty)} × {formatIrr(l.unit_quote_irr)}</p>
                    </div>
                    <button className="text-[12px] font-bold text-gold-700 hover:text-gold-600 shrink-0" onClick={() => setPackDrawer(true)}>بسته‌بندی</button>
                    <b className="tnum text-[13.5px] shrink-0">{formatIrr(l.unit_quote_irr * l.qty)}</b>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {step === 2 && (
            <Card>
              <h2 className="text-[15.5px] font-black mb-4">روش دریافت</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <button onClick={() => setFulfillment("vault")} className={cn("text-start border-2 rounded-card p-4 transition-all", fulfillment === "vault" ? "border-gold-500 bg-gold-50/70" : "border-inkline hover:border-gold-300")}>
                  <Radio checked={fulfillment === "vault"} onChange={() => setFulfillment("vault")} label="نگهداری در خزانه" desc="بدون هزینه ارسال — هر وقت خواستید تحویل بگیرید" />
                </button>
                <button onClick={() => kycOk && setFulfillment("delivery")} disabled={!kycOk}
                  className={cn("text-start border-2 rounded-card p-4 transition-all", !kycOk ? "opacity-50 cursor-not-allowed border-inkline" : fulfillment === "delivery" ? "border-gold-500 bg-gold-50/70" : "border-inkline hover:border-gold-300")}>
                  <Radio checked={fulfillment === "delivery"} onChange={() => setFulfillment("delivery")} label="ارسال به آدرس" desc={!kycOk ? "نیازمند احراز هویت" : "بیمه کامل + بسته‌بندی پلمب"} disabled={!kycOk} />
                </button>
              </div>
              {fulfillment === "delivery" && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-[13.5px] font-bold">آدرس تحویل</h3>
                    <Button size="sm" variant="secondary" onClick={() => setAddressModal(true)}>افزودن آدرس</Button>
                  </div>
                  {!addresses ? <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : (
                    <div className="space-y-2">
                      {addresses.map((a) => (
                        <button key={String(a.id)} onClick={() => setAddressId(a.id)}
                          className={cn("w-full text-start border-2 rounded-card p-3.5 transition-all", addressId === a.id ? "border-gold-500 bg-gold-50/70" : "border-inkline hover:border-gold-300")}>
                          <span className="flex items-center gap-2 text-[13px] font-bold"><Truck size={14} className="text-gold-600" />{a.title}{a.is_default && <Badge status="gold">پیش‌فرض</Badge>}</span>
                          <span className="block text-[12px] text-charcoal-500 mt-1 leading-5">{a.province}، {a.city}، {a.line1}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          {step === 3 && (
            <Card>
              <h2 className="text-[15.5px] font-black mb-4">پرداخت امن</h2>
              <div className="bg-charcoal-900 rounded-card p-5 text-cream-0">
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-bold text-cream-0/70">درگاه پرداخت شتاب</p>
                  <Landmark size={18} className="text-gold-500" />
                </div>
                <p className="text-[26px] font-black tnum text-gold-500 mt-4">{formatIrr(cart.total_irr)} <span className="text-[12px] font-medium text-cream-0/60">ریال</span></p>
                <p className="text-[11px] text-cream-0/50 mt-2">قیمت‌ها تا پایان پرداخت قفل هستند · بازگشت وجه در صورت لغو</p>
              </div>
              <p className="text-[11.5px] text-charcoal-500 leading-6 mt-3.5">با پرداخت، قوانین خرید طلای زرون شامل کارمزد، عیار و شرایط بازگشت را می‌پذیرید.</p>
            </Card>
          )}
          <div className="flex justify-between mt-5">
            <Button variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>مرحله قبل</Button>
            {step < 3
              ? <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>مرحله بعد</Button>
              : <Button size="lg" loading={paying} icon={<Lock size={15} />} onClick={pay}>پرداخت {formatIrr(cart.total_irr)} ریال</Button>}
          </div>
        </div>

        <div className="h-fit lg:sticky lg:top-24">
          <Card>
            <h3 className="text-[14px] font-black mb-3">خلاصه</h3>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex justify-between"><dt className="text-charcoal-500">جمع اقلام</dt><dd className="tnum font-semibold">{formatIrr(cart.subtotal_irr)}</dd></div>
              {cart.discount_irr > 0 && <div className="flex justify-between text-success"><dt>تخفیف ({cart.coupon_code})</dt><dd className="tnum font-semibold">−{formatIrr(cart.discount_irr)}</dd></div>}
              <div className="flex justify-between"><dt className="text-charcoal-500">روش دریافت</dt><dd className="font-semibold">{fulfillment === "vault" ? "خزانه زرون" : "ارسال به آدرس"}</dd></div>
              <div className="flex justify-between border-t border-inkline pt-2.5 text-[14.5px]"><dt className="font-black">قابل پرداخت</dt><dd className="font-black tnum text-gold-700">{formatIrr(cart.total_irr)}</dd></div>
            </dl>
          </Card>
        </div>
      </div>

      <AddressModal open={addressModal} onClose={() => setAddressModal(false)} onSaved={(a) => {
        setAddresses((list) => [...(list ?? []), a]);
        setAddressId(a.id);
        setAddressModal(false);
        toast("آدرس ذخیره شد");
      }} />

      <PackagingDrawerLine open={packDrawer} onClose={() => setPackDrawer(false)} cart={cart} onChanged={refreshCart} />
    </div>
  );
}

function PackagingDrawerLine({ open, onClose, cart, onChanged }: { open: boolean; onClose: () => void; cart: Cart; onChanged: () => void }) {
  const { Modal: _m } = { Modal };
  return (
    <Modal open={open} onClose={onClose} title="بسته‌بندی اقلام" size="md"
      footer={<Button full onClick={onClose}>تأیید و بستن</Button>}>
      <div className="space-y-4">
        {cart.lines.map((l) => (
          <div key={String(l.id)}>
            <p className="text-[13px] font-bold mb-2">{l.product?.name}</p>
            <PackagingPicker value={l.packaging ?? "standard"} onChange={async (v) => { await orderApi.setPackaging(Number(l.id), v); onChanged(); }} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ================================ AddressModal ================================ */
export function AddressModal({ open, onClose, onSaved, initial }: {
  open: boolean; onClose: () => void; onSaved: (a: Address) => void; initial?: Address;
}) {
  const [form, setForm] = useState({ title: "منزل", province: "تهران", city: "", line1: "", postal_code: "", is_default: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useMemo(() => {
    if (open && initial) setForm({ title: initial.title, province: initial.province, city: initial.city, line1: initial.line1, postal_code: initial.postal_code, is_default: initial.is_default });
    if (open && !initial) setForm({ title: "منزل", province: "تهران", city: "", line1: "", postal_code: "", is_default: false });
  }, [open, initial]);
  return (
    <Modal open={open} onClose={onClose} title={initial ? "ویرایش آدرس" : "آدرس جدید"} size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>انصراف</Button>
        <Button loading={busy} onClick={async () => {
          if (!form.city || form.line1.length < 5) { setErr("شهر و نشانی کامل را وارد کنید"); return; }
          setBusy(true);
          const a = await profileApi.saveAddress({ ...form, id: initial?.id });
          setBusy(false);
          onSaved(a);
        }}>ذخیره آدرس</Button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="منزل / محل کار" />
        <Input label="استان" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
        <Input label="شهر" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} error={err && !form.city ? err : undefined} />
        <Input label="کد پستی" dir="ltr" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
        <div className="sm:col-span-2">
          <Input label="نشانی کامل" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="خیابان، کوچه، پلاک، واحد" error={err && form.line1.length < 5 ? err : undefined} />
        </div>
      </div>
    </Modal>
  );
}

/* ================================ OrdersPage ================================ */
export function OrdersPage() {
  const orders = usePageData(() => orderApi.orders());
  const [status, setStatus] = useState("all");
  const navigate = useNavigate();
  const filtered = useMemo(() => (orders.data ?? []).filter((o) => status === "all" || o.status === status), [orders.data, status]);

  return (
    <div>
      <PageHead title="سفارش‌ها" subtitle="همه خریدهای فیزیکی و خزانه‌ای شما" />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[["all", "همه"], ["awaiting_payment", "در انتظار پرداخت"], ["paid", "پرداخت‌شده"], ["vaulted", "در خزانه"], ["shipped", "ارسال‌شده"], ["delivered", "تحویل‌شده"], ["cancelled", "لغوشده"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)}
            className={cn("px-3.5 h-9 rounded-full border text-[12.5px] font-medium transition-all", status === k ? "bg-charcoal-900 text-cream-0 border-charcoal-900" : "border-inkline bg-cream-0 text-charcoal-700 hover:border-gold-400")}>
            {l}
          </button>
        ))}
      </div>
      {orders.error ? <Card pad={false}><ErrorState message={orders.error} onRetry={orders.retry} /></Card> : (
        <DataTable<Order>
          columns={[
            { key: "number", header: "شماره سفارش", render: (o) => <b className="text-[12px]" dir="ltr">{o.number}</b> },
            { key: "created_at", header: "تاریخ", render: (o) => <span className="tnum text-charcoal-700">{jalaliDate(o.created_at)}</span> },
            { key: "total_irr", header: "مبلغ", align: "end", render: (o) => <b className="tnum">{formatIrr(o.total_irr)}</b> },
            { key: "gold_mg", header: "طلا", align: "end", render: (o) => <span className="tnum text-charcoal-700">{formatMg(o.gold_mg)}</span> },
            { key: "fulfillment", header: "دریافت", render: (o) => <Badge status={o.fulfillment === "vault" ? "vaulted" : "shipped"}>{o.fulfillment === "vault" ? "خزانه" : "ارسال"}</Badge> },
            { key: "status", header: "وضعیت", render: (o) => <Badge status={ORDER_STATUS_FA[o.status]?.status ?? "neutral"}>{ORDER_STATUS_FA[o.status]?.label ?? o.status}</Badge> },
          ]}
          rows={filtered} loading={orders.loading} onRowClick={(o) => navigate(`/app/orders/${o.number}`)}
          empty={<EmptyState icon={<ShoppingBag size={24} />} title="سفارشی ندارید" body="اولین خرید شما اینجا نمایش داده می‌شود." action={<Link to="/catalog"><Button size="sm">مشاهده فروشگاه</Button></Link>} /> as never}
        />
      )}
    </div>
  );
}

/* ================================ OrderDetailPage ================================ */
export function OrderDetailPage() {
  const { id } = useParams();
  const order = usePageData(() => orderApi.orderById(id ?? ""), [id]);
  const toast = useToast();
  const navigate = useNavigate();
  const o = order.data;

  if (order.loading) return <div className="space-y-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  if (order.error || !o) return <Card pad={false}><EmptyState title="سفارش پیدا نشد" action={<Link to="/app/orders"><Button>بازگشت به سفارش‌ها</Button></Link>} /></Card>;

  return (
    <div className="space-y-5">
      <PageHead back title={<span dir="ltr" className="text-[17px]">{o.number}</span>} subtitle={`ثبت‌شده در ${jalaliDate(o.created_at)}`}
        actions={<Badge status={ORDER_STATUS_FA[o.status]?.status}>{ORDER_STATUS_FA[o.status]?.label}</Badge>} />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <h2 className="text-[14.5px] font-black mb-4">اقلام سفارش</h2>
            {o.items && o.items.length > 0 ? (
              <ul className="divide-y divide-inkline/70">
                {o.items.map((it) => (
                  <li key={String(it.id)} className="py-3 flex items-center gap-3.5">
                    <img src={it.product?.images[0] ?? ""} alt="" className="h-14 w-14 rounded-lg object-cover bg-cream-100" />
                    <div className="flex-1">
                      <p className="text-[13.5px] font-bold">{it.product?.name}</p>
                      <p className="text-[11.5px] text-charcoal-500 tnum">{fa(it.qty)} × {formatIrr(it.unit_quote_irr)} · {formatMg(it.product?.weight_mg ?? 0)}</p>
                    </div>
                    {it.packaging === "luxury" && <Badge status="gold">لوکس</Badge>}
                    <b className="tnum">{formatIrr(it.unit_quote_irr * it.qty)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-charcoal-500">جزئیات اقلام این سفارش در زمان خرید ثبت شده است.</p>
            )}
          </Card>

          {o.shipment && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14.5px] font-black">رهگیری مرسوله</h2>
                <code className="text-[12px] font-bold bg-cream-100 rounded-lg px-2.5 py-1.5" dir="ltr">{o.shipment.tracking_code}</code>
              </div>
              <Timeline items={o.shipment.timeline.map((t) => ({ at: `${jalaliDate(t.at)} — ${t.at.slice(11, 16)}`, label: t.label }))} />
            </Card>
          )}
        </div>

        <div className="space-y-4 h-fit">
          <Card>
            <h3 className="text-[14px] font-black mb-3">صورتحساب</h3>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex justify-between"><dt className="text-charcoal-500">جمع اقلام</dt><dd className="tnum font-semibold">{formatIrr(o.subtotal_irr)}</dd></div>
              {o.discount_irr > 0 && <div className="flex justify-between text-success"><dt>تخفیف</dt><dd className="tnum font-semibold">−{formatIrr(o.discount_irr)}</dd></div>}
              <div className="flex justify-between"><dt className="text-charcoal-500">طلای سفارش</dt><dd className="tnum font-semibold">{formatMg(o.gold_mg)}</dd></div>
              <div className="flex justify-between border-t border-inkline pt-2.5 text-[14.5px]"><dt className="font-black">پرداخت‌شده</dt><dd className="font-black tnum text-gold-700">{formatIrr(o.total_irr)}</dd></div>
            </dl>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="sm" full icon={<Download size={14} />} onClick={() => toast("فاکتور آماده است — دانلود شروع شد")}>فاکتور</Button>
              <Button variant="ghost" size="sm" full icon={<Ticket size={14} />} onClick={() => navigate("/app/tickets")}>تیکت</Button>
            </div>
            {!o.paid_at && o.status === "awaiting_payment" && (
              <Button variant="danger" size="sm" full className="mt-2" icon={<PackageX size={14} />} onClick={async () => {
                await orderApi.cancelOrder(Number(o.id));
                order.retry();
                toast("سفارش لغو شد", "info");
              }}>لغو سفارش</Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================================ DeliveryPage ================================ */
export function DeliveryPage() {
  const { wallets } = useApp();
  const orders = usePageData(() => orderApi.orders());
  const [mg, setMg] = useState(5000);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const gold = wallets.find((w) => w.currency === "gold_mg");
  const vaulted = (orders.data ?? []).filter((o) => o.fulfillment === "vault" && ["vaulted", "delivered", "paid"].includes(o.status));

  return (
    <div className="space-y-6">
      <PageHead title="تحویل فیزیکی" subtitle="طلای خزانه را به‌صورت فیزیکی تحویل بگیرید" />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-[15px] font-black mb-4">درخواست تحویل از خزانه</h2>
          <p className="text-[12.5px] text-charcoal-500 leading-6 mb-4">قالب‌های استاندارد: ۵، ۱۰ و ۵۰ گرمی. کارمزد ضرب و ارسال پیش از ثبت نمایش داده می‌شود.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[5000, 10000, 50000].map((w) => (
              <button key={w} onClick={() => setMg(w)}
                className={cn("px-4 h-11 rounded-card border-2 text-[13px] font-black tnum transition-all", mg === w ? "border-gold-500 bg-gold-50 text-gold-700" : "border-inkline hover:border-gold-300")}>
                {fa(w / 1000)} گرم
              </button>
            ))}
          </div>
          <div className="bg-cream-50 border border-inkline rounded-card p-3.5 text-[12.5px] space-y-1.5 mb-4">
            <p className="flex justify-between"><span className="text-charcoal-500">موجودی خزانه شما</span><b className="tnum">{gold ? formatMg(gold.balance) : "—"}</b></p>
            <p className="flex justify-between"><span className="text-charcoal-500">کارمزد ضرب و ارسال</span><b className="tnum">{formatIrr(Math.round(mg * 180))} ریال</b></p>
            <p className="flex justify-between"><span className="text-charcoal-500">زمان تحویل (تهران)</span><b>۲ تا ۴ روز کاری</b></p>
          </div>
          <Button full size="lg" loading={busy} disabled={!gold || gold.balance < mg} onClick={async () => {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 1000));
            setBusy(false);
            toast("درخواست تحویل ثبت شد — هماهنگی تلفنی انجام می‌شود");
          }}>ثبت درخواست تحویل</Button>
          {gold && gold.balance < mg && <p className="text-[12px] text-warning mt-2.5">موجودی خزانه برای این قالب کافی نیست.</p>}
        </Card>
        <div>
          <h2 className="text-[15px] font-black mb-3.5">سفارش‌های خزانه‌ای شما</h2>
          {orders.loading ? <div className="space-y-2.5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            : vaulted.length === 0 ? <Card pad={false}><EmptyState icon={<Landmark size={24} />} title="طلایی در خزانه ندارید" body="با خرید و انتخاب «نگهداری در خزانه»، دارایی شما اینجا ذخیره می‌شود." action={<Link to="/app/trade"><Button size="sm">خرید طلا</Button></Link>} /></Card>
            : (
              <ul className="space-y-2.5">
                {vaulted.map((o) => (
                  <li key={String(o.id)}>
                    <Link to={`/app/orders/${o.number}`} className="flex items-center justify-between gap-3 bg-cream-0 border border-inkline rounded-card px-4 py-3.5 hover:border-gold-400 transition-colors">
                      <span className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-card bg-gold-50 border border-gold-100 grid place-items-center text-gold-600"><Landmark size={16} /></span>
                        <span><b className="block text-[13px]">{formatMg(o.gold_mg)}</b><span className="text-[11px] text-charcoal-500 tnum" dir="ltr">{o.number}</span></span>
                      </span>
                      <Badge status={ORDER_STATUS_FA[o.status]?.status}>{ORDER_STATUS_FA[o.status]?.label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
}

/* ================================ InvoicesPage ================================ */
export function InvoicesPage() {
  const invoices = usePageData(() => orderApi.invoices());
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <div>
      <PageHead title="فاکتورها" subtitle="فاکتور رسمی همه معاملات و سفارش‌ها" />
      {invoices.error ? <Card pad={false}><ErrorState message={invoices.error} onRetry={invoices.retry} /></Card> : (
        <DataTable<{ id: number | string; number: string; issued_at: string; total_irr: number; gold_mg: number; pdf_url?: string }>
          columns={[
            { key: "number", header: "شماره فاکتور", render: (r) => <b className="text-[12px]" dir="ltr">{r.number}</b> },
            { key: "issued_at", header: "تاریخ صدور", render: (r) => <span className="tnum text-charcoal-700">{jalaliDate(r.issued_at)}</span> },
            { key: "gold_mg", header: "وزن طلا", align: "end", render: (r) => <span className="tnum">{formatMg(r.gold_mg)}</span> },
            { key: "total_irr", header: "مبلغ", align: "end", render: (r) => <b className="tnum">{formatIrr(r.total_irr)} ریال</b> },
            { key: "pdf", header: "PDF", render: (r) => (
              <span className="flex gap-1.5">
                <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => toast("دانلود PDF شروع شد")}>دانلود</Button>
                <Button size="sm" variant="ghost" icon={<Printer size={13} />} onClick={() => window.print()}>چاپ</Button>
              </span>
            ) },
          ]}
          rows={invoices.data ?? []} loading={invoices.loading}
          onRowClick={(r) => navigate(`/app/invoices/${r.id}`)}
          empty={<EmptyState icon={<FileText size={24} />} title="فاکتوری ندارید" body="پس از اولین معامله، فاکتور رسمی اینجا صادر می‌شود." /> as never}
        />
      )}
    </div>
  );
}

/* ================================ InvoiceDetailPage ================================ */
export function InvoiceDetailPage() {
  const { id } = useParams();
  const invoices = usePageData(() => orderApi.invoices());
  const invoice = useMemo(() => invoices.data?.find((i) => String(i.id) === String(id)), [invoices.data, id]);

  if (invoices.loading) return <div className="max-w-3xl mx-auto space-y-4 py-8"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  if (!invoice) return <div className="max-w-3xl mx-auto py-14"><EmptyState title="فاکتور پیدا نشد" action={<Link to="/app/invoices"><Button>همه فاکتورها</Button></Link>} /></div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <PageHead back title={`فاکتور ${invoice.number}`} subtitle={`صادرشده در ${jalaliDate(invoice.issued_at)}`}
        actions={<><Button variant="secondary" icon={<Printer size={15} />} onClick={() => window.print()}>چاپ</Button><Button icon={<Download size={15} />}>PDF</Button></>} />
      <div className="bg-cream-0 border border-inkline rounded-card overflow-hidden">
        <div className="bg-charcoal-900 text-cream-0 px-7 py-6 flex items-center justify-between">
          <div>
            <p className="text-[17px] font-black">زرون <span className="text-gold-500">گلد</span></p>
            <p className="text-[10.5px] text-cream-0/50 mt-1">شرکت طلای زرون (سهامی خاص) — شناسه ملی ۱۴۰۱۲۳۴۵۶۷۸</p>
          </div>
          <div className="text-end">
            <p className="font-display text-[12px] tracking-[0.25em] text-gold-500 uppercase">Invoice</p>
            <p className="text-[13px] font-bold tnum mt-1" dir="ltr">{invoice.number}</p>
          </div>
        </div>
        <div className="p-7">
          <dl className="grid sm:grid-cols-3 gap-4 text-[12.5px] border-b border-inkline pb-5">
            <div><dt className="text-charcoal-500">خریدار</dt><dd className="font-bold mt-1">سارا کریمی</dd><dd className="text-charcoal-500 tnum" dir="ltr">09121234567</dd></div>
            <div><dt className="text-charcoal-500">تاریخ صدور</dt><dd className="font-bold tnum mt-1">{jalaliDate(invoice.issued_at)}</dd></div>
            <div><dt className="text-charcoal-500">وضعیت</dt><dd className="mt-1"><Badge status="paid">پرداخت‌شده</Badge></dd></div>
          </dl>
          <table className="w-full text-[13px] mt-5">
            <thead><tr className="text-[11.5px] text-charcoal-500 border-b border-inkline"><th className="py-2.5 text-start font-medium">شرح</th><th className="py-2.5 text-end font-medium">وزن</th><th className="py-2.5 text-end font-medium">مبلغ</th></tr></thead>
            <tbody>
              <tr className="border-b border-inkline/60"><td className="py-3.5 font-medium">خرید طلای ۱۸ عیار — ثبت‌شده در سامانه زرون</td><td className="py-3.5 text-end tnum">{formatMg(invoice.gold_mg)}</td><td className="py-3.5 text-end tnum font-bold">{formatIrr(invoice.total_irr)}</td></tr>
              <tr><td className="py-3.5 font-black">جمع کل</td><td /><td className="py-3.5 text-end tnum font-black text-[15px] text-gold-700">{formatIrr(invoice.total_irr)} ریال</td></tr>
            </tbody>
          </table>
          <p className="text-[11px] text-charcoal-500 leading-6 mt-4 bg-cream-50 border border-inkline rounded-lg p-3.5">
            این فاکتور به‌صورت الکترونیکی صادر شده و با کد رهگیری یکتا در سامانه زرون قابل استعلام است. نرخ پایه، اسپرد و اجرت ساخت در زمان معامله اعمال شده است.
          </p>
        </div>
      </div>
    </div>
  );
}
