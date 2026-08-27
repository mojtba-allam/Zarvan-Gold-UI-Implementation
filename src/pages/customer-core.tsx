import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LedgerEntry, TradeQuote, Wallet } from "../types";
import { ApiError, IMG, investApi, pricingApi, profileApi, tradeApi, walletApi, orderApi } from "../api";
import { useApp } from "../auth";
import { cn, countdownLabel, fa, formatIrr, formatMg, formatPct, jalaliDate, timeHHMM, usePageData } from "../lib";
import { Badge, Button, Card, DataTable, MassInput, MoneyInput, Modal, PageHead, Radio, Skeleton, StatCard, Textarea, type Column } from "../components/ui";
import { Alert, Banner, EmptyState, ErrorState, StalePriceBanner, TradingHaltedBanner, useToast } from "../components/feedback";
import { DonutChartX, GoldAreaChart, GoldLineChart, Sparkline } from "../components/charts";
import { OtpStepUpModal, PriceQuoteBox, WalletCard } from "../components/commerce";
import { FileDropzone } from "../components/ui";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, CandlestickChart, CheckCircle2, FileText, Landmark,
  Plus, Repeat, ShoppingBag, TrendingDown, TrendingUp, Wallet as WalletIcon, XCircle, Zap, ImageIcon, Gift,
} from "../components/icons";

/* ================================ DashboardPage ================================ */
export function DashboardPage() {
  const { user, wallets, refreshWallets } = useApp();
  const summary = usePageData(() => investApi.summary());
  const ledger = usePageData(() => walletApi.ledger());
  const spot7 = usePageData(() => pricingApi.history("1W", 18));
  const port30 = usePageData(() => investApi.portfolio30d());
  const lastTrade = usePageData(() => tradeApi.history());
  const navigate = useNavigate();
  const toast = useToast();

  const irr = wallets.find((w) => w.currency === "irr");
  const gold = wallets.find((w) => w.currency === "gold_mg");

  return (
    <div className="space-y-6">
      <PageHead title={`سلام ${user?.name?.split(" ")[0] ?? ""} 👋`.replace(" 👋", "")} subtitle="خلاصه دارایی و آخرین رویدادهای حساب شما"
        actions={<>
          <Button variant="secondary" icon={<Plus size={15} />} onClick={() => navigate("/app/wallet")}>شارژ کیف پول</Button>
          <Button icon={<Zap size={15} />} onClick={() => navigate("/app/trade")}>معامله سریع</Button>
        </>} />

      {user?.kyc_status !== "approved" && (
        <Banner kind={user?.kyc_status === "rejected" ? "danger" : user?.kyc_status === "pending" ? "warning" : "info"}>
          {user?.kyc_status === "pending" ? "مدارک شما در حال بررسی است — معمولاً کمتر از ۲ ساعت." :
           user?.kyc_status === "rejected" ? "مدارک احراز هویت رد شده — دوباره ارسال کنید." :
           "برای تحویل فیزیکی و معاملات بالای ۵۰ میلیون ریال، احراز هویت لازم است."}
          <Link to="/app/kyc" className="underline underline-offset-4 font-bold ms-1">احراز هویت</Link>
        </Banner>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <StatCard label="موجودی ریال" value={irr ? formatIrr(irr.balance) : <Skeleton className="h-6 w-24" />} icon={<WalletIcon size={17} />} />
        <StatCard label="طلای ۱۸ عیار" value={gold ? <>{fa(gold.balance.toLocaleString("en-US"))} <span className="text-[12px] font-medium text-charcoal-500">mg</span></> : <Skeleton className="h-6 w-24" />} icon={<Landmark size={17} />} delta={summary.data?.pnl_pct} />
        <StatCard label="سود و زیان" value={summary.data ? formatIrr(summary.data.pnl_irr) : <Skeleton className="h-6 w-24" />} delta={summary.data?.pnl_pct} icon={summary.data && summary.data.pnl_irr >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />} />
        <StatCard label="آخرین معامله" value={lastTrade.data?.[0] ? formatIrr(lastTrade.data[0].irr_amount) : "—"} icon={<Repeat size={17} />}
          spark={spot7.data ? <Sparkline data={spot7.data.slice(-14).map((p) => p.price_irr)} /> : undefined} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <GoldAreaChart title="طلای ۱۸ عیار — ۷ روز اخیر" data={(spot7.data ?? []).map((p) => ({ t: p.t, value: p.price_irr }))} loading={spot7.loading} error={spot7.error} onRetry={spot7.retry} unit="irr" height={250} />
          <GoldLineChart title="ارزش سبد — ۳۰ روز" data={(port30.data ?? []).map((p) => ({ t: p.t, value: p.value }))} loading={port30.loading} error={port30.error} onRetry={port30.retry} unit="irr" height={230} />
        </div>
        <div className="space-y-5">
          <DonutChartX title="ترکیب دارایی" centerValue={gold ? fa(gold.balance.toLocaleString("en-US")) : "—"} centerLabel="mg در خزانه"
            data={[
              { label: "طلای خزانه", value: gold?.balance ?? 0 },
              { label: "قابل تحویل فیزیکی", value: Math.round((gold?.balance ?? 0) * 0.4) },
            ]} loading={!gold && wallets.length === 0 && !irr} height={220} />
          <Card>
            <h3 className="text-[14px] font-bold mb-3">دسترسی سریع</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: "/app/trade", label: "خرید و فروش", icon: <CandlestickChart size={16} /> },
                { to: "/catalog", label: "فروشگاه", icon: <ShoppingBag size={16} /> },
                { to: "/app/gifts", label: "هدیه طلا", icon: <Gift size={16} /> },
                { to: "/app/delivery", label: "تحویل فیزیکی", icon: <ArrowUpRight size={16} /> },
              ].map((s) => (
                <Link key={s.to} to={s.to} className="flex items-center gap-2 border border-inkline rounded-[8px] px-3 py-2.5 text-[12.5px] font-medium hover:border-gold-500 hover:bg-gold-50 transition-all">
                  <span className="text-gold-600">{s.icon}</span>{s.label}
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold">آخرین تراکنش‌ها</h3>
              <Link to="/app/wallet" className="text-[12px] font-bold text-gold-700 hover:text-gold-600 inline-flex items-center gap-1">همه<ArrowLeft size={11} /></Link>
            </div>
            {ledger.loading ? <div className="space-y-2.5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
              : ledger.error ? <ErrorState message={ledger.error} onRetry={ledger.retry} />
              : (ledger.data ?? []).length === 0 ? <EmptyState title="تراکنشی ندارید" body="با شارژ کیف پول شروع کنید." action={<Button size="sm" onClick={() => navigate("/app/wallet")}>شارژ کیف پول</Button>} />
              : (
                <ul className="divide-y divide-inkline/60">
                  {(ledger.data ?? []).slice(0, 5).map((l) => <LedgerRow key={String(l.id)} entry={l} />)}
                </ul>
              )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const credit = entry.direction === "credit";
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cn("h-9 w-9 rounded-full grid place-items-center shrink-0", credit ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
        {credit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium truncate">{entry.reason}</p>
        <p className="text-[10.5px] text-charcoal-500 tnum">{jalaliDate(entry.created_at)} — {timeHHMM(entry.created_at)}</p>
      </div>
      <div className="text-end">
        <p className={cn("text-[13px] font-black tnum", credit ? "text-success" : "text-danger")}>{credit ? "+" : "−"}{formatIrr(entry.amount)}</p>
        <p className="text-[10.5px] text-charcoal-500 tnum">مانده {formatIrr(entry.balance_after)}</p>
      </div>
    </li>
  );
}

/* ================================ TradePage ================================ */
export function TradePage() {
  const { wallets, refreshWallets } = useApp();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [weight, setWeight] = useState(1000);
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; mg: number; side: "buy" | "sell"; invoice: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spot = usePageData(() => pricingApi.spot());
  const h1d = usePageData(() => pricingApi.history("1D", 18));
  const toast = useToast();
  const halted = spot.data?.[0]?.trading_halt ?? false;
  const stale = (spot.data?.[0]?.stale_seconds ?? 0) > 30;

  const irr = wallets.find((w) => w.currency === "irr");
  const gold = wallets.find((w) => w.currency === "gold_mg");

  const getQuote = async () => {
    setQuoting(true); setError(null); setQuote(null);
    try { setQuote(await tradeApi.getQuote(side, weight)); }
    catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت قیمت"); }
    finally { setQuoting(false); }
  };

  const confirm = async (otp?: string) => {
    if (!quote) return;
    setConfirming(true);
    try {
      const t = await tradeApi.confirm(quote, otp);
      await refreshWallets();
      toast("معامله انجام شد");
      setSuccess({ amount: t.irr_amount, mg: t.weight_mg, side: t.side, invoice: `ZRV-2026-${String(Math.floor(Math.random() * 90000) + 10000)}` });
      setQuote(null);
    } catch (e) {
      if (e instanceof ApiError && e.code === 409) { setQuote(null); setExpiredOpen(true); }
      else if (e instanceof ApiError && e.code === 403) { setOtpOpen(true); }
      else { setError(e instanceof Error ? e.message : "معامله ناموفق بود"); setQuote(null); }
    } finally { setConfirming(false); }
  };

  return (
    <div>
      <PageHead title="معامله سریع" subtitle="خرید و فروش طلای ۱۸ عیار با قیمت قفل‌شده ۱۸ ثانیه‌ای" />

      {halted && <div className="mb-4"><TradingHaltedBanner /></div>}
      {!halted && stale && <div className="mb-4"><StalePriceBanner seconds={spot.data?.[0]?.stale_seconds ?? 0} /></div>}
      {error && <div className="mb-4"><Banner kind="danger">{error}</Banner></div>}

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <Card>
            <div className="grid grid-cols-2 rounded-card border border-inkline p-1 gap-1 mb-5">
              <button onClick={() => { setSide("buy"); setQuote(null); }}
                className={cn("h-12 rounded-[9px] text-[14.5px] font-black transition-all flex items-center justify-center gap-2",
                  side === "buy" ? "bg-success text-cream-0 shadow" : "text-charcoal-500 hover:text-success")}>
                <TrendingUp size={17} /> خرید طلا
              </button>
              <button onClick={() => { setSide("sell"); setQuote(null); }}
                className={cn("h-12 rounded-[9px] text-[14.5px] font-black transition-all flex items-center justify-center gap-2",
                  side === "sell" ? "bg-danger text-cream-0 shadow" : "text-charcoal-500 hover:text-danger")}>
                <TrendingDown size={17} /> فروش طلا
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <MassInput label={side === "buy" ? "وزن خرید" : "وزن فروش"} valueMg={weight} onChange={(v) => { setWeight(v); setQuote(null); }} hint="حداقل ۱۰۰ میلی‌گرم" />
              <div className="flex flex-col justify-end">
                <p className="text-[12px] text-charcoal-500 mb-1.5">تخمین با نرخ فعلی</p>
                <p className="text-[19px] font-black tnum text-charcoal-900">{formatIrr(Math.round((weight / 1000) * (spot.data?.[0]?.price_irr_per_gram ?? 3_520_000)))} <span className="text-[11px] font-medium text-charcoal-500">ریال</span></p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-5">
              {[100, 500, 1000, 5000].map((mg) => (
                <button key={mg} onClick={() => { setWeight(mg); setQuote(null); }}
                  className={cn("px-3 h-9 rounded-full border text-[12px] font-bold tnum transition-all", weight === mg ? "bg-gold-500 border-gold-500 text-charcoal-900" : "border-inkline bg-cream-0 text-charcoal-700 hover:border-gold-400")}>
                  {formatMg(mg)}
                </button>
              ))}
            </div>

            <div className="flex gap-2.5 mt-5">
              {!quote ? (
                <Button full size="lg" loading={quoting} disabled={halted || weight < 100} icon={<Zap size={16} />} onClick={getQuote}>
                  {halted ? "معاملات متوقف است" : "دریافت قیمت لحظه‌ای"}
                </Button>
              ) : (
                <>
                  <Button full size="lg" variant={side === "buy" ? "primary" : "sell"} loading={confirming}
                    disabled={!irr || (side === "buy" ? irr.balance < quote.irr_amount : (gold?.balance ?? 0) < quote.weight_mg)}
                    onClick={() => confirm()}>
                    تأیید {side === "buy" ? "خرید" : "فروش"}
                  </Button>
                  <Button size="lg" variant="ghost" onClick={() => setQuote(null)}>لغو</Button>
                </>
              )}
            </div>
            {side === "buy" && irr && quote && irr.balance < quote.irr_amount && (
              <p className="text-[12px] text-warning mt-3">موجودی کافی نیست — <Link className="underline font-bold" to="/app/wallet">شارژ کیف پول</Link></p>
            )}
            {side === "sell" && gold && quote && gold.balance < quote.weight_mg && (
              <p className="text-[12px] text-warning mt-3">موجودی طلای شما کمتر از وزن فروش است.</p>
            )}
          </Card>

          <GoldAreaChart title="روند امروز — ۱۸ عیار" data={(h1d.data ?? []).map((p) => ({ t: p.t, value: p.price_irr }))} loading={h1d.loading} unit="irr" height={200} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          {quote ? <PriceQuoteBox quote={quote} onExpired={() => undefined} /> : (
            <Card className="text-center py-10">
              <Zap size={26} className="mx-auto text-gold-500" />
              <p className="text-[14px] font-bold mt-3">پیش‌فاکتور اینجا نمایش داده می‌شود</p>
              <p className="text-[12px] text-charcoal-500 leading-6 mt-1.5">وزن را انتخاب و «دریافت قیمت» را بزنید؛ قیمت تا <b className="tnum">{countdownLabel(18000)}</b> برای شما قفل می‌شود.</p>
            </Card>
          )}
          <Card>
            <h3 className="text-[13.5px] font-bold mb-3">موجودی شما</h3>
            <div className="space-y-2.5 text-[13px]">
              <div className="flex justify-between"><span className="text-charcoal-500">کیف پول ریال</span><b className="tnum">{formatIrr(irr?.balance)}</b></div>
              <div className="flex justify-between"><span className="text-charcoal-500">طلای ۱۸ عیار</span><b className="tnum">{gold ? `${fa(gold.balance.toLocaleString("en-US"))} mg` : "—"}</b></div>
              <div className="flex justify-between border-t border-inkline pt-2.5"><span className="text-charcoal-500">اسپرد خرید / فروش</span><b className="tnum">{fa(45)} / {fa(60)} bps</b></div>
            </div>
          </Card>
        </div>
      </div>

      <QuoteExpiredModal open={expiredOpen} onClose={() => setExpiredOpen(false)} onAgain={() => { setExpiredOpen(false); getQuote(); }} />
      <OtpStepUpModal open={otpOpen} onClose={() => setOtpOpen(false)} title="تأیید فروش طلا"
        onVerify={async (code) => { await confirm(code); setOtpOpen(false); }} />
      <Modal open={!!success} onClose={() => setSuccess(null)} title="معامله با موفقیت انجام شد" size="sm"
        footer={<Button full onClick={() => setSuccess(null)}>باشه، ممنون</Button>}>
        {success && (
          <div className="text-center">
            <span className="h-14 w-14 mx-auto rounded-full bg-success/10 border border-success/25 grid place-items-center text-success mb-4"><CheckCircle2 size={26} /></span>
            <p className="text-[15px] font-black">{success.side === "buy" ? "خرید ثبت شد" : "فروش ثبت شد"}</p>
            <p className="text-[13px] text-charcoal-700 leading-7 mt-2">
              {formatMg(success.mg)} طلای ۱۸ عیار {success.side === "buy" ? "به کیف پول شما اضافه شد" : "از کیف پول شما کسر شد"} و{" "}
              <b className="tnum">{formatIrr(success.amount)} ریال</b> {success.side === "buy" ? "پرداخت شد" : "به کیف پول ریال واریز شد"}.
            </p>
            <div className="mt-4 bg-cream-50 border border-inkline rounded-lg p-3 flex items-center justify-between">
              <span className="text-[12px] text-charcoal-500 flex items-center gap-1.5"><FileText size={13} /> فاکتور {success.invoice}</span>
              <Link to="/app/invoices" className="text-[12px] font-bold text-gold-700 hover:text-gold-600">مشاهده فاکتور</Link>
            </div>
            <p className="text-[11.5px] text-success font-bold mt-3">فاکتور آماده است</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function QuoteExpiredModal({ open, onClose, onAgain }: { open: boolean; onClose: () => void; onAgain: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="قیمت منقضی شد" size="sm"
      footer={<Button full icon={<Zap size={15} />} onClick={onAgain}>دریافت مجدد قیمت</Button>}>
      <div className="text-center">
        <span className="h-14 w-14 mx-auto rounded-full bg-warning/10 border border-warning/25 grid place-items-center text-warning mb-4"><XCircle size={26} /></span>
        <p className="text-[13.5px] text-charcoal-700 leading-7">مهلت ۱۸ ثانیه‌ای قیمت تمام شد تا شما با نرخ کهنه معامله نکنید. یک قیمت تازه دریافت کنید.</p>
      </div>
    </Modal>
  );
}

/* ================================ BuybackPage ================================ */
export function BuybackPage() {
  const [source, setSource] = useState<"wallet" | "physical">("wallet");
  const [weight, setWeight] = useState(2000);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <div className="max-w-3xl">
      <PageHead title="بازخرید طلا" subtitle="طلای فیزیکی خود را به نرخ لحظه‌ای به زرون بفروشید" />
      <div className="grid md:grid-cols-5 gap-5">
        <Card className="md:col-span-3 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("border-2 rounded-card p-3.5 cursor-pointer transition-all", source === "wallet" ? "border-gold-500 bg-gold-50/60" : "border-inkline")} onClick={() => setSource("wallet")}>
              <Radio checked={source === "wallet"} onChange={() => setSource("wallet")} label="از کیف پول طلا" desc="موجودی دیجیتال — تسویه آنی" />
            </div>
            <div className={cn("border-2 rounded-card p-3.5 cursor-pointer transition-all", source === "physical" ? "border-gold-500 bg-gold-50/60" : "border-inkline")} onClick={() => setSource("physical")}>
              <Radio checked={source === "physical"} onChange={() => setSource("physical")} label="طلای فیزیکی" desc="ارسال با پیک — ارزیابی در محل" />
            </div>
          </div>
          <MassInput label="وزن تقریبی" valueMg={weight} onChange={setWeight} hint="حداقل ۵۰۰ میلی‌گرم" />
          {source === "physical" && (
            <>
              <FileDropzone label="عکس قطعه طلا" files={files} onFiles={setFiles} hint="عکس واضح از هر دو طرف + پلاک عیار" />
              {files.length === 0 && <p className="text-[11.5px] text-charcoal-500 -mt-2">عکس به ارزیابی سریع‌تر کمک می‌کند.</p>}
            </>
          )}
          <Textarea label="توضیحات (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلاً: دستبند ۱۸ عیار با قفل شکسته" />
          <Button size="lg" full loading={busy} disabled={weight < 500} onClick={async () => {
            setBusy(true);
            try {
              await tradeApi.buyback({ source, weight_mg: weight, notes, photo_url: files[0] });
              toast("درخواست بازخرید ثبت شد — تا دقایقی دیگر تماس می‌گیریم");
              setWeight(2000); setNotes(""); setFiles([]);
            } catch (e) { toast(e instanceof Error ? e.message : "خطا در ثبت درخواست", "error"); }
            finally { setBusy(false); }
          }}>درخواست بازخرید</Button>
        </Card>
        <div className="md:col-span-2 space-y-4">
          <Card>
            <h3 className="text-[13.5px] font-bold mb-2.5">برآورد دریافتی</h3>
            <p className="text-[21px] font-black tnum text-success">{formatIrr(Math.round((weight / 1000) * 3_520_000 * (1 - 0.006)))} <span className="text-[11px] font-medium text-charcoal-500">ریال</span></p>
            <p className="text-[11.5px] text-charcoal-500 mt-1.5 leading-5">با کسر اسپرد خرید (۶۰ واحد). مبلغ نهایی پس از عیارسنجی اعلام می‌شود.</p>
          </Card>
          <Alert kind="info" title="عیارسنجی رایگان">اگر عیار قطعه با اعلامی متفاوت باشد، پیش از تسویه اطلاع‌رسانی می‌شود و حق انصراف دارید.</Alert>
        </div>
      </div>
    </div>
  );
}

/* ================================ WalletPage ================================ */
export function WalletPage() {
  const { wallets, refreshWallets } = useApp();
  const ledger = usePageData(() => walletApi.ledger());
  const bal90 = usePageData(() => walletApi.balance90d());
  const [dir, setDir] = useState<"all" | "credit" | "debit">("all");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [iban, setIban] = useState("IR82 0540 1026 8002 0817 9090 02");
  const [busy, setBusy] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  const filtered = useMemo(() => (ledger.data ?? []).filter((l) => dir === "all" || l.direction === dir), [ledger.data, dir]);
  const irr = wallets.find((w) => w.currency === "irr");

  const doWithdraw = async (otp?: string) => {
    setBusy(true); setError(undefined);
    try {
      await walletApi.withdraw(amount, iban, otp);
      await refreshWallets();
      ledger.retry();
      toast("برداشت ثبت شد — تا پایان روز کاری واریز می‌شود");
      setWithdrawOpen(false); setAmount(0);
    } catch (e) {
      if (e instanceof ApiError && e.code === 403) setOtpOpen(true);
      else setError(e instanceof Error ? e.message : "خطا در برداشت");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageHead title="کیف پول" subtitle="موجودی ریال و طلای شما"
        actions={<>
          <Button variant="sell" icon={<ArrowUpRight size={15} />} onClick={() => { setAmount(0); setWithdrawOpen(true); }}>برداشت</Button>
          <Button icon={<Plus size={15} />} onClick={() => { setAmount(0); setError(undefined); setDepositOpen(true); }}>شارژ (واریز)</Button>
        </>} />

      <div className="grid sm:grid-cols-2 gap-4">
        {wallets.length === 0 ? [0, 1].map((i) => <Skeleton key={i} className="h-36" />) : wallets.map((w) => <WalletCard key={String(w.id)} wallet={w} />)}
      </div>

      <GoldAreaChart title="موجودی ریال — ۹۰ روز اخیر" data={(bal90.data ?? []).map((p) => ({ t: p.t, value: p.value }))} loading={bal90.loading} error={bal90.error} onRetry={bal90.retry} unit="irr" height={230} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-black">گردش حساب</h2>
          <div className="inline-flex rounded-[8px] border border-inkline bg-cream-0 p-0.5 gap-0.5">
            {([["all", "همه"], ["credit", "واریز"], ["debit", "برداشت"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setDir(k)} className={cn("px-3 h-8 rounded-md text-[12px] font-bold transition-all", dir === k ? "bg-charcoal-900 text-cream-0" : "text-charcoal-500")}>{l}</button>
            ))}
          </div>
        </div>
        {ledger.loading ? <div className="bg-cream-0 border border-inkline rounded-card p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
          : ledger.error ? <Card pad={false}><ErrorState message={ledger.error} onRetry={ledger.retry} /></Card>
          : filtered.length === 0 ? <Card pad={false}><EmptyState icon={<WalletIcon size={24} />} title="تراکنشی ثبت نشده" body="اولین شارژ یا معامله شما اینجا نمایش داده می‌شود." action={<Button onClick={() => setDepositOpen(true)}>شارژ کیف پول</Button>} /></Card>
          : (
            <Card pad={false} className="divide-y divide-inkline/60">
              {filtered.map((l) => <div key={String(l.id)} className="px-4"><LedgerRow entry={l} /></div>)}
            </Card>
          )}
      </div>

      {/* deposit */}
      <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title="شارژ کیف پول ریال" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setDepositOpen(false)}>انصراف</Button>
          <Button loading={busy} disabled={amount < 100_000} onClick={async () => {
            setBusy(true);
            await walletApi.deposit(amount);
            await refreshWallets();
            ledger.retry();
            setBusy(false); setDepositOpen(false); setAmount(0);
            toast("کیف پول شارژ شد");
          }}>پرداخت از درگاه</Button>
        </>}>
        <MoneyInput label="مبلغ واریز" value={amount} onChange={setAmount} min={100_000} hint="حداقل ۱۰۰٬۰۰۰ ریال — تسویه آنی از شبکه شتاب" error={error} />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[5_000_000, 10_000_000, 50_000_000].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={cn("px-3 h-9 rounded-full border text-[12px] font-bold tnum transition-all", amount === v ? "bg-gold-500 border-gold-500 text-charcoal-900" : "border-inkline hover:border-gold-400")}>{formatIrr(v)}</button>
          ))}
        </div>
      </Modal>

      {/* withdraw */}
      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="برداشت وجه" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setWithdrawOpen(false)}>انصراف</Button>
          <Button loading={busy} disabled={amount < 100_000 || amount > (irr?.balance ?? 0)} onClick={() => doWithdraw()}>ثبت برداشت</Button>
        </>}>
        <div className="space-y-4">
          <MoneyInput label="مبلغ برداشت" value={amount} onChange={setAmount} min={100_000} max={irr?.balance ?? 0} error={error} />
          <MoneyInput label="شماره شبا" value={0} onChange={() => undefined} hint={<span dir="ltr" className="tnum">{iban}</span>} />
          <p className="text-[11.5px] text-charcoal-500 leading-5">برداشت فقط به شبای به نام خودتان انجام می‌شود و نیاز به کد تأیید دارد.</p>
        </div>
      </Modal>
      <OtpStepUpModal open={otpOpen} onClose={() => setOtpOpen(false)} title="تأیید برداشت وجه" onVerify={async (code) => { await doWithdraw(code); setOtpOpen(false); }} />
    </div>
  );
}

/* ================================ PortfolioPage ================================ */
export function PortfolioPage() {
  const summary = usePageData(() => investApi.summary());
  const lots = usePageData(() => investApi.lots());
  const pnl = usePageData(() => investApi.pnl90d());

  const s = summary.data;
  return (
    <div className="space-y-6">
      <PageHead title="سبد دارایی" subtitle="بهای تمام‌شده، ارزش روز و سود و زیان هر لات" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <StatCard label="بهای تمام‌شده" value={s ? formatIrr(s.cost_irr) : <Skeleton className="h-6 w-24" />} />
        <StatCard label="ارزش روز بازار" value={s ? formatIrr(s.market_irr) : <Skeleton className="h-6 w-24" />} />
        <StatCard label="سود و زیان" value={s ? formatIrr(s.pnl_irr) : <Skeleton className="h-6 w-24" />} delta={s?.pnl_pct} />
        <StatCard label="وزن کل" value={s ? <>{fa(s.gold_mg.toLocaleString("en-US"))} <span className="text-[12px] text-charcoal-500">mg</span></> : <Skeleton className="h-6 w-24" />} icon={<Landmark size={17} />} />
      </div>

      <GoldLineChart title="سود و زیان — ۹۰ روز اخیر" data={(pnl.data ?? []).map((p) => ({ t: p.t, value: p.value }))} loading={pnl.loading} error={pnl.error} onRetry={pnl.retry} unit="irr" height={250} />

      <div>
        <h2 className="text-[16px] font-black mb-3">لات‌های خرید</h2>
        {lots.error ? <Card pad={false}><ErrorState message={lots.error} onRetry={lots.retry} /></Card> : (
          <DataTable<{ id: number | string; acquired_at: string; weight_mg: number; cost_irr: number; market_irr: number }>
            columns={[
              { key: "acquired_at", header: "تاریخ خرید", render: (r) => <span className="tnum">{jalaliDate(r.acquired_at)}</span> },
              { key: "weight_mg", header: "وزن", align: "end", render: (r) => <span className="tnum font-bold">{formatMg(r.weight_mg)}</span> },
              { key: "cost_irr", header: "بهای تمام‌شده", align: "end", render: (r) => <span className="tnum">{formatIrr(r.cost_irr)}</span> },
              { key: "market_irr", header: "ارزش روز", align: "end", render: (r) => <b className="tnum">{formatIrr(r.market_irr)}</b> },
              { key: "pnl", header: "سود/زیان", align: "end", render: (r) => {
                const p = r.market_irr - r.cost_irr;
                return <span className={cn("tnum font-bold", p >= 0 ? "text-success" : "text-danger")}>{p >= 0 ? "+" : ""}{formatIrr(p)}</span>;
              } },
            ]}
            rows={lots.data ?? []} loading={lots.loading}
            empty={<EmptyState title="لاتی ندارید" body="اولین خرید طلای شما اینجا ثبت می‌شود." action={<Link to="/app/trade"><Button size="sm">شروع معامله</Button></Link>} /> as never}
          />
        )}
      </div>
    </div>
  );
}
