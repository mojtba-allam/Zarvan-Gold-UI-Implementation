import { useMemo, useState } from "react";
import type { Payment, User } from "../types";
import { adminApi, notifyApi, orderApi, promoApi } from "../api";
import { cn, fa, formatIrr, formatMg, jalaliDate, usePageData } from "../lib";
import {
  Badge, Button, Card, DataTable, Drawer, Input, KYC_STATUS_FA, Modal, MoneyInput, ORDER_STATUS_FA,
  PageHead, PAYMENT_STATUS_FA, Select, Skeleton, StatCard, Switch, Tabs, Textarea, type Column,
} from "../components/ui";
import { Alert, Banner, EmptyState, ErrorState, useToast } from "../components/feedback";
import { Download, Megaphone, Plus, RotateCcw, Search, Send, Settings2, UserPlus, Users, Wallet as WalletIcon, Gift, BadgePercent, Copy } from "../components/icons";

/* ================================ AdminOrdersPage ================================ */
export function AdminOrdersPage() {
  const orders = usePageData(() => orderApi.allOrders());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [ful, setFul] = useState("all");
  const toast = useToast();

  const filtered = useMemo(() => (orders.data ?? []).filter((o) =>
    (status === "all" || o.status === status) &&
    (ful === "all" || o.fulfillment === ful) &&
    (!q || o.number.includes(q) || (o.customer?.name ?? "").includes(q) || (o.customer?.mobile ?? "").includes(q)),
  ), [orders.data, status, ful, q]);

  const exportCsv = () => {
    const csv = filtered.map((o) => [o.number, o.customer?.name ?? "", o.created_at, o.total_irr, o.gold_mg, o.status, o.fulfillment].join(",")).join("\n");
    const blob = new Blob([`number,customer,date,total_irr,gold_mg,status,fulfillment\n${csv}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "zarvan-orders.csv";
    a.click();
    toast("خروجی CSV آماده شد");
  };

  return (
    <div>
      <PageHead title="سفارش‌ها" subtitle="همه سفارش‌های فروشگاه با فیلتر پیشرفته" actions={<Button variant="secondary" icon={<Download size={15} />} onClick={exportCsv}>CSV</Button>} />
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="شماره، نام، موبایل…" className="w-full h-10 rounded-[8px] border border-inkline bg-cream-0 ps-9 pe-3 text-[13px] focus-ring focus:border-gold-500" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "all", label: "همه وضعیت‌ها" }, ...Object.entries(ORDER_STATUS_FA).map(([k, v]) => ({ value: k, label: v.label }))]} />
        <Select value={ful} onChange={(e) => setFul(e.target.value)} options={[{ value: "all", label: "همه روش‌ها" }, { value: "vault", label: "خزانه" }, { value: "delivery", label: "ارسال" }]} />
      </div>
      {orders.error ? <Card pad={false}><ErrorState message={orders.error} onRetry={orders.retry} /></Card> : (
        <>
          <DataTable<(typeof orders.data extends (infer T)[] | null ? T : never)>
            columns={[
              { key: "number", header: "شماره", render: (o) => <b className="text-[12px]" dir="ltr">{o.number}</b> },
              { key: "customer", header: "مشتری", render: (o) => <span className="text-[12.5px]">{o.customer?.name ?? "—"}</span> },
              { key: "created_at", header: "تاریخ", render: (o) => <span className="tnum text-charcoal-700">{jalaliDate(o.created_at)}</span> },
              { key: "total_irr", header: "مبلغ", align: "end", render: (o) => <b className="tnum">{formatIrr(o.total_irr)}</b> },
              { key: "gold_mg", header: "طلا", align: "end", render: (o) => <span className="tnum">{formatMg(o.gold_mg)}</span> },
              { key: "fulfillment", header: "دریافت", render: (o) => <Badge status={o.fulfillment === "vault" ? "vaulted" : "shipped"}>{o.fulfillment === "vault" ? "خزانه" : "ارسال"}</Badge> },
              { key: "status", header: "وضعیت", render: (o) => (
                <select defaultValue={o.status} onChange={async (e) => { await orderApi.updateOrderStatus(Number(o.id), e.target.value as typeof o.status); orders.retry(); toast("وضعیت تغییر کرد"); }}
                  className="h-8 rounded-md border border-inkline bg-cream-0 px-2 text-[11.5px] font-medium focus-ring cursor-pointer" aria-label="تغییر وضعیت">
                  {Object.entries(ORDER_STATUS_FA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              ) },
            ]}
            rows={filtered} loading={orders.loading} dense
            empty={<EmptyState title="سفارشی با این فیلترها نیست" /> as never}
          />
        </>
      )}
    </div>
  );
}

/* ================================ AdminPaymentsPage ================================ */
export function AdminPaymentsPage() {
  const payments = usePageData(() => adminApi.payments());
  const [refundFor, setRefundFor] = useState<(Payment & { customer?: string }) | null>(null);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const isProd = false; // sandbox badge outside prod

  return (
    <div>
      <PageHead title="پرداخت‌ها" subtitle="تراکنش‌های درگاه، بازپرداخت و مغایرت‌گیری"
        actions={!isProd ? <Badge status="info">درگاه آزمایشی (Sandbox)</Badge> : undefined} />
      {payments.error ? <Card pad={false}><ErrorState message={payments.error} onRetry={payments.retry} /></Card> : (
        <DataTable<Payment & { customer?: string; order_no?: string }>
          columns={[
            { key: "id", header: "شناسه", render: (p) => <span className="tnum font-bold" dir="ltr">#{p.id}</span> },
            { key: "customer", header: "مشتری", render: (p) => <span className="text-[12.5px]">{p.customer ?? "—"}<span className="block text-[10.5px] text-charcoal-500" dir="ltr">{p.order_no}</span></span> },
            { key: "amount_irr", header: "مبلغ", align: "end", render: (p) => <b className="tnum">{formatIrr(p.amount_irr)}</b> },
            { key: "driver", header: "درگاه", render: (p) => <Badge status="neutral">{p.driver}</Badge> },
            { key: "ref_id", header: "Ref", render: (p) => <span className="font-mono text-[11px] text-charcoal-500" dir="ltr">{p.ref_id ?? "—"}</span> },
            { key: "paid_at", header: "زمان", render: (p) => <span className="tnum text-charcoal-700">{p.paid_at ? jalaliDate(p.paid_at) : "—"}</span> },
            { key: "status", header: "وضعیت", render: (p) => <Badge status={PAYMENT_STATUS_FA[p.status].status}>{PAYMENT_STATUS_FA[p.status].label}</Badge> },
          ]}
          rows={payments.data ?? []} loading={payments.loading} dense
          actions={(p) => p.status === "paid" ? (
            <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => { setRefundFor(p); setAmount(p.amount_irr); setReason(""); }}>بازپرداخت</Button>
          ) : undefined}
          empty={<EmptyState title="پرداختی ثبت نشده" /> as never}
        />
      )}

      <Modal open={!!refundFor} onClose={() => setRefundFor(null)} title="بازپرداخت وجه" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setRefundFor(null)}>انصراف</Button>
          <Button variant="danger" loading={busy} disabled={amount <= 0 || reason.trim().length < 5} onClick={async () => {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 900));
            setBusy(false); setRefundFor(null);
            payments.retry();
            toast(`بازپرداخت ${formatIrr(amount)} ریال ثبت شد`, "warning");
          }}>ثبت بازپرداخت</Button>
        </>}>
        <div className="space-y-4">
          <p className="text-[13px] text-charcoal-700">پرداخت <b dir="ltr">#{refundFor?.id}</b> — {refundFor?.customer}</p>
          <MoneyInput label="مبلغ بازپرداخت" value={amount} onChange={setAmount} max={refundFor?.amount_irr ?? 0} />
          <Textarea label="دلیل بازپرداخت" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: لغو سفارش توسط مشتری" />
        </div>
      </Modal>
    </div>
  );
}

/* ================================ AdminInvoicesPage ================================ */
export function AdminInvoicesPage() {
  const [q, setQ] = useState("");
  const toast = useToast();
  const all = useMemo(() => [
    { id: 12, number: "ZRV-2026-00012", issued_at: "2026-08-10T11:02:00Z", total_irr: 23_284_000, gold_mg: 4200, customer: "سارا کریمی" },
    { id: 11, number: "ZRV-2026-00011", issued_at: "2026-07-20T12:15:00Z", total_irr: 35_200_000, gold_mg: 10000, customer: "سارا کریمی" },
    { id: 10, number: "ZRV-2026-00010", issued_at: "2026-07-05T09:12:00Z", total_irr: 3_880_000, gold_mg: 1450, customer: "نازنین احمدی" },
    { id: 9, number: "ZRV-2026-00009", issued_at: "2026-06-21T18:40:00Z", total_irr: 16_304_000, gold_mg: 3100, customer: "نازنین احمدی" },
  ].filter((i) => !q || i.number.includes(q) || i.customer.includes(q)), [q]);

  return (
    <div>
      <PageHead title="فاکتورها" subtitle="جستجو و دانلود فاکتورهای رسمی" />
      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="شماره فاکتور یا مشتری…" className="w-full h-10 rounded-[8px] border border-inkline bg-cream-0 ps-9 pe-3 text-[13px] focus-ring focus:border-gold-500" />
      </div>
      <DataTable<(typeof all)[number]>
        columns={[
          { key: "number", header: "شماره", render: (r) => <b className="text-[12px]" dir="ltr">{r.number}</b> },
          { key: "customer", header: "مشتری", render: (r) => <span className="text-[12.5px]">{r.customer}</span> },
          { key: "issued_at", header: "تاریخ", render: (r) => <span className="tnum text-charcoal-700">{jalaliDate(r.issued_at)}</span> },
          { key: "gold_mg", header: "طلا", align: "end", render: (r) => <span className="tnum">{formatMg(r.gold_mg)}</span> },
          { key: "total_irr", header: "مبلغ", align: "end", render: (r) => <b className="tnum">{formatIrr(r.total_irr)}</b> },
          { key: "pdf", header: "PDF", render: () => <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => toast("دانلود PDF شروع شد")}>دانلود</Button> },
        ]}
        rows={all} loading={false}
        empty={<EmptyState title="فاکتوری پیدا نشد" /> as never}
      />
    </div>
  );
}

/* ================================ AdminCustomersPage ================================ */
export function AdminCustomersPage() {
  const customers = usePageData(() => adminApi.customers());
  const [q, setQ] = useState("");
  const [kyc, setKyc] = useState("all");
  const [active, setActive] = useState<User | null>(null);
  const toast = useToast();

  const filtered = useMemo(() => (customers.data ?? []).filter((u) =>
    (kyc === "all" || u.kyc_status === kyc) &&
    (!q || (u.name ?? "").includes(q) || u.mobile.includes(q)),
  ), [customers.data, q, kyc]);

  return (
    <div>
      <PageHead title="مشتریان" subtitle="نقش، وضعیت احراز و موجودی — بدون امکان impersonate" />
      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا موبایل…" className="w-full h-10 rounded-[8px] border border-inkline bg-cream-0 ps-9 pe-3 text-[13px] focus-ring focus:border-gold-500" />
        </div>
        <Select value={kyc} onChange={(e) => setKyc(e.target.value)} options={[{ value: "all", label: "همه وضعیت‌های احراز" }, ...Object.entries(KYC_STATUS_FA).map(([k, v]) => ({ value: k, label: v.label }))]} />
      </div>
      {customers.error ? <Card pad={false}><ErrorState message={customers.error} onRetry={customers.retry} /></Card> : (
        <DataTable<User>
          columns={[
            { key: "name", header: "مشتری", render: (u) => <span className="flex items-center gap-2.5"><span className="h-8 w-8 rounded-full bg-gold-100 text-gold-700 grid place-items-center text-[12px] font-black">{(u.name ?? "؟").slice(0, 1)}</span><b>{u.name ?? "بدون نام"}</b></span> },
            { key: "mobile", header: "موبایل", render: (u) => <span className="tnum text-charcoal-700" dir="ltr">{u.mobile}</span> },
            { key: "role", header: "نقش", render: (u) => <Badge status={u.role === "dealer" ? "info" : u.role === "staff" ? "gold" : "neutral"}>{u.role === "dealer" ? "نماینده" : u.role === "staff" ? "کارمند" : "مشتری"}</Badge> },
            { key: "kyc_status", header: "احراز", render: (u) => <Badge status={KYC_STATUS_FA[u.kyc_status].status}>{KYC_STATUS_FA[u.kyc_status].label}</Badge> },
            { key: "created_at", header: "عضویت", render: (u) => <span className="tnum text-charcoal-500">{jalaliDate(u.created_at)}</span> },
          ]}
          rows={filtered} loading={customers.loading}
          onRowClick={(u) => setActive(u)}
          empty={<EmptyState icon={<Users size={24} />} title="مشتری‌ای پیدا نشد" /> as never}
        />
      )}

      <Drawer open={!!active} onClose={() => setActive(null)} title={active?.name ?? "جزئیات مشتری"}>
        {active && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 rounded-full bg-charcoal-900 text-gold-500 grid place-items-center text-[20px] font-black">{(active.name ?? "؟").slice(0, 1)}</span>
              <div>
                <p className="text-[15px] font-black">{active.name}</p>
                <p className="text-[12px] text-charcoal-500 tnum" dir="ltr">{active.mobile}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-inkline rounded-card p-3"><p className="text-[11px] text-charcoal-500">عضویت</p><p className="text-[13px] font-bold tnum mt-1">{jalaliDate(active.created_at)}</p></div>
              <div className="border border-inkline rounded-card p-3"><p className="text-[11px] text-charcoal-500">احراز هویت</p><Badge status={KYC_STATUS_FA[active.kyc_status].status} className="mt-1.5">{KYC_STATUS_FA[active.kyc_status].label}</Badge></div>
            </div>
            <div>
              <p className="text-[12.5px] font-bold text-charcoal-700 mb-2">تغییر نقش</p>
              <Select value={active.role} onChange={async (e) => {
                await adminApi.setRole(Number(active.id), e.target.value as User["role"]);
                customers.retry(); setActive(null);
                toast("نقش کاربر تغییر کرد");
              }} options={[{ value: "customer", label: "مشتری" }, { value: "dealer", label: "نماینده (عمده)" }]} />
            </div>
            <Alert kind="warning" title="محدودیت امنیتی">ورود به حساب کاربر (impersonate) در زرون غیرفعال است.</Alert>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ================================ AdminWalletsPage ================================ */
export function AdminWalletsPage() {
  const [q, setQ] = useState("09121234567");
  const data = usePageData(() => adminApi.walletLedgers(q), [q]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [currency, setCurrency] = useState<"irr" | "gold_mg">("irr");
  const [amount, setAmount] = useState(0);
  const [sign, setSign] = useState<1 | -1>(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [search, setSearch] = useState(q);

  return (
    <div>
      <PageHead title="کیف پول‌ها" subtitle="مشاهده گردش و اصلاح دستی با دلیل الزامی" />
      <form className="relative max-w-sm mb-5" onSubmit={(e) => { e.preventDefault(); setQ(search); }}>
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="موبایل یا نام مشتری…" className="w-full h-10 rounded-[8px] border border-inkline bg-cream-0 ps-9 pe-24 text-[13px] focus-ring focus:border-gold-500" />
        <Button size="sm" className="absolute end-1 top-1" onClick={() => setQ(search)}>جستجو</Button>
      </form>

      {data.loading ? <div className="grid lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        : data.error ? <Card pad={false}><ErrorState message={data.error} onRetry={data.retry} /></Card>
        : data.data && (
          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="h-fit">
              <p className="text-[14px] font-black">{data.data.user.name ?? "کاربر"}</p>
              <p className="text-[12px] text-charcoal-500 tnum mb-4" dir="ltr">{data.data.user.mobile}</p>
              {data.data.wallets.map((w) => (
                <div key={String(w.id)} className="flex justify-between items-center border border-inkline rounded-card px-3.5 py-3 mb-2.5">
                  <span className="text-[12.5px] text-charcoal-500 flex items-center gap-1.5"><WalletIcon size={13} className="text-gold-600" />{w.currency === "irr" ? "ریال" : "طلا (mg)"}</span>
                  <b className="tnum">{formatIrr(w.balance)}</b>
                </div>
              ))}
              <Button full variant="secondary" icon={<Plus size={15} />} onClick={() => { setAdjustOpen(true); setAmount(0); setReason(""); }}>اصلاح دستی موجودی</Button>
            </Card>
            <Card pad={false} className="lg:col-span-2">
              <h3 className="text-[13.5px] font-black px-5 pt-4 pb-2">آخرین تراکنش‌ها</h3>
              {data.data.ledger.length === 0 ? <EmptyState title="تراکنشی ندارد" /> : (
                <ul className="divide-y divide-inkline/60">
                  {data.data.ledger.map((l) => (
                    <li key={String(l.id)} className="px-5 py-3 flex items-center gap-3">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", l.direction === "credit" ? "bg-success" : "bg-danger")} />
                      <div className="flex-1 min-w-0"><p className="text-[12.5px] font-medium truncate">{l.reason}</p><p className="text-[10.5px] text-charcoal-500 tnum">{jalaliDate(l.created_at)}</p></div>
                      <b className={cn("tnum text-[12.5px]", l.direction === "credit" ? "text-success" : "text-danger")}>{l.direction === "credit" ? "+" : "−"}{formatIrr(l.amount)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="اصلاح دستی کیف پول" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setAdjustOpen(false)}>انصراف</Button>
          <Button loading={busy} disabled={amount === 0 || reason.trim().length < 5} onClick={async () => {
            setBusy(true);
            try {
              if (data.data) await adminApi.adjustWallet(Number(data.data.user.id), currency, amount * sign, reason);
              data.retry();
              setAdjustOpen(false);
              toast("موجودی اصلاح و در دفتر کل ثبت شد");
            } catch (e) { toast(e instanceof Error ? e.message : "خطا در اصلاح", "error"); }
            finally { setBusy(false); }
          }}>ثبت اصلاح</Button>
        </>}>
        <div className="space-y-4">
          <Select label="کیف پول" value={currency} onChange={(e) => setCurrency(e.target.value as "irr" | "gold_mg")}
            options={[{ value: "irr", label: "ریال" }, { value: "gold_mg", label: "طلا (mg)" }]} />
          <MoneyInput label={currency === "irr" ? "مبلغ (ریال)" : "وزن (mg)"} value={amount} onChange={setAmount} hint="برای کسر، عدد را منفی وارد نکنید؛ جهت را پایین انتخاب کنید" />
          <div className="flex gap-2">
            <button type="button" className={cn("flex-1 h-10 rounded-[8px] border-2 text-[13px] font-black transition-all", sign === 1 ? "border-success bg-success/10 text-success" : "border-inkline text-charcoal-500")} onClick={() => setSign(1)}>افزایش +</button>
            <button type="button" className={cn("flex-1 h-10 rounded-[8px] border-2 text-[13px] font-black transition-all", sign === -1 ? "border-danger bg-danger/10 text-danger" : "border-inkline text-charcoal-500")} onClick={() => setSign(-1)}>کسر −</button>
          </div>
          <Textarea label="دلیل اصلاح (الزامی)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: مغایرت درگاه — پیگیری ۸۸۳" />
          <Alert kind="warning" title="حسابرسی">همه اصلاح‌های دستی با نام کاربر و دلیل، برای همیشه در دفتر کل ثبت می‌شود.</Alert>
        </div>
      </Modal>
    </div>
  );
}

/* ================================ AdminPromotionsPage ================================ */
export function AdminPromotionsPage() {
  const [tab, setTab] = useState("coupons");
  const coupons = usePageData(() => promoApi.coupons());
  const gifts = usePageData(() => promoApi.gifts());
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed_irr">("percent");
  const [value, setValue] = useState(5);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div>
      <PageHead title="کمپین‌ها" subtitle="کد تخفیف، هدیه، معرفی و کش‌بک" />
      <Tabs value={tab} onChange={setTab} items={[
        { key: "coupons", label: "کدهای تخفیف" }, { key: "gifts", label: "هدیه‌ها" },
        { key: "referrals", label: "معرفی" }, { key: "cashback", label: "کش‌بک" },
      ]} />
      <div className="mt-5">
        {tab === "coupons" && (
          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="h-fit space-y-4">
              <h3 className="text-[14px] font-black">کد تخفیف جدید</h3>
              <Input label="کد" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="GOLD-YALDA" />
              <Select label="نوع" value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed_irr")}
                options={[{ value: "percent", label: "درصدی" }, { value: "fixed_irr", label: "مبلغ ثابت (ریال)" }]} />
              <MoneyInput label={type === "percent" ? "درصد تخفیف" : "مبلغ (ریال)"} value={value} onChange={setValue} />
              <Button full loading={busy} disabled={code.trim().length < 3} onClick={async () => {
                setBusy(true);
                await promoApi.createCoupon({ code: code.trim(), type, value, is_active: true });
                coupons.retry();
                setBusy(false); setCode("");
                toast("کد تخفیف ساخته شد");
              }}>ساخت کد</Button>
            </Card>
            <div className="lg:col-span-2 space-y-2.5">
              {coupons.loading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)
                : (coupons.data ?? []).map((c) => (
                  <Card key={String(c.id)} className="flex flex-wrap items-center gap-3">
                    <code className="bg-charcoal-900 text-gold-500 rounded-lg px-3 py-1.5 text-[13px] font-black tracking-wider" dir="ltr">{c.code}</code>
                    <span className="text-[12.5px] font-bold">{c.type === "percent" ? `${fa(c.value)}٪` : formatIrr(c.value) + " ریال"}</span>
                    <span className="text-[11.5px] text-charcoal-500 tnum">{fa(c.uses_count)} بار استفاده{c.max_uses ? ` از ${fa(c.max_uses)}` : ""}</span>
                    <Badge status={c.is_active ? "success" : "neutral"}>{c.is_active ? "فعال" : "غیرفعال"}</Badge>
                    <span className="ms-auto"><Switch checked={c.is_active} onChange={() => toast("وضعیت کد تغییر کرد", "info")} /></span>
                  </Card>
                ))}
            </div>
          </div>
        )}
        {tab === "gifts" && (
          gifts.loading ? <div className="space-y-2.5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            : (gifts.data ?? []).length === 0 ? <Card pad={false}><EmptyState icon={<Gift size={24} />} title="هدیه‌ای ثبت نشده" /></Card>
            : (
              <div className="space-y-2.5">
                {(gifts.data ?? []).map((g) => (
                  <Card key={String(g.id)} className="flex flex-wrap items-center gap-3">
                    <Gift size={17} className="text-gold-600" />
                    <b className="tnum">{formatMg(g.gold_mg)}</b>
                    <span className="text-[12px] text-charcoal-500 tnum" dir="ltr">{g.recipient_mobile}</span>
                    <Badge status={g.status === "redeemed" ? "success" : "info"}>{g.status === "redeemed" ? "دریافت شد" : "ارسال شد"}</Badge>
                  </Card>
                ))}
              </div>
            )
        )}
        {tab === "referrals" && (
          <Card>
            <h3 className="text-[14px] font-black mb-3 flex items-center gap-2"><BadgePercent size={16} className="text-gold-600" /> برنامه معرفی فعال</h3>
            <p className="text-[13px] leading-7 text-charcoal-700">جایزه فعلی: <b className="tnum">۱٬۲۰۰ میلی‌گرم</b> طلا برای معرف و <b className="tnum">۱٬۲۰۰</b> برای مهمان — پس از اولین معامله مهمان. تا امروز <b className="tnum">{fa(213)}</b> معرفی موفق و <b className="tnum">{formatMg(255_600)}</b> جایزه پرداخت شده است.</p>
          </Card>
        )}
        {tab === "cashback" && (
          <Card>
            <h3 className="text-[14px] font-black mb-3">کش‌بک معاملات</h3>
            <p className="text-[13px] leading-7 text-charcoal-700">کش‌بک فعلی: <b className="tnum">{fa(2)}</b> واحد پایه از اسپرد هر معامله برای کاربران با حجم ماهانه بیش از <b className="tnum">{formatMg(50_000)}</b>. وضعیت: <Badge status="success">فعال</Badge></p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ================================ AdminStaffPage ================================ */
export function AdminStaffPage() {
  const staff = usePageData(() => adminApi.staff());
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div className="max-w-3xl">
      <PageHead title="کارکنان" subtitle="دعوت، نقش و غیرفعال‌سازی دسترسی پنل" />
      <Card className="mb-5 flex flex-wrap items-end gap-3">
        <Input label="موبایل یا ایمیل" dir="ltr" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09xxxxxxxxx" className="flex-1 min-w-48" />
        <Select label="نقش" value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} options={[{ value: "staff", label: "کارمند" }, { value: "admin", label: "مدیر" }]} />
        <Button icon={<UserPlus size={15} />} loading={busy} disabled={mobile.trim().length < 6} onClick={async () => {
          setBusy(true);
          await adminApi.inviteStaff(mobile, role);
          setBusy(false); setMobile("");
          toast("دعوت‌نامه ارسال شد");
        }}>دعوت</Button>
      </Card>
      {staff.loading ? <div className="space-y-2.5">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : (
          <div className="space-y-2.5">
            {(staff.data ?? []).map((u) => (
              <Card key={String(u.id)} className="flex flex-wrap items-center gap-3.5">
                <span className="h-11 w-11 rounded-full bg-charcoal-900 text-gold-500 grid place-items-center font-black">{(u.name ?? "؟").slice(0, 1)}</span>
                <div className="flex-1 min-w-36">
                  <p className="text-[13.5px] font-bold">{u.name}</p>
                  <p className="text-[11.5px] text-charcoal-500 tnum" dir="ltr">{u.mobile}</p>
                </div>
                <Badge status={u.role === "admin" ? "gold" : "neutral"}>{u.role === "admin" ? "مدیر" : "کارمند"}</Badge>
                <Switch checked label="فعال" onChange={() => toast("وضعیت دسترسی تغییر کرد", "info")} />
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

/* ================================ AdminSettingsPage ================================ */
export function AdminSettingsPage() {
  const s = adminApi.settings;
  const [form, setForm] = useState({ ...s });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const num = (k: keyof typeof form) => (v: number) => setForm({ ...form, [k]: v });

  return (
    <div className="max-w-3xl">
      <PageHead title="تنظیمات" subtitle="اسپرد، سقف‌ها، درگاه‌ها و حالت تعمیرات" />
      <div className="space-y-5">
        <Card>
          <h2 className="text-[14.5px] font-black mb-4 flex items-center gap-2"><Settings2 size={16} className="text-gold-600" /> معاملات</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <MoneyInput label="اسپرد خرید Bid (bps)" value={form.bid_bps} onChange={num("bid_bps")} />
            <MoneyInput label="اسپرد فروش Ask (bps)" value={form.ask_bps} onChange={num("ask_bps")} />
            <MoneyInput label="TTL قیمت (ثانیه)" value={form.quote_ttl_sec} onChange={num("quote_ttl_sec")} />
            <MoneyInput label="حداکثر اسلیپیج (bps)" value={form.slippage_bps} onChange={num("slippage_bps")} />
            <MoneyInput label="حداقل معامله (mg)" value={form.min_trade_mg} onChange={num("min_trade_mg")} />
            <MoneyInput label="سقف روزانه احرازنشده (ریال)" value={form.unverified_daily_cap_irr} onChange={num("unverified_daily_cap_irr")} />
          </div>
        </Card>
        <Card>
          <h2 className="text-[14.5px] font-black mb-4">مالی و حقوقی</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <MoneyInput label="مالیات بر ارزش افزوده (٪)" value={form.vat_pct} onChange={num("vat_pct")} />
            <Input label="نام حقوقی فاکتور" value={form.invoice_legal_name} onChange={(e) => setForm({ ...form, invoice_legal_name: e.target.value })} />
            <Input label="شماره ثبت" value={form.invoice_reg_no} onChange={(e) => setForm({ ...form, invoice_reg_no: e.target.value })} />
            <Input label="درگاه پرداخت (PSP)" value={form.psp} onChange={(e) => setForm({ ...form, psp: e.target.value })} />
            <Input label="ارائه‌دهنده پیامک" value={form.sms_provider} onChange={(e) => setForm({ ...form, sms_provider: e.target.value })} />
            <div className="sm:col-span-2">
              <Input label="نشانی خزانه" value={form.vault_address} onChange={(e) => setForm({ ...form, vault_address: e.target.value })} />
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-[14.5px] font-black mb-4">امنیت و دسترس‌پذیری</h2>
          <div className="space-y-3.5">
            <Switch label="OTP برای برداشت و فروش" checked={form.otp_enabled} onChange={(v) => setForm({ ...form, otp_enabled: v })} />
            <Switch label="حالت تعمیرات (Maintenance)" checked={form.maintenance} onChange={(v) => setForm({ ...form, maintenance: v })} />
            <div className="border-2 border-danger/30 bg-danger/5 rounded-card p-4">
              <p className="text-[13px] font-black text-danger">منطقه خطر — توقف معاملات</p>
              <p className="text-[12px] text-charcoal-700 leading-6 mt-1">توقف کامل خرید و فروش برای همه کاربران. از داشبورد مدیریت با تأیید کلمه HALT انجام می‌شود.</p>
              <Badge status={form.trading_halt ? "halted" : "success"} className="mt-2.5">{form.trading_halt ? "معاملات متوقف است" : "معاملات فعال است"}</Badge>
            </div>
          </div>
        </Card>
        <div className="flex justify-end">
          <Button size="lg" loading={busy} onClick={async () => {
            setBusy(true);
            await adminApi.saveSettings(form);
            setBusy(false);
            toast("تنظیمات ذخیره شد");
          }}>ذخیره تنظیمات</Button>
        </div>
      </div>
    </div>
  );
}

/* ================================ AdminBroadcastPage ================================ */
export function AdminBroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("in_app");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div className="max-w-2xl">
      <PageHead title="اعلان همگانی" subtitle="ارسال پیام به همه مشتریان یا یک بخش" />
      <Card className="space-y-4">
        <div className="bg-charcoal-900 rounded-card p-4 text-cream-0 flex items-center gap-3">
          <Megaphone size={18} className="text-gold-500" />
          <p className="text-[12.5px] leading-6">اعلان همگانی برای <b className="text-gold-500 tnum">{fa(720)}</b> کاربر فعال ارسال می‌شود. در ارسال دقت کنید — قابل بازگشت نیست.</p>
        </div>
        <Input label="عنوان اعلان" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: جشنواره یلدا از امشب" />
        <Textarea label="متن پیام" value={body} onChange={(e) => setBody(e.target.value)} placeholder="متن کوتاه و روشن بنویسید…" />
        <Select label="کانال ارسال" value={channel} onChange={(e) => setChannel(e.target.value)}
          options={[{ value: "in_app", label: "اعلان داخل برنامه" }, { value: "sms", label: "پیامک" }, { value: "both", label: "هر دو" }]} />
        <Button size="lg" icon={<Send size={16} />} disabled={title.trim().length < 3 || body.trim().length < 5} onClick={() => setConfirmOpen(true)}>ارسال همگانی</Button>
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="تأیید ارسال همگانی" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>بازگشت</Button>
          <Button loading={busy} onClick={async () => {
            setBusy(true);
            await notifyApi.broadcast(title, body);
            setBusy(false); setConfirmOpen(false);
            setTitle(""); setBody("");
            toast("اعلان برای همه کاربران ارسال شد");
          }}>بله، ارسال شود</Button>
        </>}>
        <p className="text-[13.5px] leading-7 text-charcoal-700">
          «<b>{title}</b>» از طریق <b>{channel === "both" ? "پیامک و اعلان" : channel === "sms" ? "پیامک" : "اعلان داخل برنامه"}</b> برای <b className="tnum">{fa(720)}</b> کاربر ارسال می‌شود.
        </p>
      </Modal>
    </div>
  );
}
