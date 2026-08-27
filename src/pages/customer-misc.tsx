import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { AppNotification, InstallmentContract, Ticket, TicketMessage } from "../types";
import { dealerApi, investApi, notifyApi, profileApi, promoApi, supportApi } from "../api";
import { useApp } from "../auth";
import { cn, copyText, fa, formatIrr, formatMg, jalaliDate, timeAgo, usePageData } from "../lib";
import {
  Badge, Button, Card, DataTable, Field, FileDropzone, Input, KYC_STATUS_FA, MobileInput,
  MoneyInput, PageHead, ProgressStepper, Radio, Select, Skeleton, Slider, StatCard, Switch, Tabs,
  Textarea, Timeline,
} from "../components/ui";
import { Alert, Banner, EmptyState, ErrorState, useToast } from "../components/feedback";
import { PackagingPicker } from "../components/commerce";
import {
  ArrowLeft, BellRing, BellOff, CalendarClock, Check, CheckCircle2, Copy, Factory, Gift,
  Landmark, LifeBuoy, Pencil, Plus, Send, Share2, ShieldCheck, Trash2, Users, X, Boxes,
} from "../components/icons";

/* ================================ AutoInvestPage ================================ */
export function AutoInvestPage() {
  const plans = usePageData(() => investApi.plans());
  const [amount, setAmount] = useState(10_000_000);
  const [day, setDay] = useState(5);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div>
      <PageHead title="خرید پله‌ای" subtitle="هر ماه به‌صورت خودکار طلا بخرید — بدون تصمیم‌گیری، بدون جا ماندن" />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 h-fit space-y-4">
          <h2 className="text-[14.5px] font-black">برنامه جدید</h2>
          <MoneyInput label="مبلغ خرید ماهانه" value={amount} onChange={setAmount} min={1_000_000} />
          <div>
            <p className="text-[12.5px] font-medium text-charcoal-700 mb-2">روز خرید در ماه: <b className="tnum">{fa(day)}</b></p>
            <Slider value={day} min={1} max={28} onChange={setDay} />
          </div>
          <Button full loading={busy} disabled={amount < 1_000_000} onClick={async () => {
            setBusy(true);
            await investApi.createPlan(amount, day);
            plans.retry();
            setBusy(false);
            toast("برنامه خرید پله‌ای فعال شد");
          }}>فعال‌سازی برنامه</Button>
          <p className="text-[11.5px] text-charcoal-500 leading-5">معادل مبلغ، طلای ۱۸ عیار با نرخ همان روز خریداری و به کیف پول شما اضافه می‌شود.</p>
        </Card>
        <div className="lg:col-span-2 space-y-3">
          {plans.loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)
            : (plans.data ?? []).length === 0 ? <Card pad={false}><EmptyState icon={<CalendarClock size={24} />} title="برنامه‌ای ندارید" body="با ماهی ۱ میلیون تومان شروع کنید؛ بعداً قابل تغییر است." /></Card>
            : (plans.data ?? []).map((p) => (
              <Card key={String(p.id)} className="flex flex-wrap items-center gap-4">
                <span className={cn("h-11 w-11 rounded-card grid place-items-center", p.is_active ? "bg-gold-50 text-gold-600 border border-gold-100" : "bg-cream-100 text-charcoal-500")}><CalendarClock size={18} /></span>
                <div className="flex-1 min-w-40">
                  <p className="text-[14px] font-black tnum">{formatIrr(p.amount_irr)} ریال</p>
                  <p className="text-[12px] text-charcoal-500 mt-0.5">هر ماه، روز {fa(p.day_of_month)} — تقریباً {formatMg(Math.round(p.amount_irr / 3520))}</p>
                </div>
                <Badge status={p.is_active ? "success" : "neutral"}>{p.is_active ? "فعال" : "متوقف"}</Badge>
                <Switch checked={p.is_active} onChange={async () => { await investApi.togglePlan(Number(p.id)); plans.retry(); toast(p.is_active ? "برنامه متوقف شد" : "برنامه فعال شد", "info"); }} label={p.is_active ? "توقف" : "ادامه"} />
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ================================ InstallmentsPage ================================ */
export function InstallmentsPage() {
  const contracts = usePageData(() => investApi.contracts());
  const [payOpen, setPayOpen] = useState<InstallmentContract | null>(null);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div>
      <PageHead title="خرید اقساطی" subtitle="قراردادهای قسط‌بندی طلا و وضعیت پرداخت‌ها" />
      {contracts.loading ? <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        : (contracts.data ?? []).length === 0 ? <Card pad={false}><EmptyState icon={<CalendarClock size={24} />} title="قرارداد اقساطی ندارید" body="خرید اقساطی برای مشتریان تأییدشده فعال می‌شود." /></Card>
        : (contracts.data ?? []).map((c) => {
          const pct = Math.round((c.paid_irr / c.principal_irr) * 100);
          return (
            <Card key={String(c.id)} className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[14.5px] font-black">قرارداد {fa(c.months)} ماهه</p>
                  <p className="text-[12px] text-charcoal-500 tnum mt-1">پیش‌پرداخت {formatIrr(c.down_irr)} · اصل {formatIrr(c.principal_irr)}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge status={c.remaining_irr === 0 ? "success" : "pending"}>{c.remaining_irr === 0 ? "تسویه‌شده" : "فعال"}</Badge>
                  <Button size="sm" onClick={() => { setPayOpen(c); setAmount(Math.round((c.principal_irr - c.down_irr) / c.months)); }}>پرداخت قسط</Button>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-cream-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-l from-gold-400 to-gold-600 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[11.5px] text-charcoal-500 mt-2 tnum">
                <span>پرداخت‌شده: {formatIrr(c.paid_irr)} ({fa(pct)}٪)</span>
                <span>مانده: {formatIrr(c.remaining_irr)}</span>
              </div>
            </Card>
          );
        })}

      {payOpen && (
        <div>
          <ModalWrap open onClose={() => setPayOpen(null)} title="پرداخت قسط" size="sm"
            footer={<>
              <Button variant="ghost" onClick={() => setPayOpen(null)}>انصراف</Button>
              <Button loading={busy} disabled={amount < 100_000} onClick={async () => {
                setBusy(true);
                await investApi.payInstallment(Number(payOpen.id), amount);
                contracts.retry();
                setBusy(false);
                setPayOpen(null);
                toast("قسط پرداخت شد");
              }}>پرداخت {formatIrr(amount)} ریال</Button>
            </>}>
            <MoneyInput label="مبلغ قسط" value={amount} onChange={setAmount} min={100_000} />
            <p className="text-[11.5px] text-charcoal-500 mt-3 leading-5">از کیف پول ریال کسر می‌شود؛ در صورت کسری، کیف پول را شارژ کنید.</p>
          </ModalWrap>
        </div>
      )}
    </div>
  );
}

import { Modal as ModalWrap } from "../components/ui";

/* ================================ PriceAlertsPage ================================ */
export function PriceAlertsPage() {
  const alerts = usePageData(() => import("../api").then((m) => m.pricingApi.alerts()));
  const [karat, setKarat] = useState<18 | 24>(18);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState(3_600_000);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div>
      <PageHead title="هشدار قیمت" subtitle="به‌محض عبور قیمت از آستانه، پیامک و اعلان دریافت کنید" />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="h-fit space-y-4">
          <h2 className="text-[14.5px] font-black">هشدار جدید</h2>
          <Select label="عیار" value={karat} onChange={(e) => setKarat(Number(e.target.value) as 18 | 24)}
            options={[{ value: 18, label: "۱۸ عیار" }, { value: 24, label: "۲۴ عیار" }]} />
          <div>
            <p className="text-[12.5px] font-medium text-charcoal-700 mb-2">شرط هشدار</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDirection("above")} className={cn("h-11 rounded-[8px] border-2 text-[13px] font-bold transition-all", direction === "above" ? "border-gold-500 bg-gold-50 text-gold-700" : "border-inkline text-charcoal-500")}>بالاتر از</button>
              <button onClick={() => setDirection("below")} className={cn("h-11 rounded-[8px] border-2 text-[13px] font-bold transition-all", direction === "below" ? "border-gold-500 bg-gold-50 text-gold-700" : "border-inkline text-charcoal-500")}>پایین‌تر از</button>
            </div>
          </div>
          <MoneyInput label="آستانه (ریال بر گرم)" value={threshold} onChange={setThreshold} min={100_000} />
          <Button full loading={busy} onClick={async () => {
            setBusy(true);
            const { pricingApi } = await import("../api");
            await pricingApi.createAlert({ karat, direction, threshold_irr: threshold, is_active: true });
            alerts.retry();
            setBusy(false);
            toast("هشدار فعال شد");
          }}>ساخت هشدار</Button>
        </Card>
        <div className="lg:col-span-2 space-y-2.5">
          {alerts.loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)
            : alerts.error ? <Card pad={false}><ErrorState message={alerts.error} onRetry={alerts.retry} /></Card>
            : (alerts.data ?? []).length === 0 ? <Card pad={false}><EmptyState icon={<BellRing size={24} />} title="هشداری ندارید" body="اولین هشدار قیمت را بسازید — رایگان است." /></Card>
            : (alerts.data ?? []).map((a) => (
              <Card key={String(a.id)} className="flex flex-wrap items-center gap-3.5">
                <span className={cn("h-10 w-10 rounded-full grid place-items-center", a.direction === "above" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                  {a.direction === "above" ? <BellRing size={16} /> : <BellOff size={16} />}
                </span>
                <div className="flex-1 min-w-44">
                  <p className="text-[13.5px] font-bold">طلای {fa(a.karat)} عیار {a.direction === "above" ? "بالاتر از" : "پایین‌تر از"} <b className="tnum">{formatIrr(a.threshold_irr)}</b></p>
                  <p className="text-[11.5px] text-charcoal-500 mt-0.5">پیامک + اعلان داخل برنامه</p>
                </div>
                <Switch checked={a.is_active} onChange={async () => { const { pricingApi } = await import("../api"); await pricingApi.toggleAlert(Number(a.id)); alerts.retry(); }} />
                <button aria-label="حذف هشدار" onClick={async () => { const { pricingApi } = await import("../api"); await pricingApi.deleteAlert(Number(a.id)); alerts.retry(); toast("هشدار حذف شد", "info"); }}
                  className="p-2.5 rounded-md text-charcoal-500 hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={15} /></button>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ================================ GiftsPage ================================ */
export function GiftsPage() {
  const gifts = usePageData(() => promoApi.gifts());
  const [mobile, setMobile] = useState("");
  const [mg, setMg] = useState(1000);
  const [pack, setPack] = useState<"standard" | "luxury">("luxury");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div>
      <PageHead title="هدیه طلا" subtitle="میلی‌گرم طلا با کد اختصاصی و بسته‌بندی هدیه — بدون نیاز به آدرس گیرنده" />
      <div className="grid lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-3 space-y-4">
          <h2 className="text-[15px] font-black flex items-center gap-2"><Gift size={17} className="text-gold-600" /> ساخت هدیه جدید</h2>
          <MobileInput label="موبایل گیرنده" value={mobile} onChange={(e) => setMobile(e.target.value)} hint="کد هدیه برای این شماره پیامک می‌شود" />
          <div>
            <p className="text-[12.5px] font-medium text-charcoal-700 mb-2">وزن هدیه: <b className="tnum">{formatMg(mg)}</b></p>
            <Slider value={mg} min={200} max={20000} step={200} onChange={setMg} />
            <p className="text-[12px] text-charcoal-500 mt-2 tnum">معادل {formatIrr(Math.round((mg / 1000) * 3_520_000))} ریال + هزینه بسته‌بندی</p>
          </div>
          <PackagingPicker value={pack} onChange={setPack} />
          <Textarea label="متن کارت تبریک" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="تولدت مبارک! 🌟" />
          <Button size="lg" full loading={busy} disabled={mobile.length !== 11} onClick={async () => {
            setBusy(true);
            const g = await promoApi.sendGift({ recipient_mobile: mobile, gold_mg: mg, packaging: pack, message });
            gifts.retry();
            setBusy(false);
            toast(`هدیه به ${mobile} ارسال شد`);
            setMobile(""); setMessage("");
          }}>ارسال هدیه</Button>
        </Card>
        <div className="lg:col-span-2">
          <h2 className="text-[14.5px] font-black mb-3">هدیه‌های ارسالی</h2>
          {gifts.loading ? <div className="space-y-2.5">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            : (gifts.data ?? []).length === 0 ? <Card pad={false}><EmptyState icon={<Gift size={24} />} title="هنوز هدیه‌ای نفرستاده‌اید" body="اولین هدیه طلای شما اینجا ثبت می‌شود." /></Card>
            : (gifts.data ?? []).map((g) => (
              <Card key={String(g.id)} className="mb-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-black tnum">{formatMg(g.gold_mg)}</p>
                  <Badge status={g.status === "redeemed" ? "success" : g.status === "sent" ? "info" : "neutral"}>
                    {g.status === "redeemed" ? "دریافت شد" : g.status === "sent" ? "ارسال شد" : "ساخته شد"}
                  </Badge>
                </div>
                <p className="text-[12px] text-charcoal-500 tnum mt-1" dir="ltr">{g.recipient_mobile}</p>
                <div className="flex items-center gap-2 mt-3">
                  <code className="flex-1 bg-cream-100 rounded-lg px-3 py-2 text-[12.5px] font-black tracking-wider" dir="ltr">{g.code}</code>
                  <Button size="sm" variant="secondary" icon={<Copy size={13} />} onClick={async () => { await copyText(g.code); toast("کد هدیه کپی شد"); }}>کپی</Button>
                </div>
                {g.message && <p className="text-[11.5px] text-charcoal-500 mt-2.5 italic">«{g.message}»</p>}
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ================================ ReferralsPage ================================ */
export function ReferralsPage() {
  const refs = usePageData(() => promoApi.referrals());
  const toast = useToast();
  const code = refs.data?.code ?? "ZARV-XXXX";
  return (
    <div>
      <PageHead title="معرفی دوستان" subtitle="هر معرفی موفق = ۱٬۲۰۰ میلی‌گرم طلا برای شما و دوستتان" />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 text-center bg-charcoal-900 border-charcoal-800">
          <Users size={24} className="mx-auto text-gold-500" />
          <p className="text-[13px] text-cream-0/60 mt-3">کد معرف شما</p>
          <p className="text-[26px] font-black text-gold-500 tracking-[0.15em] mt-1.5" dir="ltr">{code}</p>
          <div className="flex gap-2 justify-center mt-5">
            <Button size="sm" icon={<Copy size={14} />} onClick={async () => { await copyText(code); toast("کد معرف کپی شد"); }}>کپی</Button>
            <Button size="sm" variant="ghost" className="text-cream-0/80 border border-cream-0/20 hover:bg-cream-0/10 hover:text-cream-0" icon={<Share2 size={14} />}
              onClick={async () => { await copyText(`با کد ${code} در زرون گلد ثبت‌نام کن و ۱٫۲ گرم طلا جایزه بگیر: zarvan.gold`); toast("متن دعوت کپی شد"); }}>اشتراک</Button>
          </div>
        </Card>
        <div className="lg:col-span-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <StatCard label="دعوت‌شده‌ها" value={refs.data ? fa(refs.data.invited_count) : <Skeleton className="h-6 w-10" />} icon={<Users size={17} />} />
            <StatCard label="طلای کسب‌شده" value={refs.data ? formatMg(refs.data.gold_earned_mg) : <Skeleton className="h-6 w-24" />} icon={<Landmark size={17} />} />
          </div>
          <Card pad={false}>
            <h3 className="text-[13.5px] font-black px-5 pt-4 pb-2">معرفی‌های شما</h3>
            {refs.loading ? <div className="p-5 space-y-2.5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
              : (refs.data?.referees.length ?? 0) === 0 ? <EmptyState title="هنوز کسی را معرفی نکرده‌اید" />
              : (
                <ul className="divide-y divide-inkline/60">
                  {refs.data?.referees.map((r, i) => (
                    <li key={i} className="flex items-center justify-between px-5 py-3 text-[13px]">
                      <span className="tnum font-medium" dir="ltr">{r.mobile_masked}</span>
                      <span className="flex items-center gap-2.5 text-charcoal-500 text-[11.5px]">
                        <span className="tnum">{jalaliDate(r.joined_at)}</span>
                        <Badge status="paid">+۱٬۲۰۰ mg</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================================ TicketsPage ================================ */
export function TicketsPage() {
  const tickets = usePageData(() => supportApi.myTickets());
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<Ticket["type"]>("general");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const TYPE_FA: Record<string, string> = { general: "عمومی", price_match: "تطبیق قیمت", delivery: "ارسال و تحویل", kyc: "احراز هویت" };

  return (
    <div>
      <PageHead title="پشتیبانی" subtitle="تیکت‌ها و درخواست‌های شما" actions={<Button icon={<Plus size={15} />} onClick={() => setOpen(true)}>تیکت جدید</Button>} />
      {tickets.error ? <Card pad={false}><ErrorState message={tickets.error} onRetry={tickets.retry} /></Card>
        : tickets.loading ? <div className="space-y-2.5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        : (tickets.data ?? []).length === 0 ? <Card pad={false}><EmptyState icon={<LifeBuoy size={24} />} title="تیکتی ندارید" body="سؤال یا مشکلی دارید؟ تیم پشتیبانی زرون اینجاست." action={<Button onClick={() => setOpen(true)}>ثبت تیکت</Button>} /></Card>
        : (
          <div className="space-y-2.5">
            {tickets.data?.map((t) => (
              <button key={String(t.id)} onClick={() => navigate(`/app/tickets/${t.id}`)}
                className="w-full text-start bg-cream-0 border border-inkline rounded-card px-4 py-3.5 flex flex-wrap items-center gap-3 hover:border-gold-400 transition-colors">
                <span className="text-[12px] font-black text-gold-700 tnum" dir="ltr">#{t.id}</span>
                <span className="flex-1 min-w-40 text-[13.5px] font-bold truncate">{t.subject}</span>
                <Badge status="neutral">{TYPE_FA[t.type]}</Badge>
                <Badge status={t.status === "closed" ? "neutral" : t.status === "pending" ? "pending" : "info"}>
                  {t.status === "closed" ? "بسته" : t.status === "pending" ? "پاسخ پشتیبانی" : "باز"}
                </Badge>
                <span className="text-[11px] text-charcoal-500">{timeAgo(t.updated_at)}</span>
              </button>
            ))}
          </div>
        )}

      <ModalWrap open={open} onClose={() => setOpen(false)} title="تیکت جدید" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
          <Button loading={busy} disabled={subject.length < 3 || body.length < 10} onClick={async () => {
            setBusy(true);
            const t = await supportApi.createTicket(subject, type, body);
            setBusy(false); setOpen(false);
            tickets.retry();
            toast("تیکت ثبت شد");
            navigate(`/app/tickets/${t.id}`);
          }}>ثبت تیکت</Button>
        </>}>
        <div className="space-y-4">
          <Input label="موضوع" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً: پیگیری مرسوله" />
          <Select label="نوع درخواست" value={type} onChange={(e) => setType(e.target.value as Ticket["type"])}
            options={[{ value: "general", label: "عمومی" }, { value: "price_match", label: "تطبیق قیمت" }, { value: "delivery", label: "ارسال و تحویل" }, { value: "kyc", label: "احراز هویت" }]} />
          <Textarea label="شرح درخواست" value={body} onChange={(e) => setBody(e.target.value)} placeholder="هرچه دقیق‌تر بنویسید، سریع‌تر پاسخ می‌گیرید." />
        </div>
      </ModalWrap>
    </div>
  );
}

/* ================================ TicketDetailPage ================================ */
export function TicketDetailPage() {
  const { id } = useParams();
  const msgs = usePageData(() => supportApi.messages(Number(id)), [id]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div className="max-w-3xl">
      <PageHead back title={`تیکت #${fa(id ?? "")}`} subtitle="پاسخ‌ها معمولاً در کمتر از ۲ ساعت ثبت می‌شود"
        actions={<Button variant="secondary" onClick={async () => { await supportApi.close(Number(id)); toast("تیکت بسته شد", "info"); }}>بستن تیکت</Button>} />
      {msgs.loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        : msgs.error ? <Card pad={false}><ErrorState message={msgs.error} onRetry={msgs.retry} /></Card>
        : (
          <div className="space-y-3">
            {(msgs.data ?? []).map((m) => (
              <div key={String(m.id)} className={cn("flex", m.is_staff ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[85%] rounded-card px-4 py-3 border", m.is_staff ? "bg-charcoal-900 text-cream-0 border-charcoal-800 rounded-ss-sm" : "bg-cream-0 border-inkline rounded-se-sm")}>
                  <p className="text-[10.5px] font-bold mb-1.5 opacity-60">{m.is_staff ? "پشتیبانی زرون" : "شما"} · {jalaliDate(m.created_at)}</p>
                  <p className="text-[13px] leading-7">{m.body}</p>
                </div>
              </div>
            ))}
            <Card className="flex gap-2.5 items-end">
              <Textarea label="پاسخ شما" value={reply} onChange={(e) => setReply(e.target.value)} className="flex-1 min-h-16" />
              <Button loading={busy} disabled={reply.trim().length < 2} icon={<Send size={15} />} onClick={async () => {
                setBusy(true);
                await supportApi.reply(Number(id), reply, false);
                msgs.retry();
                setReply("");
                setBusy(false);
                toast("پاسخ شما ثبت شد");
              }}>ارسال</Button>
            </Card>
          </div>
        )}
    </div>
  );
}

/* ================================ NotificationsPage ================================ */
export function NotificationsPage() {
  const notifs = usePageData(() => notifyApi.list());
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const toast = useToast();
  const list = useMemo(() => (notifs.data ?? []).filter((n) => filter === "all" || !n.read_at), [notifs.data, filter]);

  const TYPE_FA: Record<string, string> = { trade: "معامله", price: "قیمت", order: "سفارش", promo: "جشنواره", system: "سیستم" };

  return (
    <div>
      <PageHead title="اعلان‌ها" subtitle="رویدادهای حساب، قیمت و سفارش‌ها"
        actions={<Button variant="secondary" icon={<Check size={15} />} onClick={async () => { await notifyApi.markAll(); notifs.retry(); toast("همه اعلان‌ها خوانده شد", "info"); }}>خواندن همه</Button>} />
      <div className="flex gap-1.5 mb-4">
        {[["all", "همه"], ["unread", "خوانده‌نشده"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as "all" | "unread")}
            className={cn("px-3.5 h-9 rounded-full border text-[12.5px] font-medium transition-all", filter === k ? "bg-charcoal-900 text-cream-0 border-charcoal-900" : "border-inkline bg-cream-0 text-charcoal-700")}>{l}</button>
        ))}
      </div>
      {notifs.loading ? <div className="space-y-2.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        : list.length === 0 ? <Card pad={false}><EmptyState icon={<BellRing size={24} />} title={filter === "unread" ? "اعلان خوانده‌نشده‌ای ندارید" : "اعلانی ندارید"} /></Card>
        : (
          <div className="space-y-2.5">
            {list.map((n) => (
              <div key={String(n.id)} className={cn("bg-cream-0 border border-inkline rounded-card px-4 py-3.5 flex gap-3.5", !n.read_at && "border-s-4 border-s-gold-500")}>
                <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", n.read_at ? "bg-inkline" : "bg-gold-500")} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-bold">{n.title}</p>
                    <Badge status="neutral">{TYPE_FA[n.type] ?? n.type}</Badge>
                  </div>
                  <p className="text-[12.5px] text-charcoal-500 leading-6 mt-1">{n.body}</p>
                  <p className="text-[10.5px] text-charcoal-500/70 mt-1.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && (
                  <button className="self-center text-[11.5px] font-bold text-gold-700 hover:text-gold-600 shrink-0"
                    onClick={async () => { await notifyApi.markRead(Number(n.id)); notifs.retry(); }}>خواندم</button>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ================================ KycPage ================================ */
export function KycPage() {
  const { user } = useApp();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const status = user?.kyc_status ?? "unverified";

  const steps = [
    { title: "اطلاعات هویتی", done: true },
    { title: "تصویر کارت ملی", done: files.some((f) => f.includes("cart") || files.length > 0) },
    { title: "سلفی احراز", done: files.length > 1 },
  ];

  return (
    <div className="max-w-3xl">
      <PageHead title="احراز هویت" subtitle="برای تحویل فیزیکی و معاملات بالای ۵۰ میلیون ریال لازم است"
        actions={<Badge status={KYC_STATUS_FA[status].status}>{KYC_STATUS_FA[status].label}</Badge>} />

      {status === "approved" && <div className="mb-5"><Alert kind="success" title="حساب شما تأیید شده است">همه خدمات زرون، از جمله تحویل فیزیکی، برای شما فعال است.</Alert></div>}
      {status === "pending" && <div className="mb-5"><Alert kind="warning" title="در حال بررسی">مدارک شما دریافت شد؛ نتیجه معمولاً تا ۲ ساعت کاری اعلام می‌شود.</Alert></div>}
      {status === "rejected" && <div className="mb-5"><Alert kind="danger" title="مدارک رد شد">تصویر کارت ملی ناخوانا بود. لطفاً مدارک را دوباره ارسال کنید.</Alert></div>}

      <div className="grid md:grid-cols-5 gap-5">
        <Card className="md:col-span-2 h-fit">
          <h3 className="text-[13.5px] font-black mb-4">مراحل احراز</h3>
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-center gap-3">
                <span className={cn("h-8 w-8 rounded-full grid place-items-center text-[12px] font-black border-2 shrink-0 transition-all",
                  s.done ? "bg-gold-500 border-gold-500 text-charcoal-900" : "border-inkline text-charcoal-500")}>
                  {s.done ? <Check size={14} /> : fa(i + 1)}
                </span>
                <div>
                  <p className={cn("text-[13px] font-bold", s.done ? "text-charcoal-900" : "text-charcoal-500")}>{s.title}</p>
                  <p className="text-[10.5px] text-charcoal-500">{s.done ? "انجام شد" : "در انتظار"}</p>
                </div>
              </li>
            ))}
          </ol>
          {status === "approved" && (
            <div className="mt-5 pt-4 border-t border-inkline">
              <h4 className="text-[12px] font-bold text-charcoal-500 mb-2.5">تاریخچه</h4>
              <Timeline items={[
                { at: jalaliDate("2025-12-02T10:12:00Z"), label: "ثبت‌نام با موبایل" },
                { at: jalaliDate("2025-12-02T11:40:00Z"), label: "ارسال مدارک" },
                { at: jalaliDate("2025-12-02T13:05:00Z"), label: "تأیید توسط کارشناس" },
              ]} />
            </div>
          )}
        </Card>
        <Card className="md:col-span-3 space-y-4">
          <h3 className="text-[14.5px] font-black">ارسال مدارک</h3>
          <div>
            <p className="text-[12.5px] font-medium text-charcoal-700 mb-2">۱) تصویر کارت ملی (رو و پشت)</p>
            <FileDropzone label="بارگذاری تصویر کارت" files={files.filter((_, i) => i === 0)} onFiles={(f) => setFiles([f[0] ?? "", files[1] ?? ""])} />
          </div>
          <div>
            <p className="text-[12.5px] font-medium text-charcoal-700 mb-2">۲) سلفی با کارت ملی</p>
            <FileDropzone label="بارگذاری سلفی احراز" files={files.filter((_, i) => i === 1)} onFiles={(f) => setFiles([files[0] ?? "", f[0] ?? ""])} />
          </div>
          <Button full size="lg" loading={busy} disabled={files.filter(Boolean).length < 2 || status === "pending" || status === "approved"}
            onClick={async () => {
              setBusy(true);
              await profileApi.kycSubmit();
              setBusy(false);
              toast("مدارک ارسال شد — در انتظار بررسی");
              window.location.reload();
            }}>ارسال مدارک</Button>
          <p className="text-[11px] text-charcoal-500 leading-5">مدارک فقط برای تطبیق هویت استفاده و نزد کارشناسان محرمانه می‌ماند.</p>
        </Card>
      </div>
    </div>
  );
}

/* ================================ ProfilePage ================================ */
export function ProfilePage() {
  const { user, wallets } = useApp();
  const addresses = usePageData(() => profileApi.addresses());
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<undefined | { id: number | string; title: string; province: string; city: string; line1: string; postal_code: string; is_default: boolean }>(undefined);
  const [prefs, setPrefs] = useState({ sms: true, email: false, in_app: true, price_alerts: true });
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  return (
    <div>
      <PageHead title="پروفایل" subtitle="اطلاعات حساب، آدرس‌ها و تنظیمات اعلان" />
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Card>
            <h2 className="text-[14.5px] font-black mb-4">اطلاعات حساب</h2>
            <div className="space-y-4">
              <Input label="نام و نام خانوادگی" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="ایمیل (اختیاری)" dir="ltr" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <Field label="شماره موبایل" hint="تغییر شماره فقط با تماس پشتیبانی ممکن است">
                <div className="h-11 rounded-[8px] border border-inkline bg-cream-100/70 px-3.5 flex items-center text-[13.5px] text-charcoal-500 tnum" dir="ltr">{user?.mobile}</div>
              </Field>
              <div className="flex items-center justify-between">
                <Badge status={KYC_STATUS_FA[user?.kyc_status ?? "unverified"].status}>{KYC_STATUS_FA[user?.kyc_status ?? "unverified"].label}</Badge>
                <Button loading={saving} onClick={async () => { setSaving(true); await profileApi.saveProfile({ name, email }); setSaving(false); toast("پروفایل ذخیره شد"); }}>ذخیره تغییرات</Button>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="text-[14.5px] font-black mb-4">تنظیمات اعلان</h2>
            <div className="space-y-3.5">
              <Switch label="پیامک معاملات و سفارش‌ها" checked={prefs.sms} onChange={(v) => setPrefs({ ...prefs, sms: v })} />
              <Switch label="ایمیل فاکتورها" checked={prefs.email} onChange={(v) => setPrefs({ ...prefs, email: v })} />
              <Switch label="اعلان داخل برنامه" checked={prefs.in_app} onChange={(v) => setPrefs({ ...prefs, in_app: v })} />
              <Switch label="هشدارهای قیمت" checked={prefs.price_alerts} onChange={(v) => setPrefs({ ...prefs, price_alerts: v })} />
            </div>
          </Card>
        </div>
        <Card className="h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14.5px] font-black">آدرس‌ها</h2>
            <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => { setEdit(undefined); setModal(true); }}>آدرس جدید</Button>
          </div>
          {addresses.loading ? <div className="space-y-2.5">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            : (addresses.data ?? []).length === 0 ? <EmptyState title="آدرسی ندارید" body="برای تحویل فیزیکی، آدرس خود را ثبت کنید." />
            : (
              <ul className="space-y-2.5">
                {addresses.data?.map((a) => (
                  <li key={String(a.id)} className="border border-inkline rounded-card p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold flex items-center gap-2">{a.title}{a.is_default && <Badge status="gold">پیش‌فرض</Badge>}</p>
                      <div className="flex gap-1">
                        <button aria-label="ویرایش" className="p-2 rounded-md text-charcoal-500 hover:text-gold-700 hover:bg-gold-50 transition-colors" onClick={() => { setEdit(a); setModal(true); }}><Pencil size={14} /></button>
                        <button aria-label="حذف" className="p-2 rounded-md text-charcoal-500 hover:text-danger hover:bg-danger/10 transition-colors" onClick={async () => { await profileApi.deleteAddress(a.id); addresses.retry(); toast("آدرس حذف شد", "info"); }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <p className="text-[12px] text-charcoal-500 leading-6 mt-1">{a.province}، {a.city}، {a.line1}</p>
                    <p className="text-[11px] text-charcoal-500/70 tnum mt-0.5" dir="ltr">{a.postal_code}</p>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>
      <AddressModalWrapper open={modal} onClose={() => setModal(false)} initial={edit} onSaved={() => { addresses.retry(); setModal(false); toast("آدرس ذخیره شد"); }} />
    </div>
  );
}

import { AddressModal as AddressModalWrapper } from "./customer-shop";

/* ================================ Dealer pages ================================ */
export function DealerDashboardPage() {
  const stats = usePageData(() => dealerApi.stats());
  const navigate = useNavigate();
  const s = stats.data;
  return (
    <div>
      <PageHead title="داشبورد عمده‌فروشی" subtitle="اسپرد نمایندگی، حجم و سفارش‌های عمده"
        actions={<Button icon={<Plus size={15} />} onClick={() => navigate("/app/dealer/bulk")}>سفارش عمده</Button>} />
      <div className="grid sm:grid-cols-3 gap-4 stagger">
        <StatCard label="اسپرد نمایندگی" value={s ? `${fa(s.spread_bps)} bps` : <Skeleton className="h-6 w-16" />} tone="gold" icon={<Factory size={17} />} />
        <StatCard label="حجم ۳۰ روز" value={s ? formatMg(s.volume_30d_mg) : <Skeleton className="h-6 w-24" />} icon={<Landmark size={17} />} />
        <StatCard label="سفارش‌های ماه" value={s ? fa(s.orders_count) : <Skeleton className="h-6 w-10" />} icon={<Boxes size={17} />} />
      </div>
      <div className="mt-5">
        <h2 className="text-[15px] font-black mb-3">سفارش‌های عمده</h2>
        {stats.error ? <Card pad={false}><ErrorState message={stats.error} onRetry={stats.retry} /></Card>
          : stats.loading ? <div className="space-y-2.5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          : (
            <DataTable<{ id: number; number: string; qty_mg: number; total_irr: number; status: string; date: string }>
              columns={[
                { key: "number", header: "شماره", render: (r) => <b className="text-[12px]" dir="ltr">{r.number}</b> },
                { key: "date", header: "تاریخ", render: (r) => <span className="tnum">{jalaliDate(r.date)}</span> },
                { key: "qty_mg", header: "وزن", align: "end", render: (r) => <span className="tnum font-bold">{formatMg(r.qty_mg)}</span> },
                { key: "total_irr", header: "مبلغ", align: "end", render: (r) => <b className="tnum">{formatIrr(r.total_irr)}</b> },
                { key: "status", header: "وضعیت", render: (r) => <Badge status={r.status === "delivered" ? "success" : "info"}>{r.status === "delivered" ? "تحویل‌شده" : "در حال پردازش"}</Badge> },
              ]}
              rows={s?.orders ?? []} loading={stats.loading}
            />
          )}
      </div>
    </div>
  );
}

export function DealerBulkPage() {
  const [bars, setBars] = useState([{ weight: 50, qty: 4 }, { weight: 100, qty: 2 }]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const totalMg = bars.reduce((s, b) => s + b.weight * 1000 * b.qty, 0);
  const total = Math.round(totalMg / 1000 * 4_690_000 * (1 - 0.0025));

  return (
    <div className="max-w-3xl">
      <PageHead back title="سفارش عمده" subtitle="شمش ۲۴ عیار با اسپرد نمایندگی (۲۵ واحد) — حداقل ۲۵۰ گرم" />
      <Card>
        <div className="space-y-3">
          {bars.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
              <Select label={i === 0 ? "قالب شمش" : undefined} value={b.weight} onChange={(e) => { const nb = [...bars]; nb[i].weight = Number(e.target.value); setBars(nb); }}
                options={[{ value: 50, label: "شمش ۵۰ گرمی" }, { value: 100, label: "شمش ۱۰۰ گرمی" }]} />
              <div className="pt-5">
                <div className="inline-flex items-center border border-inkline rounded-[8px] overflow-hidden">
                  <button className="h-10 w-10 hover:bg-gold-50 transition-colors font-bold" onClick={() => { const nb = [...bars]; nb[i].qty = Math.min(50, nb[i].qty + 1); setBars(nb); }} aria-label="افزایش">+</button>
                  <span className="w-10 text-center font-black tnum">{fa(b.qty)}</span>
                  <button className="h-10 w-10 hover:bg-gold-50 transition-colors font-bold disabled:opacity-30" disabled={b.qty <= 1} onClick={() => { const nb = [...bars]; nb[i].qty -= 1; setBars(nb); }} aria-label="کاهش">−</button>
                </div>
              </div>
              <p className="pt-5 w-28 text-end tnum font-bold text-[13px]">{formatMg(b.weight * 1000 * b.qty)}</p>
              <button aria-label="حذف قالب" className="pt-5 p-2 text-charcoal-500 hover:text-danger" onClick={() => setBars(bars.filter((_, j) => j !== i))}><X size={15} /></button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" icon={<Plus size={14} />} className="mt-3" onClick={() => setBars([...bars, { weight: 50, qty: 1 }])}>افزودن قالب</Button>
        <div className="mt-5 bg-charcoal-900 rounded-card p-5 text-cream-0 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] text-cream-0/50">جمع سفارش</p>
            <p className="text-[20px] font-black tnum text-gold-500 mt-1">{formatMg(totalMg)} — {formatIrr(total)} ریال</p>
          </div>
          <Button size="lg" loading={busy} disabled={totalMg < 250_000} onClick={async () => {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 1000));
            setBusy(false);
            toast("سفارش عمده ثبت شد — کارشناس تماس می‌گیرد");
          }}>ثبت سفارش عمده</Button>
        </div>
        {totalMg < 250_000 && <p className="text-[12px] text-warning mt-3">حداقل وزن سفارش عمده ۲۵۰ گرم است.</p>}
      </Card>
      <Alert kind="info" title="زمان‌بندی تحویل"><span className="leading-6">تحویل سفارش‌های عمده با خودروی امن و اسکورت، ۳ تا ۵ روز کاری پس از تسویه انجام می‌شود.</span></Alert>
    </div>
  );
}
