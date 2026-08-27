import { useMemo, useState } from "react";
import type { Order, OrderStatus, Ticket, User } from "../types";
import { adminApi, catalogApi, orderApi, staffApi, supportApi } from "../api";
import { cn, fa, formatIrr, formatMg, jalaliDate, timeAgo, usePageData } from "../lib";
import { Badge, Button, Card, DataTable, Input, KYC_STATUS_FA, Modal, ORDER_STATUS_FA, PageHead, Select, Skeleton, StatCard, Textarea, type Column } from "../components/ui";
import { EmptyState, ErrorState, useToast } from "../components/feedback";
import { GoldBarChart } from "../components/charts";
import { Check, Inbox, PackageCheck, Printer, Search, ShieldCheck, ShieldX, Truck, X } from "../components/icons";

/* ================================ StaffDashboardPage ================================ */
export function StaffDashboardPage() {
  const kyc = usePageData(() => staffApi.kycQueue());
  const orders = usePageData(() => orderApi.allOrders());
  const tickets = usePageData(() => supportApi.tickets());

  const pendingKyc = (kyc.data ?? []).filter((u) => u.kyc_status === "pending").length;
  const openTickets = (tickets.data ?? []).filter((t) => t.status !== "closed").length;
  const processing = (orders.data ?? []).filter((o) => ["paid", "processing"].includes(o.status)).length;

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    (orders.data ?? []).forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      t: ORDER_STATUS_FA[status]?.label ?? status,
      value: count,
      id: status,
    }));
  }, [orders.data]);

  return (
    <div className="space-y-6">
      <PageHead title="صف عملیات" subtitle="خلاصه کارهای امروز تیم عملیات — الهام رضایی" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <StatCard label="KYC در انتظار" value={kyc.loading ? <Skeleton className="h-6 w-10" /> : fa(pendingKyc)} icon={<ShieldCheck size={17} />} />
        <StatCard label="سفارش در پردازش" value={orders.loading ? <Skeleton className="h-6 w-10" /> : fa(processing)} icon={<PackageCheck size={17} />} />
        <StatCard label="تیکت باز" value={tickets.loading ? <Skeleton className="h-6 w-10" /> : fa(openTickets)} icon={<Inbox size={17} />} />
        <StatCard label="مرسوله امروز" value={fa(3)} icon={<Truck size={17} />} />
      </div>
      <GoldBarChart title="سفارش‌ها بر اساس وضعیت" data={byStatus} loading={orders.loading} error={orders.error} onRetry={orders.retry} unit="raw" height={260} horizontal />
    </div>
  );
}

/* ================================ StaffOrdersPage ================================ */
export function StaffOrdersPage() {
  const orders = usePageData(() => orderApi.allOrders());
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [trackFor, setTrackFor] = useState<Order | null>(null);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const filtered = useMemo(() => (orders.data ?? []).filter((o) =>
    (status === "all" || o.status === status) &&
    (!q || o.number.includes(q) || (o.customer?.name ?? "").includes(q) || (o.customer?.mobile ?? "").includes(q)),
  ), [orders.data, status, q]);

  return (
    <div>
      <PageHead title="سفارش‌ها" subtitle="تغییر وضعیت، ثبت کد رهگیری و چاپ لیبل" />
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="شماره سفارش، نام یا موبایل…" className="w-full h-10 rounded-[8px] border border-inkline bg-cream-0 ps-9 pe-3 text-[13px] focus-ring focus:border-gold-500" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[
          { value: "all", label: "همه وضعیت‌ها" },
          ...Object.entries(ORDER_STATUS_FA).map(([k, v]) => ({ value: k, label: v.label })),
        ]} />
      </div>
      {orders.error ? <Card pad={false}><ErrorState message={orders.error} onRetry={orders.retry} /></Card> : (
        <DataTable<Order>
          columns={[
            { key: "number", header: "شماره", render: (o) => <b className="text-[12px]" dir="ltr">{o.number}</b> },
            { key: "customer", header: "مشتری", render: (o) => <span><b className="block text-[12.5px]">{o.customer?.name ?? "—"}</b><span className="text-[11px] text-charcoal-500 tnum" dir="ltr">{o.customer?.mobile}</span></span> },
            { key: "created_at", header: "تاریخ", render: (o) => <span className="tnum text-charcoal-700">{jalaliDate(o.created_at)}</span> },
            { key: "total_irr", header: "مبلغ", align: "end", render: (o) => <b className="tnum">{formatIrr(o.total_irr)}</b> },
            { key: "gold_mg", header: "طلا", align: "end", render: (o) => <span className="tnum">{formatMg(o.gold_mg)}</span> },
            { key: "status", header: "وضعیت", render: (o) => (
              <select value={o.status} aria-label="تغییر وضعیت"
                onChange={async (e) => { await orderApi.updateOrderStatus(Number(o.id), e.target.value as OrderStatus); orders.retry(); toast("وضعیت سفارش تغییر کرد"); }}
                className="h-8 rounded-md border border-inkline bg-cream-0 px-2 text-[11.5px] font-medium focus-ring cursor-pointer">
                {Object.entries(ORDER_STATUS_FA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            ) },
            { key: "ful", header: "دریافت", render: (o) => <Badge status={o.fulfillment === "vault" ? "vaulted" : "shipped"}>{o.fulfillment === "vault" ? "خزانه" : "ارسال"}</Badge> },
          ]}
          rows={filtered} loading={orders.loading} dense
          actions={(o) => (
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="ghost" icon={<Truck size={13} />} onClick={() => { setTrackFor(o); setTracking(o.shipment?.tracking_code ?? ""); }}>رهگیری</Button>
              <Button size="sm" variant="ghost" icon={<Printer size={13} />} onClick={() => { toast("لیبل ارسال چاپ شد"); window.print(); }}>لیبل</Button>
            </div>
          )}
          empty={<EmptyState icon={<PackageCheck size={24} />} title="سفارشی با این مشخصات نیست" /> as never}
        />
      )}

      <Modal open={!!trackFor} onClose={() => setTrackFor(null)} title="ثبت کد رهگیری" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setTrackFor(null)}>انصراف</Button>
          <Button loading={busy} disabled={tracking.trim().length < 4} onClick={async () => {
            if (!trackFor) return;
            setBusy(true);
            await orderApi.updateOrderStatus(Number(trackFor.id), "shipped", tracking.trim());
            orders.retry();
            setBusy(false); setTrackFor(null);
            toast("کد رهگیری ثبت و سفارش ارسال شد");
          }}>ثبت رهگیری</Button>
        </>}>
        <div className="space-y-3">
          <p className="text-[13px] text-charcoal-700">مرسوله <b dir="ltr">{trackFor?.number}</b> — {trackFor?.customer?.name}</p>
          <Input label="کد رهگیری پست / تیپاکس" dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="IRPOST-000000" />
        </div>
      </Modal>
    </div>
  );
}

/* ================================ StaffKycPage ================================ */
export function StaffKycPage() {
  const queue = usePageData(() => staffApi.kycQueue());
  const [rejectFor, setRejectFor] = useState<(User & { submitted_at: string }) | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const sorted = useMemo(() => [...(queue.data ?? [])].sort((a, b) =>
    (a.kyc_status === "pending" ? 0 : 1) - (b.kyc_status === "pending" ? 0 : 1)), [queue.data]);

  return (
    <div>
      <PageHead title="صف احراز هویت" subtitle="بررسی مدارک، تأیید یا رد با ذکر دلیل" />
      {queue.error ? <Card pad={false}><ErrorState message={queue.error} onRetry={queue.retry} /></Card>
        : queue.loading ? <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
        : (
          <div className="grid md:grid-cols-2 gap-4">
            {sorted.map((u) => (
              <Card key={String(u.id)} className={cn(u.kyc_status === "pending" && "border-gold-300 bg-gold-50/40")}>
                <div className="flex items-center gap-3.5">
                  <span className="h-12 w-12 rounded-full bg-charcoal-900 text-gold-500 grid place-items-center text-[16px] font-black shrink-0">{(u.name ?? "؟").slice(0, 1)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate">{u.name ?? "بدون نام"}</p>
                    <p className="text-[12px] text-charcoal-500 tnum" dir="ltr">{u.mobile}</p>
                    <p className="text-[10.5px] text-charcoal-500 mt-0.5">ارسال مدارک: {jalaliDate(u.submitted_at)}</p>
                  </div>
                  <Badge status={KYC_STATUS_FA[u.kyc_status].status}>{KYC_STATUS_FA[u.kyc_status].label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  {["کارت ملی", "سلفی احراز"].map((d) => (
                    <div key={d} className="h-20 rounded-lg bg-cream-100 border border-inkline grid place-items-center text-[11px] text-charcoal-500">
                      <span className="text-center">{d}<br /><span className="text-[9.5px] text-gold-600 font-bold">نمایش مدرک</span></span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button full variant="primary" size="sm" icon={<Check size={14} />} loading={busy}
                    disabled={u.kyc_status === "approved"}
                    onClick={async () => { setBusy(true); await staffApi.approveKyc(Number(u.id)); queue.retry(); setBusy(false); toast(`مدارک ${u.name ?? "کاربر"} تأیید شد`); }}>تأیید مدارک</Button>
                  <Button full variant="danger" size="sm" icon={<X size={14} />} disabled={u.kyc_status === "rejected"} onClick={() => { setRejectFor(u); setReason(""); }}>رد مدارک</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

      <Modal open={!!rejectFor} onClose={() => setRejectFor(null)} title="رد مدارک احراز هویت" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setRejectFor(null)}>انصراف</Button>
          <Button variant="danger" loading={busy} disabled={reason.trim().length < 5} onClick={async () => {
            if (!rejectFor) return;
            setBusy(true);
            await staffApi.rejectKyc(Number(rejectFor.id), reason);
            queue.retry();
            setBusy(false); setRejectFor(null);
            toast("مدارک رد شد و به مشتری اطلاع داده شد", "info");
          }}>رد مدارک</Button>
        </>}>
        <div className="space-y-3">
          <p className="text-[13px] text-charcoal-700">دلیل رد برای <b>{rejectFor?.name}</b> — این پیام برای مشتری ارسال می‌شود.</p>
          <Textarea label="دلیل رد" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: تصویر کارت ملی ناخوانا است" />
        </div>
      </Modal>
    </div>
  );
}

/* ================================ StaffInventoryPage ================================ */
export function StaffInventoryPage() {
  const inv = usePageData(() => adminApi.inventory());
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState(0);
  const toast = useToast();

  return (
    <div>
      <PageHead title="موجودی انبار" subtitle="ویرایش سریع موجودی — کمبودها با رنگ هشدار مشخص شده‌اند" />
      {inv.error ? <Card pad={false}><ErrorState message={inv.error} onRetry={inv.retry} /></Card>
        : inv.loading ? <div className="space-y-2.5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        : (
          <Card pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead><tr className="bg-cream-50 text-[11.5px] text-charcoal-500">
                  <th className="px-4 py-3 text-start font-medium">SKU</th><th className="px-4 py-3 text-start font-medium">محصول</th>
                  <th className="px-4 py-3 text-end font-medium">موجودی</th><th className="px-4 py-3 text-end font-medium">رزرو</th>
                  <th className="px-4 py-3 text-end font-medium">نقطه سفارش</th><th className="px-4 py-3 text-start font-medium">به‌روزرسانی</th>
                </tr></thead>
                <tbody className="divide-y divide-inkline/70">
                  {inv.data?.map((r) => {
                    const low = r.on_hand <= r.reorder;
                    return (
                      <tr key={r.sku} className={cn("hover:bg-gold-50/60 transition-colors", low && "bg-warning/5")}>
                        <td className="px-4 py-3 font-mono text-[11.5px]" dir="ltr">{r.sku}</td>
                        <td className="px-4 py-3 font-bold">{r.name}{low && <Badge status="warning" className="ms-2">کمبود</Badge>}</td>
                        <td className="px-4 py-3 text-end">
                          {editing === r.sku ? (
                            <span className="inline-flex items-center gap-1.5">
                              <input autoFocus type="number" value={val} onChange={(e) => setVal(Number(e.target.value))}
                                className="w-20 h-9 rounded-md border border-gold-500 bg-cream-0 px-2 text-center tnum focus-ring" aria-label="موجودی جدید" />
                              <Button size="sm" onClick={async () => { await adminApi.setStock(r.sku, val); inv.retry(); setEditing(null); toast("موجودی به‌روزرسانی شد"); }}>ثبت</Button>
                            </span>
                          ) : (
                            <button className={cn("tnum font-black text-[14px] px-2 py-1 rounded-md hover:bg-gold-100 transition-colors", low ? "text-warning" : "text-charcoal-900")}
                              onClick={() => { setEditing(r.sku); setVal(r.on_hand); }} title="ویرایش موجودی">{fa(r.on_hand)}</button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-end tnum">{fa(r.reserved)}</td>
                        <td className="px-4 py-3 text-end tnum text-charcoal-500">{fa(r.reorder)}</td>
                        <td className="px-4 py-3 text-[11.5px] text-charcoal-500 tnum">{jalaliDate(r.updated)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
    </div>
  );
}

/* ================================ StaffTicketsPage ================================ */
export function StaffTicketsPage() {
  const tickets = usePageData(() => supportApi.tickets());
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div>
      <PageHead title="تیکت‌ها" subtitle="پاسخ، تخصیص و بستن درخواست‌های مشتریان" />
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-2.5">
          {tickets.loading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)
            : tickets.error ? <Card pad={false}><ErrorState message={tickets.error} onRetry={tickets.retry} /></Card>
            : (tickets.data ?? []).map((t) => (
              <button key={String(t.id)} onClick={() => setActive(t)}
                className={cn("w-full text-start bg-cream-0 border rounded-card px-4 py-3.5 transition-colors",
                  active?.id === t.id ? "border-gold-500 bg-gold-50/60" : "border-inkline hover:border-gold-300")}>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-black text-gold-700 tnum" dir="ltr">#{t.id}</span>
                  <Badge status={t.priority === "high" ? "danger" : t.priority === "normal" ? "info" : "neutral"}>{t.priority === "high" ? "فوری" : t.priority === "normal" ? "عادی" : "کم"}</Badge>
                  <span className="ms-auto text-[10.5px] text-charcoal-500">{timeAgo(t.updated_at)}</span>
                </div>
                <p className="text-[13px] font-bold mt-1.5 truncate">{t.subject}</p>
                <p className="text-[11.5px] text-charcoal-500 mt-0.5">{t.user?.name} · <span className="tnum" dir="ltr">{t.user?.mobile}</span></p>
              </button>
            ))}
        </div>
        <Card className="lg:col-span-3 h-fit">
          {!active ? <EmptyState icon={<Inbox size={24} />} title="تیکتی انتخاب نشده" body="از فهرست، یک تیکت را باز کنید." /> : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-inkline mb-4">
                <div>
                  <p className="text-[15px] font-black">{active.subject}</p>
                  <p className="text-[11.5px] text-charcoal-500 mt-0.5">#{fa(String(active.id))} · {active.user?.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => toast("به صف شما تخصیص یافت")}>تخصیص به من</Button>
                  <Button size="sm" variant="danger" onClick={async () => { await supportApi.close(Number(active.id)); tickets.retry(); setActive(null); toast("تیکت بسته شد", "info"); }}>بستن</Button>
                </div>
              </div>
              <Textarea label="پاسخ پشتیبانی" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ رسمی تیم…" />
              <Button className="mt-3" loading={busy} disabled={reply.trim().length < 2} onClick={async () => {
                setBusy(true);
                await supportApi.reply(Number(active.id), reply, true);
                tickets.retry();
                setReply("");
                setBusy(false);
                toast("پاسخ برای مشتری ارسال شد");
              }}>ارسال پاسخ</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ================================ StaffCustomersPage ================================ */
export function StaffCustomersPage() {
  const customers = usePageData(() => adminApi.customers());
  const [q, setQ] = useState("");
  const filtered = useMemo(() => (customers.data ?? []).filter((u) =>
    u.role === "customer" || u.role === "dealer")
    .filter((u) => !q || (u.name ?? "").includes(q) || u.mobile.includes(q)), [customers.data, q]);

  return (
    <div>
      <PageHead title="مشتریان" subtitle="فقط مشاهده — تغییر نقش در پنل مدیریت ممکن است" />
      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا موبایل…" className="w-full h-10 rounded-[8px] border border-inkline bg-cream-0 ps-9 pe-3 text-[13px] focus-ring focus:border-gold-500" />
      </div>
      {customers.error ? <Card pad={false}><ErrorState message={customers.error} onRetry={customers.retry} /></Card> : (
        <DataTable<User>
          columns={[
            { key: "name", header: "مشتری", render: (u) => <span className="flex items-center gap-2.5"><span className="h-8 w-8 rounded-full bg-gold-100 text-gold-700 grid place-items-center text-[12px] font-black">{(u.name ?? "؟").slice(0, 1)}</span><b>{u.name ?? "بدون نام"}</b></span> },
            { key: "mobile", header: "موبایل", render: (u) => <span className="tnum text-charcoal-700" dir="ltr">{u.mobile}</span> },
            { key: "role", header: "نقش", render: (u) => <Badge status={u.role === "dealer" ? "info" : "neutral"}>{u.role === "dealer" ? "نماینده" : "مشتری"}</Badge> },
            { key: "kyc", header: "احراز هویت", render: (u) => <Badge status={KYC_STATUS_FA[u.kyc_status].status}>{KYC_STATUS_FA[u.kyc_status].label}</Badge> },
            { key: "created_at", header: "عضویت", render: (u) => <span className="tnum text-charcoal-500">{jalaliDate(u.created_at)}</span> },
          ]}
          rows={filtered} loading={customers.loading}
          empty={<EmptyState icon={<Search size={24} />} title="مشتری‌ای پیدا نشد" /> as never}
        />
      )}
    </div>
  );
}
