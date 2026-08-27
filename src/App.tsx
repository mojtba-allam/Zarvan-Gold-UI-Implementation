import { useEffect } from "react";
import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AppProvider, RequireAuth, RequireRole } from "./auth";
import { ToastProvider } from "./components/feedback";
import { StorefrontLayout, CustomerLayout, StaffLayout, AdminLayout } from "./layouts";

import { HomePage, SizeGuidePage, AboutPage, FaqPage, ContactPage } from "./pages/storefront";
import { CatalogPage, ProductDetailPage, LivePricesPage } from "./pages/storefront-catalog";
import { LoginPage, PasswordLoginPage, OtpPage } from "./pages/auth";
import { Error403Page, Error404Page, Error500Page, MaintenancePage } from "./pages/errors";

import { DashboardPage, TradePage, BuybackPage, WalletPage, PortfolioPage } from "./pages/customer-core";
import { CartPage, CheckoutPage, OrdersPage, OrderDetailPage, DeliveryPage, InvoicesPage, InvoiceDetailPage } from "./pages/customer-shop";
import {
  AutoInvestPage, InstallmentsPage, PriceAlertsPage, GiftsPage, ReferralsPage,
  TicketsPage, TicketDetailPage, NotificationsPage, KycPage, ProfilePage,
  DealerDashboardPage, DealerBulkPage,
} from "./pages/customer-misc";

import { StaffDashboardPage, StaffOrdersPage, StaffKycPage, StaffInventoryPage, StaffTicketsPage, StaffCustomersPage } from "./pages/staff";
import { AdminDashboardPage, ReportsPage } from "./pages/admin-overview";
import { AdminProductsPage, AdminCategoriesPage, AdminInventoryPage, AdminPricingPage } from "./pages/admin-catalog";
import {
  AdminOrdersPage, AdminPaymentsPage, AdminInvoicesPage, AdminCustomersPage,
  AdminWalletsPage, AdminPromotionsPage, AdminStaffPage, AdminSettingsPage, AdminBroadcastPage,
} from "./pages/admin-ops";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <ScrollToTop />
          <Routes>
            {/* ---------- public / storefront ---------- */}
            <Route element={<StorefrontLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/catalog/:slug" element={<ProductDetailPage />} />
              <Route path="/prices" element={<LivePricesPage />} />
              <Route path="/size-guide" element={<SizeGuidePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/403" element={<Error403Page />} />
              <Route path="/500" element={<Error500Page />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="*" element={<Error404Page />} />
            </Route>

            {/* ---------- auth ---------- */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/password" element={<PasswordLoginPage />} />
            <Route path="/otp" element={<OtpPage />} />

            {/* ---------- customer + dealer ---------- */}
            <Route path="/app" element={<RequireAuth><RequireRole roles={["customer", "dealer"]}><CustomerLayout /></RequireRole></RequireAuth>}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="trade" element={<TradePage />} />
              <Route path="buyback" element={<BuybackPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="auto-invest" element={<AutoInvestPage />} />
              <Route path="installments" element={<InstallmentsPage />} />
              <Route path="alerts" element={<PriceAlertsPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="delivery" element={<DeliveryPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="gifts" element={<GiftsPage />} />
              <Route path="referrals" element={<ReferralsPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/:id" element={<TicketDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="kyc" element={<KycPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="/app/dealer" element={<RequireAuth><RequireRole roles={["dealer", "admin"]}><CustomerLayout /></RequireRole></RequireAuth>}>
              <Route index element={<DealerDashboardPage />} />
              <Route path="bulk" element={<DealerBulkPage />} />
            </Route>

            {/* ---------- staff ---------- */}
            <Route path="/staff" element={<RequireAuth><RequireRole roles={["staff", "admin"]}><StaffLayout /></RequireRole></RequireAuth>}>
              <Route index element={<StaffDashboardPage />} />
              <Route path="orders" element={<StaffOrdersPage />} />
              <Route path="kyc" element={<StaffKycPage />} />
              <Route path="inventory" element={<StaffInventoryPage />} />
              <Route path="tickets" element={<StaffTicketsPage />} />
              <Route path="customers" element={<StaffCustomersPage />} />
            </Route>

            {/* ---------- admin ---------- */}
            <Route path="/admin" element={<RequireAuth><RequireRole roles={["admin"]}><AdminLayout /></RequireRole></RequireAuth>}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="pricing" element={<AdminPricingPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="wallets" element={<AdminWalletsPage />} />
              <Route path="promotions" element={<AdminPromotionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="broadcast" element={<AdminBroadcastPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  );
}
