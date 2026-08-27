import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, IMG } from "../api";
import { useApp } from "../auth";
import { Button, MobileInput, OtpInput, Input } from "../components/ui";
import { Alert, useToast } from "../components/feedback";
import { Logo } from "../components/chrome";
import { LivePriceTicker } from "../components/commerce";
import { fa } from "../lib";
import { KeyRound, Smartphone, Sparkles, ShieldCheck, ArrowLeft, UserCheck } from "../components/icons";
import type { User } from "../types";

function roleHome(u: User): string {
  return u.role === "admin" ? "/admin" : u.role === "staff" ? "/staff" : "/app/dashboard";
}

function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <LivePriceTicker />
      <div className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-10 bg-charcoal-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(45deg, #C9A227 0 1px, transparent 1px 16px)" }} aria-hidden />
          <img src={IMG.vault} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/60 to-charcoal-900/30" />
          <div className="relative"><Logo dark /></div>
          <div className="relative max-w-md">
            <p className="font-display text-[13px] tracking-[0.3em] text-gold-500 uppercase mb-4">Zarvan Gold</p>
            <h2 className="text-[30px] font-black text-cream-0 leading-[1.5]">طلای مطمئن،<br />قیمت لحظه‌ای، خزانه یا درب منزل.</h2>
            <div className="gold-hairline my-6 w-40" />
            <ul className="space-y-3 text-[13px] text-cream-0/75">
              <li className="flex items-center gap-2.5"><ShieldCheck size={15} className="text-gold-500" /> خزانه بیمه‌شده با نسبت پشتیبانی شفاف</li>
              <li className="flex items-center gap-2.5"><Sparkles size={15} className="text-gold-500" /> خرید میلی‌گرمی، ۲۴ ساعته و بدون اجرت</li>
              <li className="flex items-center gap-2.5"><UserCheck size={15} className="text-gold-500" /> احراز هویت سریع با موبایل</li>
            </ul>
          </div>
          <p className="relative text-[11px] text-cream-0/40">© ۱۴۰۵ شرکت طلای زرون — عضو اتحادیه طلا و جواهر</p>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md anim-fade-up">
            <div className="lg:hidden mb-8 flex justify-center"><Logo /></div>
            <h1 className="text-[24px] font-black text-charcoal-900">{title}</h1>
            <p className="text-[13.5px] text-charcoal-500 mt-1.5 leading-6">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {aside && <div className="mt-6">{aside}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const send = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await authApi.sendOtp(mobile);
      sessionStorage.setItem("zarvan_otp_mobile", mobile);
      sessionStorage.setItem("zarvan_otp_from", (location.state as { from?: string } | null)?.from ?? "");
      toast("کد تأیید ارسال شد", "info");
      navigate("/otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ارسال کد");
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="ورود / ثبت‌نام" subtitle="شماره موبایل خود را وارد کنید؛ کد ۶ رقمی برایتان پیامک می‌شود. ثبت‌نام هم با همین کد انجام می‌شود.">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <MobileInput value={mobile} onChange={(e) => setMobile(e.target.value)} error={error}
          hint="مثال: ۰۹۱۲۱۲۳۴۵۶۷" autoFocus />
        <Button full size="lg" loading={busy} disabled={mobile.length !== 11} icon={<Smartphone size={16} />}>
          ارسال کد تأیید
        </Button>
      </form>
      <Link to="/login/password" className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium text-gold-700 hover:text-gold-600 transition-colors">
        <KeyRound size={14} /> ورود با رمز عبور
      </Link>

      <div className="mt-8 border border-dashed border-gold-300 rounded-card p-4 bg-gold-50/50">
        <p className="text-[11.5px] font-bold text-gold-700 mb-3">ورود آزمایشی سریع (دمو):</p>
        <div className="grid grid-cols-2 gap-2">
          <DemoBtn label="مشتری — سارا کریمی" uid={1} />
          <DemoBtn label="نماینده — رضا محمدی" uid={2} />
          <DemoBtn label="کارمند — الهام رضایی" uid={4} />
          <DemoBtn label="مدیر — مجتبی علام" uid={5} />
        </div>
      </div>
    </AuthShell>
  );
}

function DemoBtn({ label, uid }: { label: string; uid: number }) {
  const { login } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} onClick={async () => {
      setBusy(true);
      const u = await authApi.demoLogin(uid);
      login(u);
      navigate(u.role === "admin" ? "/admin" : u.role === "staff" ? "/staff" : "/app/dashboard");
    }}
      className="h-10 px-2 rounded-[8px] border border-inkline bg-cream-0 text-[11.5px] font-semibold text-charcoal-700 hover:border-gold-500 hover:bg-gold-50 hover:text-charcoal-900 transition-all active:scale-95 focus-ring disabled:opacity-60">
      {label}
    </button>
  );
}

export function PasswordLoginPage() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { login } = useApp();
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <AuthShell title="ورود با رمز عبور" subtitle="اگر پیش‌تر رمز عبور تعیین کرده‌اید، با موبایل و رمز وارد شوید.">
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setError(undefined);
        try {
          const u = await authApi.passwordLogin(mobile, password);
          login(u);
          toast(`خوش آمدید، ${u.name ?? "کاربر زرون"}`);
          navigate(roleHome(u));
        } catch (err) { setError(err instanceof Error ? err.message : "خطا در ورود"); }
        finally { setBusy(false); }
      }}>
        <MobileInput value={mobile} onChange={(e) => setMobile(e.target.value)} />
        <Input label="رمز عبور" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" error={error} autoComplete="current-password" />
        <Button full size="lg" loading={busy} disabled={!mobile || password.length < 6}>ورود</Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-[13px]">
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-gold-700 hover:text-gold-600"><ArrowLeft size={14} className="rotate-180" /> ورود با کد یکبارمصرف</Link>
        <button className="text-charcoal-500 hover:text-charcoal-900 underline underline-offset-4" onClick={() => {
          sessionStorage.setItem("zarvan_otp_mobile", mobile || "09121234567");
          navigate("/otp");
        }}>رمز را فراموش کردم</button>
      </div>
    </AuthShell>
  );
}

export function OtpPage() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [referral, setReferral] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [resendIn, setResendIn] = useState(59);
  const mobile = sessionStorage.getItem("zarvan_otp_mobile") ?? params.get("mobile") ?? "";
  const from = sessionStorage.getItem("zarvan_otp_from");
  const { login } = useApp();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!mobile) navigate("/login");
  }, [mobile, navigate]);

  useEffect(() => {
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const verify = async () => {
    setBusy(true); setError(undefined);
    try {
      const u = await authApi.verifyOtp(mobile, code, referral || undefined);
      login(u);
      toast(u.name ? `خوش آمدید، ${u.name}` : "حساب شما ساخته شد — خوش آمدید");
      navigate(from || roleHome(u), { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : "کد نامعتبر است"); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="کد تأیید" subtitle={`کد ۶ رقمی ارسال‌شده به ${fa(mobile)} را وارد کنید.`}>
      <div className="space-y-5">
        <OtpInput value={code} onChange={setCode} error={error} />
        <Input label="کد معرف (اختیاری)" value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="ZARV-XXXX" hint="اگر دوستی شما را معرفی کرده، کد او را وارد کنید." />
        <Button full size="lg" loading={busy} disabled={code.length !== 6} onClick={verify}>تأیید کد</Button>
        <div className="text-center">
          <button disabled={resendIn > 0} onClick={async () => { await authApi.sendOtp(mobile); setResendIn(59); toast("کد دوباره ارسال شد", "info"); }}
            className="text-[13px] font-medium text-gold-700 hover:text-gold-600 disabled:text-charcoal-500/50 transition-colors">
            {resendIn > 0 ? `ارسال دوباره کد (۰:${fa(String(resendIn).padStart(2, "0"))})` : "ارسال دوباره کد"}
          </button>
        </div>
        <Alert kind="info" title="محیط آزمایشی">هر کد ۶ رقمی به‌جز «۰۰۰۰۰۰» پذیرفته می‌شود. شماره‌های جدید به‌صورت خودکار ثبت‌نام می‌شوند.</Alert>
      </div>
    </AuthShell>
  );
}
