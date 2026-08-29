# Zarvan Gold — Backend API Specification · Part 4: UI→API Mapping & Completeness Audit

## 1. UI element → API → table mapping

> Format: **UI location · element/action → METHOD endpoint → primary tables**.
> Client-only actions (clipboard, `window.print()`, client-built CSV from already-fetched data) are
> marked `—` and listed in §3 where a server endpoint is still recommended.

### Storefront (guest)

| UI page / component | Element / action | API | Tables |
|---|---|---|---|
| `LivePriceTicker` (all layouts) | auto-refresh 18k/24k spot, stale/halt chips | `GET /pricing/spot` | `price_snapshots`, `settings` |
| Ticker | «نمودار» link | → `/prices` (no API of its own) | — |
| Ticker | «معامله سریع» (guest → login gate) | auth flow A1–A2 | `users` |
| `StorefrontHeader` | search box | `GET /catalog/products?q=` | `products` |
| Header | cart badge count | `GET /cart` ★ | `carts`, `cart_lines` |
| Header | «ورود / ثبت‌نام» | → `/login` | — |
| Header (logged-in) | avatar + mg chip | `GET /auth/me` + `GET /wallets` | `users`, `wallets` |
| `HomePage` | hero CTAs, spot cards + sparklines | `GET /pricing/spot`, `GET /pricing/history?range=1D` | `price_snapshots` |
| HomePage | featured 4 products | `GET /catalog/products?per_page=4` | `products` |
| HomePage | bullion bid/ask table | `GET /catalog/products?type=bar` + coins | `products`, `price_snapshots` |
| HomePage | referral teaser «کپی کد» | client clipboard `—` | `users.referral_code` |
| `CatalogPage` | grid + 8 skeletons | `GET /catalog/products` (paginated) | `products` |
| Catalog | filters: type/karat/occasion/stock/price/weight/sort | query params on same endpoint | `products` |
| Catalog | `FiltersDrawer` (mobile) «اعمال» | same | — |
| `ProductCard` | «افزودن به سبد» | `POST /cart/lines` ★ | `cart_lines` |
| `ProductDetailPage` | gallery / 360 drag | `GET /catalog/products/{slug}` (+ `/media?kind=frame360`) | `products`, `files` |
| Detail | live quote + making breakdown | recompute from product + `GET /pricing/spot` | `price_snapshots` |
| Detail | qty + «افزودن به سبد» / «خرید» | `POST /cart/lines` (buy → then `/checkout`) | `cart_lines` |
| Detail | «پیش‌پرداخت/بیعانه» → `ReserveProductModal` | `POST /catalog/products/{id}/reservations` ★ | `reservations`, `payments` |
| Detail | OOS «خبرم کن» | `POST /catalog/products/{id}/restock-notify` ★ | `restock_subscriptions` (in products context) |
| Detail | اشتراک‌گذاری (copy link) | client `—` | — |
| `LivePricesPage` | area chart + range tabs + 24k overlay | `GET /pricing/history?range&karat` | `price_snapshots` |
| LivePrices | «۱۰ تغییر آخر» table | `GET /pricing/snapshots?limit=10` | `price_snapshots` |
| LivePrices | alert CTA | → `/app/alerts` (auth) | `price_alerts` |
| LivePrices | «CSV» button (login-gated) | client build from C2 today → recommend `GET /pricing/history.csv` | `price_snapshots` |
| `SizeGuidePage` | tabs, slider mm→IR/US | client math `—` | — |
| SizeGuide | «چاپ راهنما» | `window.print()` `—` | — |
| SizeGuide | «ذخیره سایز من» | **`POST /me/size-profile` ★ (UI stub → wire)** | `size_profiles` |
| `FaqPage` | accordion | static (SPA copy) — optional CMS | — |
| `AboutPage` | static | `—` | — |
| `ContactPage` | form → «ارسال» | `POST /contact` | `contact_messages` |
| `LoginPage` | mobile → «ارسال کد تأیید» | `POST /auth/otp/send` | `otp_codes` |
| Login | demo quick-login buttons | build-only, **no backend** | — |
| `PasswordLoginPage` | submit / forgot | `POST /auth/login/password`, `POST /auth/password/forgot` | `users`, `otp_codes` |
| `OtpPage` | 6-box verify + optional referral | `POST /auth/otp/verify` | `users`, `otp_codes`, `referral_rewards` |
| OtpPage | «ارسال دوباره کد» countdown | `POST /auth/otp/send` (rate-limited) | `otp_codes` |

### Customer app (`/app/*`)

| UI page / component | Element / action | API | Tables |
|---|---|---|---|
| `AppTopbar` | wallet chips (ریال / طلا) | `GET /wallets` | `wallets` |
| Topbar | bell + unread badge `۴` | `GET /notifications/unread-count`, popover `GET /notifications?per_page=5` | `notifications` |
| Topbar | avatar menu → Profile / KYC pill / Logout | `GET /auth/me`, `POST /auth/logout` | `users`, `sessions` |
| `DashboardPage` | KPIs, spot-7d, portfolio-30d, vault donut, ledger-5 | `GET /portfolio/summary`, `/pricing/history?1W`, `/portfolio/value-history?30`, `/wallets`, `/wallets/ledger?per_page=5`, `/trades?per_page=1` | `wallets`, `portfolio_lots`, `price_snapshots`, `trades` |
| Dashboard | KYC banner → `/app/kyc` | `GET /me/kyc` | `kyc_profiles` |
| `TradePage` | tabs خرید/فروش + mg/g input | client state | — |
| Trade | «دریافت قیمت» | `POST /trades/quote` | `trade_quotes` |
| Trade | `PriceQuoteBox` TTL countdown ۰:۱۸ | derived from `expires_at` | `trade_quotes` |
| Trade | mini 1D chart | `GET /pricing/history?range=1D` | `price_snapshots` |
| Trade | «تأیید معامله» (+ OTP step-up) | `POST /trades` | `trades`, `wallets`, `wallet_ledger`, `portfolio_lots` |
| Trade | `QuoteExpiredModal` «دریافت مجدد» | re-`POST /trades/quote` after `409` | `trade_quotes` |
| Trade | success → invoice modal | response payload | `invoices` |
| Trade | halt banner | `settings.trading_halt` via `/pricing/spot` | `settings` |
| `BuybackPage` | form + photo → «درخواست بازخرید» | `POST /uploads?context=buyback` + `POST /buyback-requests` | `files`, `buyback_requests` |
| `WalletPage` | IRR/gold cards + balance-90d chart | `GET /wallets`, `GET /wallets/balance-history?days=90` | `wallets`, `wallet_ledger` |
| Wallet | ledger + filters | `GET /wallets/ledger?direction=&reason=` | `wallet_ledger` |
| Wallet | «شارژ کیف پول» modal | `POST /wallets/deposit` → PSP redirect | `payments`, `wallet_ledger` |
| Wallet | «برداشت» modal + `OtpStepUpModal` | `POST /wallets/withdraw` (+ `/auth/otp/send?purpose=withdraw`) | `wallet_ledger`, `otp_codes` |
| `PortfolioPage` | summary + PnL-90d + lots table | `GET /portfolio/summary`, `/portfolio/pnl-history?90`, `/portfolio/lots` | `portfolio_lots`, `price_snapshots` |
| `AutoInvestPage` | plan cards, create, stop/edit switch | `GET/POST /auto-invest/plans`, `PATCH /{id}`, `DELETE` | `auto_invest_plans` |
| `InstallmentsPage` | contracts + progress | `GET /installments/contracts` | `installment_contracts` |
| Installments | «پرداخت قسط» modal | `POST /installments/contracts/{id}/payments` | `installment_payments`, `payments` |
| `PriceAlertsPage` | list + switch + delete + create | `GET/POST /pricing/alerts`, `PATCH/{id}`, `DELETE/{id}` | `price_alerts` |
| `CartPage` / `CartDrawer` | lines, qty stepper, remove | `GET /cart`, `PATCH /cart/lines/{id}`, `DELETE /cart/lines/{id}` | `cart_lines` |
| Cart | `PackagingPicker` per line | `PATCH /cart/lines/{id}` `{packaging}` | `cart_lines` |
| Cart | `CouponApplyModal` «اعمال» | `POST /cart/coupon` | `coupons`, `carts` |
| Cart | «مشاهده سبد» / empty illustration | `GET /cart` | `carts` |
| `CheckoutPage` | stepper سبد→ارسال→پرداخت | `GET /cart` + `GET /checkout/preview` | `carts` |
| Checkout | vault/delivery radios (KYC disables delivery) | preview param `fulfillment` | `kyc_profiles` (gate) |
| Checkout | `AddressModal` save | `POST /me/addresses` | `addresses` |
| Checkout | «پرداخت و ثبت سفارش» | `POST /checkout` | `orders`, `order_items`, `payments`, `invoices`, `shipments` |
| `OrdersPage` | status filters + table | `GET /orders?status=` | `orders` |
| `OrderDetailPage` | timeline, items, tracking | `GET /orders/{id}` | `orders`, `shipments`, `shipment_events` |
| OrderDetail | «لغو سفارش» (unpaid only) | `POST /orders/{id}/cancel` | `orders`, `products` (release) |
| OrderDetail | «دانلود فاکتور» / «تیکت» | `GET /invoices/{id}/pdf`; `POST /tickets` | `invoices`, `tickets` |
| `DeliveryPage` | vault→physical form + list | `GET/POST /deliveries` | `delivery_requests` |
| `InvoicesPage` | table + «چاپ»/«PDF» | `GET /invoices`, `GET /invoices/{id}/pdf` (print is client) | `invoices` |
| `InvoiceDetailPage` | legal preview | `GET /invoices/{id}` | `invoices`, `settings` (legal) |
| `GiftsPage` | send form → «ارسال هدیه» | `POST /gifts` | `gift_cards`, `wallet_ledger` |
| Gifts | «کپی کد» | client `—` | `gift_cards` |
| `ReferralsPage` | copy/share + stats + masked referees | `GET /me/referrals` (copy is client) | `users`, `referral_rewards` |
| `TicketsPage` | list + create modal | `GET /tickets`, `POST /tickets` | `tickets`, `ticket_messages` |
| `TicketDetailPage` | bubbles + «پاسخ» | `GET /tickets/{id}/messages`, `POST /tickets/{id}/messages` | `ticket_messages` |
| `NotificationsPage` | list, filters, mark read/all | `GET /notifications?type=`, `POST /{id}/read`, `POST /read-all` | `notifications` |
| `KycPage` | 3× FileDropzone → «ارسال مدارک» | `POST /me/kyc/documents` ×3 → `POST /me/kyc` | `kyc_documents`, `kyc_profiles`, `kyc_events` |
| Kyc | status timeline + reject banner | `GET /me/kyc` | `kyc_events` |
| `ProfilePage` | name/email «ذخیره» | `PATCH /me` | `users` |
| Profile | addresses CRUD + default | B2–B4 | `addresses` |
| Profile | notif-pref switches | `GET/PATCH /me/notification-preferences` | `notification_preferences` |

### Dealer

| UI | Action | API | Tables |
|---|---|---|---|
| `DealerDashboardPage` | spread/volume KPIs + bulk table | `GET /dealer/stats` | `dealer_orders`, `settings` |
| DealerDashboard | «سفارش عمده» | `POST /dealer/orders` | `dealer_orders` |
| `DealerBulkPage` | qty bars + delivery schedule | `GET /dealer/orders`, `GET /dealer/deliveries` | `dealer_orders` |

### Staff (`/staff/*`)

| UI | Action | API | Tables |
|---|---|---|---|
| `StaffDashboardPage` | queue counts + today-by-status bars | `GET /staff/dashboard` | `orders`, `kyc_profiles`, `tickets` |
| `StaffOrdersPage` | filters + table | `GET /staff/orders` | `orders` |
| StaffOrders | status dropdown / «ثبت رهگیری» modal | `PATCH /staff/orders/{id}/status` | `orders`, `shipments`, `shipment_events` |
| StaffOrders | «چاپ لیبل» | `window.print()` `—` | — |
| `StaffKycPage` | queue cards + docs | `GET /staff/kyc` | `kyc_profiles`, `kyc_documents` |
| StaffKyc | «تأیید» / `RejectKycModal` «رد مدارک» | `POST /staff/kyc/{id}/approve` / `reject {reason}` | `kyc_profiles`, `kyc_events`, `referral_rewards` |
| `StaffInventoryPage` | table + inline edit + low warnings | `GET /staff/inventory`, `PATCH /staff/inventory/{sku}` | `products`, `inventory_movements` |
| `StaffTicketsPage` | assign / reply / close | `GET /staff/tickets`, `PATCH /staff/tickets/{id}`, `POST /{id}/messages`, `POST /{id}/close` | `tickets`, `ticket_messages` |
| `StaffCustomersPage` | read-only search + open orders | `GET /staff/customers?q=` | `users`, `wallets`, `orders` |

### Admin (`/admin/*`)

| UI | Action | API | Tables |
|---|---|---|---|
| `AdminDashboardPage` | KPI row + **8 charts** + range 7/30/90 | `GET /admin/dashboard?range=` | aggregates over `orders`, `products`, `kyc_profiles`, `users`, `wallets`, `vault_lots`, `price_snapshots` |
| AdminDashboard | halt switch → `HaltTradingModal` (type HALT) | `POST /admin/pricing/halt {confirm_token}` | `settings`, `audit_logs` |
| AdminDashboard | spreads summary | from settings / `GET /admin/pricing` | `settings` |
| `AdminProductsPage` | table + ⋯ (publish/draft/delete) | `GET /admin/products`, `PATCH /{id}/status`, `DELETE /{id}` (`DeleteProductModal`) | `products` |
| AdminProducts | create/edit form + 360 dropzone | `POST/PUT /admin/products`, `POST /{id}/media` | `products`, `files` |
| `AdminCategoriesPage` | tree + add child + reorder + active | N3 endpoints | `categories` |
| `AdminInventoryPage` | stock table + solvency widget + «افزودن لات» | `GET /admin/inventory`, `GET /admin/solvency`, `POST /admin/vault-lots` | `products`, `vault_lots`, `inventory_movements` |
| `AdminPricingPage` | spot + stale + manual price | `GET /admin/pricing`, `POST /admin/pricing/spot` | `price_snapshots`, `settings` |
| AdminPricing | bid/ask bps save | `PATCH /admin/pricing/spread` | `settings` |
| AdminPricing | halt | `POST /admin/pricing/halt` | `settings`, `audit_logs` |
| `AdminOrdersPage` | advanced filters + CSV | `GET /admin/orders`, `GET /admin/orders/export.csv` | `orders` |
| `AdminPaymentsPage` | table + `RefundModal` | `GET /admin/payments`, `POST /{id}/refund` | `payments`, `payment_refunds`, `orders` |
| `AdminInvoicesPage` | search + PDF | `GET /admin/invoices?q=`, `/invoices/{id}/pdf` | `invoices` |
| `AdminCustomersPage` | table + drawer + «تغییر نقش» | `GET /admin/customers`, `GET /{id}`, `PATCH /{id}/role` | `users`, `wallets`, `audit_logs` |
| `AdminWalletsPage` | search → wallets + ledger | `GET /admin/wallets/search?q=` | `users`, `wallets`, `wallet_ledger` |
| AdminWallets | adjustment modal (sign + reason required) | `POST /admin/wallets/{user_id}/adjust` | `wallet_ledger`, `treasury_ledger`, `audit_logs` |
| `AdminPromotionsPage` | tabs + coupon form + toggle | `GET /admin/promotions`, `GET/POST /admin/coupons`, `PATCH /{id}` | `coupons`, `coupon_redemptions`, `gift_cards` |
| `ReportsPage` | range + per-report «خروجی CSV» | `GET /admin/reports/{key}?from&to&format` (client CSV today → wire) | same aggregates as dashboard |
| `AdminStaffPage` | list + invite + deactivate | `GET /admin/staff`, `POST /admin/staff/invites`, `PATCH /{id}/active` | `users`, `staff_invites`, `sessions` |
| `AdminSettingsPage` | every field → «ذخیره» | `GET/PATCH /admin/settings` | `settings`, `audit_logs` |
| AdminSettings | danger halt switch | `PATCH /admin/settings {trading_halt, confirm_token}` | `settings` |
| `AdminBroadcastPage` | form + «ارسال همگانی» confirm | `POST /admin/broadcasts` | `notifications` |
| `CommandPalette` (admin search) | users/orders/SKU jump | reuses `/admin/customers?q=`, `/admin/orders?q=`, `/admin/products?q=` | `users`, `orders`, `products` |

### Cross-cutting chrome

| UI | Action | API | Tables |
|---|---|---|---|
| Role guard (router) | `/app/*` guest → `/login`; wrong role → 403 page | `GET /auth/me` | `users` |
| `TradingHaltedBanner` / `StalePriceBanner` | reactive to spot payload | `GET /pricing/spot` | `settings`, `price_snapshots` |
| Offline toast «اتصال اینترنت» | navigator event, no API | `—` | — |
| `MaintenancePage` | boot check | `GET /system/state` | `settings` |

## 2. Endpoint count summary

| Module | Endpoints |
|---|---|
| A Auth | 8 | B Profile/KYC/Refs | 12 | C Pricing | 8 | D Catalog | 7 (+1 optional wishlist) |
| E Wallets | 5 | F Trading | 4 | G Portfolio/Invest | 9 | H Cart/Orders | 11 |
| I Invoices/Delivery | 5 | J Gifts | 3 | K Tickets | 5 | L Notifications+Dealer | 7 |
| M Staff | 14 | N Admin | ~30 | O System | 3 |
| **Total** | **≈ 130** |

## 3. Completeness audit & gap list

Audited every route (60+), modal, drawer, table action, filter, chart, and toast path against Parts 0–3.

**Fully covered (no gaps):** auth/OTP/step-up, catalog browsing/filtering/detail, pricing + alerts, wallets + ledger + deposit/withdraw, trade quote/TTL/409/OTP/halt/min-weight/insufficient-balance, buyback, cart/coupon/checkout (KYC gate, vault vs delivery), orders/cancel/timeline, invoices + PDF, delivery requests, gifts + redeem, referrals, tickets, notifications, dealer wholesale, staff queues (orders/KYC/inventory/tickets/customers/buybacks), all admin CRUD + 8-chart dashboard + refunds + adjustments + settings + broadcast + reports.

**Gaps found — UI stubs that MUST be wired to the documented endpoints:**

| # | UI element | Current behavior | Required backend (already specified) |
|---|---|---|---|
| 1 | `SizeGuidePage` «ذخیره سایز من» | toast-only | `POST /me/size-profile` → `size_profiles` (B8) |
| 2 | `LivePricesPage` «CSV» | client-built from fetched series | `GET /pricing/history.csv` for full-resolution (C4) |
| 3 | `ReportsPage` CSV buttons | client-built from dashboard data | `GET /admin/reports/{key}?format=csv` (N12) |
| 4 | `InvoiceDetailPage` «PDF» button | unbound `<Button>` (چاپ works via print) | `GET /invoices/{id}/pdf` stream (I3) |
| 5 | `AdminOrdersPage` CSV | client-built | `GET /admin/orders/export.csv` (N6) |
| 6 | Deposit modal | mock instant credit | PSP redirect + webhook completion loop (E3, O3) |
| 7 | `AdminDashboardPage` spread save shortcut | read-only display | `PATCH /admin/pricing/spread` exists (N5) |
| 8 | Referral reward on signup | mock gives nothing | `referral_rewards` pending → paid on KYC approval (A2, M5) |

**Deliberately excluded (documented as not-required unless product scope changes):**
- Wishlist endpoints (D7) — original spec mentioned a wishlist button; current UI does not implement it. Endpoints pre-specified for cheap addition.
- Impersonation — out of scope by product decision (§13 original spec).
- Dark mode / crypto checkout — out of scope.
- Websocket push — polling (`/notifications/unread-count` + spot every 15–60 s) is sufficient for v1; all endpoints are poll-friendly.

**Consistency verification performed:**
- Every `*Api.*` function in `src/api/index.ts` maps 1:1 to an endpoint in Parts 1–2 (checked against the 96 mock functions).
- Every field consumed by a page exists in both the TS types (§4) and a table column in Part 3 — including frozen invoice legal fields, shipment timeline labels, masked referee mobiles, and `AdminDashboardData`'s exact keys.
- Every enum in the UI (`OrderStatus`, `KycStatus`, `TicketStatus`, `GiftCardStatus`, …) matches a MySQL ENUM in Part 3 verbatim.
- Every Persian error string thrown by the mock appears in the §6 error registry with its HTTP status and UI reaction.

**Hand-off statement:** Parts 0–4 constitute a buildable backend contract — routes, request/response DTOs, validation, state machines (order/shipment/KYC/gift/installment), atomicity rules, background jobs, and schema — with zero undocumented behavior required by the shipped frontend.
