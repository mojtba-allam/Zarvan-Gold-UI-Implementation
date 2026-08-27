import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import type { AppNotification, UserRole } from "../types";
import { notifyApi } from "../api";
import { cn, fa, formatIrr, formatMgRaw, timeAgo, jalaliDate } from "../lib";
import { useApp } from "../auth";
import { Badge, Button, Drawer, IconButton, KYC_STATUS_FA, Skeleton } from "./ui";
import { useToast } from "./feedback";
import {
  LayoutDashboard, CandlestickChart, Wallet, PieChart, Store, ShoppingBag, Package, FileText,
  Truck, Gift, CalendarClock, TrendingUp, BellRing, Users, LifeBuoy, ShieldCheck, UserCircle,
  Search, LogOut, Menu, X, Building2, Boxes, Tags, BarChart3, Settings, Megaphone, Receipt,
  Landmark, BadgePercent, ClipboardList, Home, ChevronDown, PanelRightClose, PanelRightOpen, Factory,
} from "./icons";
import { LivePriceTicker } from "./commerce";

/* ================================ Logo ================================ */
export function Logo({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 focus-ring rounded-md" aria-label="زرون گلد — صفحه اصلی">
      <svg viewBox="0 0 40 26" className="w-8 h-5.5 shrink-0" aria-hidden>
        <path d="M9 3h22l6 19H3z" fill="#C9A227" />
        <path d="M9 3h22l2 6.5H7z" fill="#E8CE7E" />
        <path d="M13.5 13.5h13l1.6 4.5H11.9z" fill="#A68516" opacity="0.55" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className={cn("block text-[19px] font-black", dark ? "text-cream-0" : "text-charcoal-900")}>زرون<span className="text-gold-500"> گلد</span></span>
          <span className={cn("block font-display text-[9px] tracking-[0.28em] mt-1 uppercase", dark ? "text-cream-0/45" : "text-charcoal-500")}>Zarvan Gold</span>
        </span>
      )}
    </Link>
  );
}

/* ================================ Storefront Header ================================ */
const navLinks = [
  { to: "/catalog", label: "فروشگاه" },
  { to: "/prices", label: "قیمت لحظه‌ای" },
  { to: "/size-guide", label: "راهنمای سایز" },
  { to: "/about", label: "درباره" },
  { to: "/faq", label: "سؤالات" },
];

export function StorefrontHeader() {
  const { user, cartCount, wallets } = useApp();
  const [q, setQ] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const goldWallet = wallets.find((w) => w.currency === "gold_mg");

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  useEffect(() => setCartOpen(false), [location.pathname]);

  return (
    <>
      <LivePriceTicker />
      <header className={cn("sticky top-0 z-50 bg-cream-50/90 backdrop-blur-md border-b transition-all", scrolled ? "border-inkline shadow-[0_1px_0_rgba(201,162,39,0.15)]" : "border-transparent")}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1 ms-4" aria-label="ناوبری اصلی">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) => cn("px-3 py-2 rounded-[8px] text-[13.5px] font-medium transition-colors focus-ring",
                  isActive ? "text-gold-700 bg-gold-50 font-bold" : "text-charcoal-700 hover:text-charcoal-900 hover:bg-cream-100")}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1.5">
            <form className="hidden md:block relative" onSubmit={(e) => { e.preventDefault(); navigate(`/catalog?q=${encodeURIComponent(q)}`); }} role="search">
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی محصول، سکه، شمش…" aria-label="جستجوی محصول"
                className="h-10 w-52 xl:w-64 rounded-full border border-inkline bg-cream-0 ps-9 pe-3 text-[12.5px] placeholder:text-charcoal-500/60 focus-ring hover:border-gold-300 focus:border-gold-500 transition-colors" />
            </form>

            {user ? (
              <>
                <button onClick={() => navigate("/app/dashboard")}
                  className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-[8px] bg-charcoal-900 text-cream-0 text-[12px] font-bold hover:bg-charcoal-800 transition-colors focus-ring">
                  <Landmark size={13} className="text-gold-500" />
                  <span className="tnum">{goldWallet ? formatMgRaw(goldWallet.balance) : "—"}</span>
                </button>
                <IconButton label="سبد خرید" className="relative" onClick={() => setCartOpen(true)}>
                  <ShoppingBag size={19} />
                  {cartCount > 0 && (
                    <span aria-label={`${fa(cartCount)} قلم در سبد`} className="absolute -top-0.5 -end-0.5 h-4.5 min-w-4.5 px-0.5 rounded-full bg-gold-500 text-charcoal-900 text-[10px] font-black grid place-items-center tnum anim-pop">{fa(cartCount)}</span>
                  )}
                </IconButton>
                <Link to="/app/dashboard" className="flex items-center gap-2 rounded-full border border-inkline bg-cream-0 ps-1 pe-3 h-10 hover:border-gold-400 transition-colors focus-ring">
                  <span className="h-8 w-8 rounded-full bg-gold-100 grid place-items-center text-[12.5px] font-black text-gold-700">{(user.name ?? "ک").slice(0, 1)}</span>
                  <span className="hidden sm:block text-[12.5px] font-bold text-charcoal-900">{user.name ?? "حساب من"}</span>
                </Link>
              </>
            ) : (
              <Link to="/login" className="inline-flex items-center h-10 px-4 rounded-[8px] border-[1.5px] border-gold-500 text-gold-700 text-[13px] font-bold hover:bg-gold-500 hover:text-charcoal-900 transition-all focus-ring active:scale-95">
                ورود / ثبت‌نام
              </Link>
            )}
          </div>
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, refreshCart, user } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <Drawer open={open} onClose={onClose} title={`سبد خرید ${cart && cart.lines.length ? `(${fa(cart.lines.length)} قلم)` : ""}`}
      footer={cart && cart.lines.length > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-between text-[13.5px]"><span className="text-charcoal-500">جمع سبد</span><b className="tnum">{formatIrr(cart.total_irr)} ریال</b></div>
          <Button full size="lg" onClick={() => { onClose(); navigate(user ? "/app/checkout" : "/login"); }}>مشاهده سبد و ادامه خرید</Button>
        </div>
      ) : undefined}>
      {!cart || cart.lines.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-16 w-16 mx-auto rounded-full bg-gold-50 border border-gold-100 grid place-items-center text-gold-600 mb-4"><ShoppingBag size={24} /></div>
          <p className="text-[14px] font-bold text-charcoal-900">سبد خرید خالی است</p>
          <p className="text-[12.5px] text-charcoal-500 mt-1.5 leading-6">از فروشگاه زرون، سکه، شمش یا جواهر انتخاب کنید.</p>
          <Button className="mt-5" onClick={() => { onClose(); navigate("/catalog"); }}>مشاهده فروشگاه</Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {cart.lines.map((l) => (
            <li key={String(l.id)} className="flex gap-3 border border-inkline rounded-card p-2.5 bg-cream-0">
              <img src={l.product?.images[0]} alt="" className="h-16 w-16 rounded-lg object-cover bg-cream-100" />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold truncate">{l.product?.name}</p>
                <p className="text-[11px] text-charcoal-500 tnum mt-0.5">{fa(l.qty)} × {formatIrr(l.unit_quote_irr)}</p>
                <p className="text-[12.5px] font-black tnum mt-1 text-gold-700">{formatIrr(l.unit_quote_irr * l.qty)} ریال</p>
              </div>
              <IconButton label="حذف از سبد" className="h-8 w-8 self-start hover:text-danger" onClick={async () => {
                const { orderApi } = await import("../api");
                await orderApi.removeLine(Number(l.id));
                await refreshCart();
                toast("از سبد حذف شد", "info");
              }}><X size={15} /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

/* ================================ Storefront Footer ================================ */
export function StorefrontFooter() {
  return (
    <footer className="mt-16 bg-charcoal-900 text-cream-0 relative overflow-hidden">
      <div className="gold-hairline absolute top-0 inset-x-0" />
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <Logo dark />
          <p className="text-[12.5px] text-cream-0/60 leading-6 mt-4">طلای مطمئن، قیمت لحظه‌ای، خزانه یا درب منزل. خرید میلی‌گرمی تا شمش، با فاکتور رسمی و تضمین عیار.</p>
          <p className="font-display text-[11px] tracking-[0.2em] text-gold-500 mt-4 uppercase">Trusted gold · Live prices</p>
        </div>
        <FooterCol title="دسترسی سریع" links={[["فروشگاه", "/catalog"], ["قیمت لحظه‌ای", "/prices"], ["راهنمای سایز", "/size-guide"], ["معامله سریع", "/app/trade"]]} />
        <FooterCol title="خدمات مشتریان" links={[["پیگیری سفارش", "/app/orders"], ["فاکتورها", "/app/invoices"], ["هدیه طلا", "/app/gifts"], ["معرفی دوستان", "/app/referrals"]]} />
        <div>
          <h4 className="text-[13px] font-bold text-gold-500 mb-4">مجوزها و اعتماد</h4>
          <div className="flex flex-wrap gap-2">
            {["اتحادیه طلا و جواهر", "نماد اعتماد الکترونیکی", "عضو شتاب", "خزانه بیمه‌شده"].map((b) => (
              <span key={b} className="text-[11px] border border-cream-0/15 rounded-lg px-2.5 py-1.5 text-cream-0/70 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-gold-500" />{b}
              </span>
            ))}
          </div>
          <p className="text-[12px] text-cream-0/60 mt-5 flex items-center gap-2"><LifeBuoy size={14} className="text-gold-500" /> پشتیبانی: <b className="tnum" dir="ltr">۰۲۱-۹۱۰۰۰۰۰۰</b></p>
        </div>
      </div>
      <div className="border-t border-cream-0/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-cream-0/45">
          <p>© ۱۴۰۵ شرکت طلای زرون (سهامی خاص) — کلیه حقوق محفوظ است.</p>
          <p className="flex gap-4"><Link className="hover:text-gold-500 transition-colors" to="/faq">سؤالات متداول</Link><Link className="hover:text-gold-500 transition-colors" to="/contact">تماس با ما</Link><Link className="hover:text-gold-500 transition-colors" to="/about">قوانین</Link></p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-[13px] font-bold text-gold-500 mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(([label, to]) => (
          <li key={to}><Link to={to} className="text-[12.5px] text-cream-0/65 hover:text-gold-500 transition-colors">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

/* ================================ App Sidebar ================================ */
export interface NavItem { to: string; label: string; icon: React.ReactNode; roles?: UserRole[] }
export interface NavGroup { title: string; items: NavItem[] }

export function customerNav(isDealer: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    { title: "مالی", items: [
      { to: "/app/dashboard", label: "داشبورد", icon: <LayoutDashboard size={17} /> },
      { to: "/app/trade", label: "معامله سریع", icon: <CandlestickChart size={17} /> },
      { to: "/app/wallet", label: "کیف پول", icon: <Wallet size={17} /> },
      { to: "/app/portfolio", label: "سبد دارایی", icon: <PieChart size={17} /> },
      { to: "/app/buyback", label: "بازخرید طلا", icon: <TrendingUp size={17} /> },
    ] },
    { title: "خرید", items: [
      { to: "/catalog", label: "فروشگاه", icon: <Store size={17} /> },
      { to: "/app/cart", label: "سبد خرید", icon: <ShoppingBag size={17} /> },
      { to: "/app/orders", label: "سفارش‌ها", icon: <Package size={17} /> },
      { to: "/app/invoices", label: "فاکتورها", icon: <FileText size={17} /> },
      { to: "/app/delivery", label: "تحویل فیزیکی", icon: <Truck size={17} /> },
    ] },
    { title: "سرمایه‌گذاری", items: [
      { to: "/app/auto-invest", label: "خرید پله‌ای", icon: <CalendarClock size={17} /> },
      { to: "/app/installments", label: "اقساط", icon: <Receipt size={17} /> },
      { to: "/app/alerts", label: "هشدار قیمت", icon: <BellRing size={17} /> },
    ] },
    { title: "حساب", items: [
      { to: "/app/gifts", label: "هدیه طلا", icon: <Gift size={17} /> },
      { to: "/app/referrals", label: "معرفی دوستان", icon: <Users size={17} /> },
      { to: "/app/tickets", label: "پشتیبانی", icon: <LifeBuoy size={17} /> },
      { to: "/app/kyc", label: "احراز هویت", icon: <ShieldCheck size={17} /> },
      { to: "/app/profile", label: "پروفایل", icon: <UserCircle size={17} /> },
    ] },
  ];
  if (isDealer) groups.splice(3, 0, { title: "عمده‌فروشی", items: [
    { to: "/app/dealer", label: "داشبورد عمده", icon: <Factory size={17} /> },
    { to: "/app/dealer/bulk", label: "سفارش عمده", icon: <Boxes size={17} /> },
  ] });
  return groups;
}

export function staffNav(): NavGroup[] {
  return [{ title: "عملیات", items: [
    { to: "/staff", label: "صف عملیات", icon: <LayoutDashboard size={17} /> },
    { to: "/staff/kyc", label: "احراز هویت", icon: <ShieldCheck size={17} /> },
    { to: "/staff/orders", label: "سفارش‌ها", icon: <Package size={17} /> },
    { to: "/staff/inventory", label: "موجودی", icon: <Boxes size={17} /> },
    { to: "/staff/tickets", label: "تیکت‌ها", icon: <LifeBuoy size={17} /> },
    { to: "/staff/customers", label: "مشتریان", icon: <Users size={17} /> },
  ] }];
}

export function adminNav(): NavGroup[] {
  return [
    { title: "نمای کلی", items: [
      { to: "/admin", label: "داشبورد", icon: <LayoutDashboard size={17} /> },
      { to: "/admin/reports", label: "گزارش‌ها", icon: <BarChart3 size={17} /> },
    ] },
    { title: "فروشگاه", items: [
      { to: "/admin/products", label: "محصولات", icon: <Store size={17} /> },
      { to: "/admin/categories", label: "دسته‌بندی‌ها", icon: <Tags size={17} /> },
      { to: "/admin/inventory", label: "موجودی و خزانه", icon: <Boxes size={17} /> },
      { to: "/admin/pricing", label: "قیمت‌گذاری", icon: <CandlestickChart size={17} /> },
    ] },
    { title: "عملیات", items: [
      { to: "/admin/orders", label: "سفارش‌ها", icon: <Package size={17} /> },
      { to: "/admin/payments", label: "پرداخت‌ها", icon: <Receipt size={17} /> },
      { to: "/admin/invoices", label: "فاکتورها", icon: <FileText size={17} /> },
    ] },
    { title: "مشتریان", items: [
      { to: "/admin/customers", label: "مشتریان", icon: <Users size={17} /> },
      { to: "/admin/wallets", label: "کیف پول‌ها", icon: <Wallet size={17} /> },
      { to: "/admin/promotions", label: "کمپین‌ها", icon: <BadgePercent size={17} /> },
    ] },
    { title: "سیستم", items: [
      { to: "/admin/staff", label: "کارکنان", icon: <ClipboardList size={17} /> },
      { to: "/admin/broadcast", label: "اعلان همگانی", icon: <Megaphone size={17} /> },
      { to: "/admin/settings", label: "تنظیمات", icon: <Settings size={17} /> },
    ] },
  ];
}

const roleBadge: Record<UserRole, { label: string; cls: string }> = {
  customer: { label: "مشتری", cls: "bg-gold-500/15 text-gold-500 border-gold-500/30" },
  dealer: { label: "نماینده", cls: "bg-info/20 text-info border-info/30" },
  staff: { label: "کارمند", cls: "bg-cream-0/10 text-cream-0 border-cream-0/25" },
  admin: { label: "مدیر", cls: "bg-gold-500 text-charcoal-900 border-gold-400" },
};

export function AppSidebar({ groups, collapsed, onToggleCollapse, tone = "dark" }: {
  groups: NavGroup[]; collapsed: boolean; onToggleCollapse: () => void; tone?: "dark" | "charcoal";
}) {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  if (!user) return null;
  return (
    <aside className={cn("hidden lg:flex flex-col bg-charcoal-900 text-cream-0 border-e border-gold-500/20 transition-all duration-200 sticky top-0 h-screen z-40", collapsed ? "w-[76px]" : "w-[248px]")}>
      <div className={cn("flex items-center h-16 px-4 border-b border-cream-0/10", collapsed ? "justify-center" : "justify-between")}>
        <Logo dark compact={collapsed} />
        <button onClick={onToggleCollapse} aria-label={collapsed ? "بازکردن منو" : "جمع‌کردن منو"}
          className="p-2 rounded-md text-cream-0/50 hover:text-gold-500 hover:bg-cream-0/5 transition-colors focus-ring">
          {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
        </button>
      </div>
      <div className={cn("px-3 py-3 border-b border-cream-0/10 flex items-center gap-2.5", collapsed && "justify-center")}>
        <span className="h-9 w-9 rounded-full bg-gold-500/20 border border-gold-500/40 grid place-items-center text-[13px] font-black text-gold-500 shrink-0">{(user.name ?? "ک").slice(0, 1)}</span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold truncate">{user.name ?? "کاربر زرون"}</p>
            <span className={cn("inline-block mt-0.5 text-[9.5px] font-bold border rounded-full px-2 py-px", roleBadge[user.role].cls)}>{roleBadge[user.role].label}</span>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2.5" aria-label="منوی اصلی">
        {groups.map((g) => (
          <div key={g.title} className="mb-4">
            {!collapsed && <p className="text-[10px] font-bold text-cream-0/35 px-2.5 mb-1.5">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = location.pathname === it.to || (it.to.startsWith("/app/orders") && location.pathname.startsWith("/app/orders")) && it.to === "/app/orders";
                return (
                  <li key={it.to}>
                    <NavLink to={it.to} title={collapsed ? it.label : undefined}
                      className={cn("flex items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-[13px] transition-all focus-ring", collapsed && "justify-center",
                        active ? "bg-gold-500/15 text-gold-500 font-bold border-s-2 border-gold-500" : "text-cream-0/70 hover:text-cream-0 hover:bg-cream-0/5 border-s-2 border-transparent")}>
                      <span className={cn(active ? "text-gold-500" : "text-cream-0/50")}>{it.icon}</span>
                      {!collapsed && it.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-cream-0/10">
        {!collapsed && <p className="text-[10px] text-cream-0/35 px-1.5 mb-2">نسخه ۱٫۰ — فقط روشن</p>}
        <button onClick={async () => { await logout(); toast("از حساب خارج شدید", "info"); navigate("/"); }}
          className={cn("w-full flex items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-[13px] text-cream-0/70 hover:text-danger hover:bg-danger/10 transition-colors focus-ring", collapsed && "justify-center")}>
          <LogOut size={16} />{!collapsed && "خروج"}
        </button>
      </div>
    </aside>
  );
}

/* ================================ App Topbar ================================ */
export function AppTopbar({ crumbs, onMenu }: { crumbs: { label: string; to?: string }[]; onMenu?: () => void }) {
  const { user, wallets, logout } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[] | null>(null);
  const irr = wallets.find((w) => w.currency === "irr");
  const gold = wallets.find((w) => w.currency === "gold_mg");
  const unread = notifs?.filter((n) => !n.read_at).length ?? 0;

  const loadNotifs = async () => {
    setBellOpen(true);
    if (!notifs) setNotifs(await notifyApi.list());
  };

  if (!user) return null;
  return (
    <div className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur-md border-b border-inkline">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        {onMenu && <IconButton label="منو" className="lg:hidden" onClick={onMenu}><Menu size={19} /></IconButton>}
        <nav aria-label="مسیر" className="hidden sm:flex items-center gap-1.5 text-[12.5px] text-charcoal-500 min-w-0">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-inkline">/</span>}
              {c.to ? <Link to={c.to} className="hover:text-gold-700 transition-colors">{c.label}</Link> : <span className="font-bold text-charcoal-900 truncate">{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {irr && (
            <button onClick={() => navigate("/app/wallet")} className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-full border border-inkline bg-cream-0 text-[11.5px] font-bold hover:border-gold-400 transition-colors focus-ring" title="کیف پول ریال">
              <Wallet size={13} className="text-charcoal-500" /><span className="tnum">{formatIrr(irr.balance)}</span>
            </button>
          )}
          {gold && (
            <button onClick={() => navigate("/app/portfolio")} className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-charcoal-900 text-cream-0 text-[11.5px] font-bold hover:bg-charcoal-800 transition-colors focus-ring" title="کیف پول طلا">
              <Landmark size={13} className="text-gold-500" /><span className="tnum">{formatIrr(gold.balance)}</span><span className="text-cream-0/50 text-[10px]">mg</span>
            </button>
          )}
          <div className="relative">
            <IconButton label="اعلان‌ها" className="relative" onClick={loadNotifs}>
              <BellRing size={18} />
              {unread > 0 && <span className="absolute top-1 end-1 h-4 min-w-4 px-0.5 rounded-full bg-danger text-cream-0 text-[9.5px] font-black grid place-items-center tnum">{fa(unread)}</span>}
            </IconButton>
            {bellOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                <div className="absolute z-50 top-full mt-2 end-0 w-80 bg-cream-0 border border-inkline rounded-card shadow-[var(--shadow-pop)] overflow-hidden anim-pop">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-inkline">
                    <p className="text-[13px] font-bold">اعلان‌ها</p>
                    <button className="text-[11.5px] text-gold-700 font-medium hover:underline" onClick={async () => { await notifyApi.markAll(); setNotifs((n) => n?.map((x) => ({ ...x, read_at: new Date().toISOString() })) ?? null); }}>خواندن همه</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-inkline/60">
                    {!notifs && Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-3.5"><Skeleton className="h-3.5 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></div>)}
                    {notifs?.length === 0 && <p className="p-6 text-center text-[12.5px] text-charcoal-500">اعلانی ندارید</p>}
                    {notifs?.map((n) => (
                      <div key={n.id} className={cn("px-4 py-3 flex gap-2.5", !n.read_at && "bg-gold-50/60")}>
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", n.read_at ? "bg-inkline" : "bg-gold-500")} />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold truncate">{n.title}</p>
                          <p className="text-[11.5px] text-charcoal-500 leading-5 line-clamp-2">{n.body}</p>
                          <p className="text-[10.5px] text-charcoal-500/70 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/app/notifications" onClick={() => setBellOpen(false)} className="block text-center text-[12px] font-bold text-gold-700 py-2.5 border-t border-inkline hover:bg-gold-50 transition-colors">همه اعلان‌ها</Link>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full focus-ring" aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="h-9.5 w-9.5 rounded-full bg-gold-100 border border-gold-200 grid place-items-center text-[13px] font-black text-gold-700">{(user.name ?? "ک").slice(0, 1)}</span>
              <ChevronDown size={14} className="text-charcoal-500 hidden sm:block" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute z-50 top-full mt-2 end-0 w-56 bg-cream-0 border border-inkline rounded-card shadow-[var(--shadow-pop)] p-1.5 anim-pop" role="menu">
                  <div className="px-3 py-2.5 border-b border-inkline mb-1">
                    <p className="text-[13px] font-bold truncate">{user.name ?? "کاربر زرون"}</p>
                    <p className="text-[11px] text-charcoal-500 tnum" dir="ltr">{user.mobile}</p>
                    <Badge status={KYC_STATUS_FA[user.kyc_status].status} className="mt-1.5">{KYC_STATUS_FA[user.kyc_status].label}</Badge>
                  </div>
                  <MenuItem onClick={() => { setMenuOpen(false); navigate("/app/profile"); }} icon={<UserCircle size={15} />} label="پروفایل" />
                  <MenuItem onClick={() => { setMenuOpen(false); navigate("/app/kyc"); }} icon={<ShieldCheck size={15} />} label="احراز هویت" />
                  <MenuItem danger onClick={async () => { await logout(); toast("از حساب خارج شدید", "info"); navigate("/"); }} icon={<LogOut size={15} />} label="خروج" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ label, icon, onClick, danger }: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick}
      className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] font-medium transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-charcoal-700 hover:bg-cream-100 hover:text-charcoal-900")}>
      {icon}{label}
    </button>
  );
}

/* ================================ Mobile navs ================================ */
export function MobileBottomNav() {
  const { cartCount } = useApp();
  const items = [
    { to: "/", label: "خانه", icon: <Home size={19} /> },
    { to: "/catalog", label: "فروشگاه", icon: <Store size={19} /> },
    { to: "/prices", label: "قیمت‌ها", icon: <CandlestickChart size={19} /> },
    { to: "/app/cart", label: "سبد", icon: <ShoppingBag size={19} />, badge: cartCount },
    { to: "/app/dashboard", label: "حساب", icon: <UserCircle size={19} /> },
  ];
  const location = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-cream-0/95 backdrop-blur border-t border-inkline pb-[env(safe-area-inset-bottom)]" aria-label="ناوبری موبایل">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.to === "/" ? location.pathname === "/" : location.pathname.startsWith(it.to);
          return (
            <NavLink key={it.to} to={it.to}
              className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors", active ? "text-gold-700" : "text-charcoal-500")}>
              <span className={cn("relative px-3 py-0.5 rounded-full transition-colors", active && "bg-gold-100")}>
                {it.icon}
                {!!it.badge && <span className="absolute -top-1 -end-1 h-4 min-w-4 rounded-full bg-gold-500 text-charcoal-900 text-[9px] font-black grid place-items-center tnum px-0.5">{fa(it.badge)}</span>}
              </span>
              {it.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminMobileNav({ groups, open, onClose }: { groups: NavGroup[]; open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title="منوی مدیریت" side="start">
      <nav className="space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-[11px] font-bold text-charcoal-500 mb-2">{g.title}</p>
            <ul className="space-y-1">
              {g.items.map((it) => (
                <li key={it.to}>
                  <NavLink to={it.to} onClick={onClose}
                    className={({ isActive }) => cn("flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13.5px] font-medium", isActive ? "bg-gold-50 text-gold-700 font-bold" : "text-charcoal-700 hover:bg-cream-100")}>
                    {it.icon}{it.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </Drawer>
  );
}
