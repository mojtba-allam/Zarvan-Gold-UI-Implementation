# Zarvan Gold — UI ↔ API Mapping & Final Coverage Audit

## 1. UI → API → Entity mapping (every interactive element)

| UI Page / Component | Action | Endpoint | Method | DB Entity |
|---|---|---|---|---|
| `LivePriceTicker` (all layouts) | poll spot (5s), stale/halt badges | `/prices/spot` | GET | spot_price_snapshots, settings |
| Ticker «نمودار» / «معامله سریع» | navigate | — (client) | — | — |
| `StorefrontHeader` search | go to catalog `?q=` | `/products?q=` | GET | products |
| Header cart badge `۳` | load cart count | `/cart` | GET | cart_lines |
| `CartDrawer` mini lines / «مشاهده سبد» | load cart | `/cart` | GET | cart_lines |
| Header avatar mg chip | wallets | `/me/wallets` | GET | wallets |
| `LoginPage` ارسال کد | send OTP | `/auth/otp/send` | POST | auth_otps |
| Demo quick-login buttons | **dev-only** — remove in prod build | (mock) | — | users |
| `PasswordLoginPage` ورود / forgot | login; reset via OTP | `/auth/login`; `/auth/otp/send` | POST | users, auth_otps |
| `OtpPage` تأیید / resend / referral | verify (auto-register) | `/auth/otp/verify` | POST | users, wallets, referrals |
| Sidebar/Topbar «خروج» | logout | `/auth/logout` | POST | sessions |
| `AppTopbar` wallet chips | wallets | `/me/wallets` | GET | wallets |
| `AppTopbar` bell `۴` | unread count | `/me/notifications/unread-count` | GET | notifications |
| Avatar menu → Profile/KYC | routes | — | — | — |
| `HomePage` spot cards + sparklines | spot + 1D history | `/prices/spot`, `/prices/history?range=1D` | GET | spot_price_snapshots |
| HomePage featured products | list | `/products?per_page=4&sort=featured` | GET | products |
| HomePage bullion bid/ask table | spot | `/prices/spot` | GET | — |
| `CatalogPage` filters/sort/search/pagination | filtered list | `/products?type&karat&occ&q&in_stock&sort&page` | GET | products |
| Catalog empty state «محصولی با این فیلتر نیست» | same endpoint `data:[]` | GET | — |
| `ProductCard` «افزودن به سبد» | add line | `/cart/lines` | POST | cart_lines |
| `ProductDetailPage` gallery/360/lightbox | detail + media | `/products/{slug}`, `/products/{id}/media` | GET | products, product_media |
| PDP live quote / bid-ask / making breakdown | detail (server-computed) | `/products/{slug}` | GET | products, snapshots |
| PDP size selector + «ذخیره سایز» | save size | `PATCH /me/profile` (`preferred_size_mm`) | PATCH | users |
| PDP Add/Buy (خرید سریع) | add + go checkout | `/cart/lines` → `/orders` | POST | cart_lines, orders |
| PDP Reserve («پرداخت بیعانه») | reserve order w/ deposit | `POST /orders { mode: "reserve" }` *(see audit §3)* | POST | orders, payments |
| PDP Wishlist heart | toggle | `/me/wishlist/{id}` | POST/DELETE | wishlists |
| PDP Share | clipboard (client) | — | — | — |
| PDP OOS «مرا باخبر کن» | restock notify | `/products/{id}/notify-restock` | POST | restock_subscriptions |
| `ReserveProductModal` | deposit payment | `POST /orders{mode:reserve}` + `/wallets/deposit` | POST | orders, payments |
| `LivePricesPage` tabs + chart + legend | history both karats | `/prices/history?range&karat` ×2 | GET | spot_price_snapshots |
| LivePrices last-10 table | snapshots | `/prices/snapshots` | GET | spot_price_snapshots |
| LivePrices CSV (login) | export | `/prices/history.csv` | GET | — |
| LivePrices alert CTA | create alert | `/prices/alerts` | POST | price_alerts |
| `SizeGuidePage` tabs/slider/print | client + save size | `PATCH /me/profile` | PATCH | users |
| `ContactPage` ارسال | guest message | `/contact` | POST | contact_messages |
| `DashboardPage` KPIs/charts/ledger/shortcuts | aggregate | `/me/wallets`, `/me/portfolio`, `/prices/history?1W`, `/me/portfolio/pnl`, `/me/wallets/ledger?per_page=5`, `/trades?per_page=1` | GET | wallets, portfolio_lots, wallet_ledgers, trades |
| Dashboard KYC banner | from `/auth/me` | GET | users |
| `TradePage` خرید/فروش tabs, mg/g input | quote | `/quotes` | POST | trade_quotes |
| `PriceQuoteBox` TTL `0:18` | expires_at countdown (client) | — | — |
| TradePage دریافت قیمت / تأیید / لغو | confirm trade | `/quotes/{id}/confirm` (+otp sell) | POST | trades, wallets, wallet_ledgers, portfolio_lots, invoices |
| `QuoteExpiredModal` (409) «دریافت مجدد» | re-quote | `/quotes` | POST | trade_quotes |
| `OtpStepUpModal` (withdraw/sell) | send purpose OTP; inline verify | `/auth/otp/send`, code in target request | POST | auth_otps |
| Halt banner on Trade | from `/prices/spot` | GET | settings |
| Success invoice modal «فاکتور آماده است» | fetch invoice | `/me/invoices/{id}` | GET | invoices |
| TradePage history mini-table | list | `/trades` | GET | trades |
| `BuybackPage` wallet/physical + photo | buyback | `POST /uploads`, `/buybacks` | POST | buyback_requests, uploads |
| `WalletPage` cards + filters + 90d chart | wallets/ledger/history | `/me/wallets`, `/me/wallets/ledger`, `/me/wallets/balance-history` | GET | wallets, wallet_ledgers |
| WalletPage شارژ modal | deposit → PSP | `/me/wallets/deposit` | POST | payments, wallets |
| WalletPage برداشت modal + OTP | withdraw | `/me/wallets/withdraw` | POST | withdraw_requests, wallets |
| `PortfolioPage` KPIs/90d/lots | portfolio | `/me/portfolio`, `/me/portfolio/pnl`, `/me/portfolio/lots` | GET | portfolio_lots |
| `AutoInvestPage` create/stop/edit | plans CRUD | `/me/auto-invest/plans` (+PATCH/DELETE) | POST/PATCH/DELETE | auto_invest_plans |
| `InstallmentsPage` progress + «پرداخت قسط» | contracts + pay | `/me/installments`, `/me/installments/{id}/payments` | GET/POST | installment_contracts, installment_payments |
| `PriceAlertsPage` create/switch/delete | alerts CRUD | `/prices/alerts`, `/{id}/toggle`, DELETE | POST/PATCH/DELETE | price_alerts |
| `CartPage` qty/packaging/remove/coupon/summary | cart ops | `PATCH/DELETE /cart/lines/{id}`, `POST/DELETE /cart/coupon`, `GET /cart` | * | cart_lines, coupons |
| `CouponApplyModal` اعمال | apply code | `/cart/coupon` | POST | coupons, coupon_redemptions |
| `PackagingDrawer`/`PackagingPicker` تأیید | packaging | `PATCH /cart/lines/{id}` | PATCH | cart_lines |
| `CheckoutPage` stepper, vault/delivery, quote lock | place order | `/orders` | POST | orders, order_items, payments, invoices |
| `AddressModal` ذخیره (checkout + profile) | address upsert | `POST/PUT /me/addresses` | POST/PUT | addresses |
| Checkout KYC-disables-delivery | from `/auth/me` | GET | users |
| `OrdersPage` status filters → table | list | `/me/orders?status` | GET | orders |
| `OrderDetailPage` timeline/items/invoice/tracking | detail + shipment | `/me/orders/{id}`, `/me/orders/{id}/shipment` | GET | orders, shipments, shipment_events |
| OrderDetail «لغو» (if unpaid) | cancel | `/me/orders/{id}/cancel` | POST | orders, wallet_ledgers |
| OrderDetail «دانلود فاکتور» | PDF | `/me/invoices/{id}/pdf` | GET | invoices |
| OrderDetail «تیکت» | create ticket | `/me/tickets` | POST | tickets |
| `DeliveryPage` list + vault→physical form | delivery requests | `/delivery-requests`, `GET /me/delivery-requests` | POST/GET | delivery_requests, addresses |
| `InvoicesPage` table + PDF/چاپ | list + pdf | `/me/invoices`, `/me/invoices/{id}/pdf` | GET | invoices |
| `InvoiceDetailPage` preview | detail | `/me/invoices/{id}` | GET | invoices |
| `GiftsPage` buy/copy-code/sent-redeemed list | gifts | `/me/gifts`, `POST /me/gifts` | GET/POST | gift_cards, wallets |
| (recipient) redeem code | redeem | `/gifts/redeem` | POST | gift_cards |
| `ReferralsPage` copy/share + stats | stats | `/me/referrals` | GET | referrals, referral_rewards |
| `TicketsPage` list + create | tickets | `/me/tickets` | GET/POST | tickets, ticket_messages |
| `TicketDetailPage` thread + پاسخ | messages | `/me/tickets/{id}/messages` | GET/POST | ticket_messages |
| `NotificationsPage` read/mark-all/filters | notifications | `/me/notifications`, `/…/{id}/read`, `/…/read-all` | GET/POST | notifications |
| `KycPage` stepper uploads + submit + timeline + reject banner | KYC | `POST /uploads`, `POST /me/kyc`, `GET /me/kyc` | POST/GET | kyc_submissions, kyc_documents |
| `ProfilePage` save name/email, addresses CRUD, pref switches | profile | `PATCH /me/profile`, `/me/addresses` CRUD, `PUT /me/notification-preferences` | * | users, addresses, notification_preferences |
| `DealerDashboardPage` KPIs + bulk table | dealer | `/dealer/stats`, `/dealer/orders` | GET | bulk_orders |
| `DealerBulkPage` «سفارش عمده» + schedule | bulk create | `/dealer/orders` | POST | bulk_orders |
| `StaffDashboardPage` queues + bar chart | staff dash | `/staff/dashboard` | GET | orders, kyc_submissions, tickets |
| `StaffOrdersPage` filters/status/ثبت رهگیری/چاپ لیبل | status update + label | `PATCH /staff/orders/{id}/status`, `GET /staff/orders/{id}/label` | PATCH/GET | orders, shipments |
| `StaffKycPage` تأیید / رد (`RejectKycModal`) | review | `/staff/kyc/{id}/approve`, `/staff/kyc/{id}/reject` | POST | users, kyc_submissions |
| `StaffInventoryPage` inline edit + low-stock | adjust | `/staff/inventory`, `PATCH /staff/inventory/{sku}` | GET/PATCH | products, inventory_movements |
| `StaffTicketsPage` assign/reply/close | ticket ops | `PATCH /staff/tickets/{id}`, `POST /staff/tickets/{id}/messages` | PATCH/POST | tickets, ticket_messages |
| `StaffCustomersPage` read-only search | search | `/staff/customers?q` | GET | users, orders |
| `AdminDashboardPage` 8 charts + KPIs + range + halt + spreads | dashboard + settings | `/admin/dashboard?range`, `POST /admin/pricing/halt`, `PUT /admin/pricing/spread` | GET/POST/PUT | (aggregate), settings, pricing_events |
| `HaltTradingModal` type HALT «توقف» | halt w/ confirm text | `/admin/pricing/halt` | POST | settings |
| `AdminProductsPage` table/create/edit/publish/delete + 360 dropzone | products CRUD + media | `/admin/products` CRUD, `/publish`, `/unpublish`, `/restore`, `/media` | * | products, product_media |
| `DeleteProductModal` | soft delete | `DELETE /admin/products/{id}` | DELETE | products |
| `AdminCategoriesPage` tree/add-child/reorder/active | categories | `/admin/categories` CRUD, `PATCH …/reorder` | * | categories |
| `AdminInventoryPage` stock + vault lots + solvency | inventory | `/admin/inventory`, `POST /admin/inventory/vault-lots`, `GET /admin/inventory/solvency` | * | vault_lots, inventory_movements |
| `AdminPricingPage` manual spot + bps + halt + mini chart | pricing control | `/admin/pricing`, `POST /admin/pricing/spot`, `PUT /admin/pricing/spread`, halt | * | spot_price_snapshots, settings |
| `AdminOrdersPage` advanced filters + CSV + status tools | orders | `/admin/orders?format=csv`, `PATCH /staff/orders/{id}/status` | GET/PATCH | orders |
| `AdminPaymentsPage` table + `RefundModal` (sandbox badge) | refund | `/admin/payments`, `POST /admin/payments/{id}/refund` | GET/POST | payments, payment_refunds |
| `AdminInvoicesPage` search + PDF | invoices | `/admin/invoices`, `/invoices/{id}/pdf` | GET | invoices |
| `AdminCustomersPage` drawer + «تغییر نقش» | customers + role | `/admin/customers`, `PATCH /admin/users/{id}/role` | GET/PATCH | users, audit_logs |
| `AdminWalletsPage` search/ledger + adjustment modal (reason) | wallet ops | `/admin/wallets?q`, `/admin/wallets/{uid}/ledger`, `POST /admin/wallets/{uid}/adjust` | GET/POST | wallets, wallet_ledgers |
| `AdminPromotionsPage` tabs + coupon form | promos | `/admin/coupons` CRUD, `/admin/gifts`, `/admin/referrals/stats`, `/admin/cashback/stats` | * | coupons, gift_cards, referrals |
| `ReportsPage` range + CSV exports + progress toast | reports | `/admin/reports?from&to`, `/admin/reports/*.csv` | GET | (aggregate) |
| `AdminStaffPage` invite + deactivate | staff mgmt | `/admin/staff`, `POST /admin/staff/invite`, `/admin/staff/{id}/deactivate` | * | users, staff_invites |
| `AdminSettingsPage` all fields + danger halt | settings | `GET/PATCH /admin/settings` | * | settings, audit_logs |
| `AdminBroadcastPage` «ارسال همگانی» confirm | broadcast | `/admin/broadcast` | POST | broadcasts, notifications |
| `Error403/404/500/Maintenance` | error mapping | 403/404/500/503 responses | — | — |
| Global offline toast | `navigator.onLine` | client-only | — | — |

## 2. Auth & authorization coverage (recap of Part 0 §4)

- Public: pricing (spot/history/snapshots/CSV is auth), catalog read, auth endpoints, contact, health.
- Customer: own-scope only; KYC gates: delivery fulfillment, withdraw, unverified trade cap.
- Dealer: customer + `/dealer/*`.
- Staff: §M only; refunds/roles/settings/pricing → 403.
- Admin: everything; self-guard rules (last admin, self-deactivate) → 422.
- Forced logout on 401 (UI `client` intercepts; toast «نشست منقضی شد»).

## 3. Final audit — gaps & backend work the UI implies but has no mock yet

These are **not** missing UI features; they are backend requirements discovered while auditing every interaction:

1. **Reservation deposit (`ReserveProductModal`)** — needs `POST /orders { "mode": "reserve" }` creating a `paid`-partial order (`orders.deposit_irr` column recommended) with 72h hold + auto-release job. Mock currently fakes it client-side.
2. **Deposit redirect loop** — `WalletPage` deposit must return `redirect_url` and the SPA needs a `/wallet/callback?status=` route to poll `GET /me/wallets` until the webhook lands (polling 2s×30 then «در حال پردازش» toast).
3. **Checkout reprice conflict** — spec a 409 variant `REPRICE_REQUIRED` returning new line totals so Checkout can re-render the summary before retry (UI currently assumes prices stable within lock window).
4. **Invoice PDF bytes** — UI links assume `GET …/pdf`; backend must generate (dompdf) and cache `invoices.pdf_path`.
5. **Order label PDF** for «چاپ لیبل» (`GET /staff/orders/{id}/label`).
6. **360 frames storage** — 36 frames × products; recommend WebP + sprite fallback; `has_360` computed from `product_media.kind='frame_360'` count ≥ 12.
7. **Gift redemption by recipient** — recipient flow (SMS link → `/gifts/redeem`) is defined in Part 1 §I1 but has no UI screen yet (recipient is an external mobile); backend must still implement + a minimal claim page is a v1.1 UI item.
8. **Wishlist page** — heart toggle exists on PDP; a `/me/wishlist` list screen is not in the sitemap (API defined; UI deferred, acceptable).
9. **Cashback tab** (`AdminPromotionsPage`) — `GET /admin/cashback/stats` defined; cashback accrual engine (bps of trade volume per customer tier) is a backend policy decision to pin down.
10. **Demo quick-login buttons** on `LoginPage` are development-only; backend must **not** ship an equivalent endpoint — gate behind `APP_ENV=local`.
11. **OTP dev bypass** (`000000` rejected, others accepted) is mock behavior; production verifies real SMS codes only.
12. **`STALE_PRICE`** is a 200-with-metadata condition (`stale_seconds`), never an error status — documented to avoid backend inventing a 4xx for it.
13. **CSV endpoints** — UI currently serializes client-side from list payloads; backend CSV endpoints (§N6, §N12, C4) are still required for large datasets and are specced.
14. **Notification transports** — SMS/email fan-out honoring `notification_preferences` (incl. `broadcasts.channels` intersection) is a backend queue job; UI only persists preferences.
15. **Solvency computation** must run on a materialized view (vault_lots Σ + melted pool vs Σ gold wallets + vaulted order items) refreshed per trade — the 96.3% gauge is read-only UI.

## 4. Consistency statement

Every `*Api.*` call in `src/api/index.ts` maps 1:1 to an endpoint in Parts 1–2, every response field consumed by a page exists in the §4 type definitions (`src/types/index.ts`) and in the table columns of Part 3, and every table in Part 3 is referenced by at least one endpoint. Persian strings shown in error examples are the exact `ApiError` messages the UI toasts.
