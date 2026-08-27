import React, { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useApp } from "../auth";
import { StorefrontHeader, StorefrontFooter, MobileBottomNav, AppSidebar, AppTopbar, AdminMobileNav, customerNav, staffNav, adminNav, type NavGroup } from "../components/chrome";
import { TradingHaltedBanner } from "../components/feedback";
import { adminApi } from "../api";

function SkipLink() {
  return (
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[200] focus:bg-charcoal-900 focus:text-cream-0 focus:px-4 focus:py-2 focus:rounded-lg focus:text-[13px] font-bold">
      پرش به محتوا
    </a>
  );
}

/* ================================ Storefront ================================ */
export function StorefrontLayout() {
  const halted = adminApi.settings.trading_halt;
  return (
    <div className="min-h-screen flex flex-col">
      <SkipLink />
      <StorefrontHeader />
      {halted && <div className="max-w-7xl mx-auto w-full px-4 mt-3"><TradingHaltedBanner /></div>}
      <main id="main" className="flex-1 pb-24 lg:pb-0">
        <Outlet />
      </main>
      <StorefrontFooter />
      <MobileBottomNav />
    </div>
  );
}

/* ================================ Customer / Dealer ================================ */
export function CustomerLayout() {
  const { user } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const groups = useMemo(() => customerNav(user?.role === "dealer"), [user?.role]);

  const crumb = useMemo(() => {
    const all = groups.flatMap((g) => g.items);
    const hit = all.find((i) => location.pathname.startsWith(i.to) && i.to !== "/catalog");
    return [
      { label: "زرون گلد", to: "/app/dashboard" },
      ...(hit ? [{ label: hit.label }] : [{ label: "—" }]),
    ];
  }, [groups, location.pathname]);

  return (
    <div className="min-h-screen flex">
      <SkipLink />
      <AppSidebar groups={groups} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <AdminMobileNav groups={groups} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <AppTopbar crumbs={crumb} onMenu={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </main>
        <footer className="border-t border-inkline py-4 text-center text-[11.5px] text-charcoal-500">
          زرون گلد — طلای مطمئن، قیمت لحظه‌ای · پشتیبانی <b className="tnum" dir="ltr">۰۲۱-۹۱۰۰۰۰۰۰</b>
        </footer>
      </div>
      <MobileBottomNav />
      <div className="h-16 lg:hidden" />
    </div>
  );
}

/* ================================ Staff ================================ */
export function StaffLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const groups = useMemo(() => staffNav(), []);
  const crumb = useMemo(() => {
    const hit = groups.flatMap((g) => g.items).find((i) => location.pathname === i.to);
    return [{ label: "پنل کارکنان", to: "/staff" }, ...(hit ? [{ label: hit.label }] : [])];
  }, [groups, location.pathname]);

  return (
    <div className="min-h-screen flex">
      <SkipLink />
      <AppSidebar groups={groups} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} tone="charcoal" />
      <AdminMobileNav groups={groups} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <AppTopbar crumbs={crumb} onMenu={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ================================ Admin ================================ */
export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const groups = useMemo(() => adminNav(), []);
  const crumb = useMemo(() => {
    const hit = groups.flatMap((g) => g.items).find((i) => location.pathname === i.to);
    return [{ label: "مدیریت زرون", to: "/admin" }, ...(hit ? [{ label: hit.label }] : [])];
  }, [groups, location.pathname]);

  return (
    <div className="min-h-screen flex">
      <SkipLink />
      <AppSidebar groups={groups} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <AdminMobileNav groups={groups} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="gold-hairline" />
        <AppTopbar crumbs={crumb} onMenu={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export type { NavGroup };
