import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import { Lock, Compass, ServerCrash, Wrench } from "../components/icons";

function ErrorShell({ icon, code, title, body, children }: { icon: ReactNode; code: string; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-16">
      <div className="max-w-md w-full text-center anim-fade-up">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 rounded-full bg-gold-500/20 blur-2xl scale-150" aria-hidden />
          <div className="relative h-20 w-20 mx-auto rounded-full bg-charcoal-900 border-4 border-gold-500/60 grid place-items-center text-gold-500">
            {icon}
          </div>
        </div>
        <p className="font-display text-[44px] font-bold text-gold-600/70 leading-none" dir="ltr">{code}</p>
        <h1 className="text-[22px] font-black text-charcoal-900 mt-2">{title}</h1>
        <p className="text-[13.5px] text-charcoal-500 leading-7 mt-2">{body}</p>
        <div className="mt-7 flex items-center justify-center gap-2.5">{children}</div>
      </div>
    </div>
  );
}

export function Error403Page() {
  return (
    <ErrorShell icon={<Lock size={30} />} code="403" title="دسترسی مجاز نیست"
      body="حساب شما اجازه مشاهده این بخش را ندارد. اگر فکر می‌کنید اشتباهی رخ داده، با پشتیبانی تماس بگیرید.">
      <Link to="/"><Button variant="primary">بازگشت به خانه</Button></Link>
      <Link to="/app/dashboard"><Button variant="secondary">داشبورد من</Button></Link>
    </ErrorShell>
  );
}

export function Error404Page() {
  return (
    <ErrorShell icon={<Compass size={30} />} code="404" title="صفحه پیدا نشد"
      body="نشانی واردشده وجود ندارد یا جابه‌جا شده است. از فروشگاه یا صفحه اصلی شروع کنید.">
      <Link to="/"><Button variant="primary">بازگشت به خانه</Button></Link>
      <Link to="/catalog"><Button variant="secondary">فروشگاه</Button></Link>
    </ErrorShell>
  );
}

export function Error500Page() {
  return (
    <ErrorShell icon={<ServerCrash size={30} />} code="500" title="خطای سرور"
      body="مشکلی از سمت ما پیش آمد. تیم فنی زرون مطلع شد؛ چند لحظه دیگر دوباره تلاش کنید.">
      <Button variant="primary" onClick={() => window.location.reload()}>تلاش دوباره</Button>
      <Link to="/"><Button variant="secondary">صفحه اصلی</Button></Link>
    </ErrorShell>
  );
}

export function MaintenancePage() {
  return (
    <div className="min-h-screen grid place-items-center px-4 paper-lines">
      <div className="max-w-lg w-full text-center bg-cream-0 border border-inkline rounded-card p-10 shadow-[var(--shadow-card)] anim-fade-up">
        <div className="h-16 w-16 mx-auto rounded-full bg-warning/10 border border-warning/25 grid place-items-center text-warning mb-5">
          <Wrench size={26} />
        </div>
        <h1 className="text-[22px] font-black text-charcoal-900">در حال به‌روزرسانی هستیم</h1>
        <p className="text-[13.5px] text-charcoal-500 leading-7 mt-3">
          برای بهبود سرعت و امنیت معاملات، زرون گلد موقتاً در دسترس نیست. دارایی‌های شما در خزانه امن است.
        </p>
        <div className="gold-hairline my-6" />
        <p className="text-[12.5px] text-charcoal-700">پیش‌بینی بازگشت: <b>تا دقایقی دیگر</b></p>
        <Button className="mt-6" variant="secondary" onClick={() => window.location.reload()}>بررسی دوباره</Button>
      </div>
    </div>
  );
}
