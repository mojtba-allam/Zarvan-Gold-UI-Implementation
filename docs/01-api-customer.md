# Zarvan Gold — Backend API Specification · Part 1: Public, Customer & Dealer

Conventions from `00-api-foundation.md` apply. `A:` = auth required, `P:` = public.

---

## Module A — Authentication

### A1. Send OTP — `P:` `POST /auth/otp/send`
**UI:** `LoginPage` (ارسال کد تأیید), `OtpPage` (ارسال دوباره), `OtpStepUpModal` (resend), `PasswordLoginPage` (forgot → OTP).

| | |
|---|---|
| Body | `{ "mobile": "09121234567", "purpose": "login" }` — `purpose` ∈ `login \| withdraw \| trade \| reset` (default `login`) |
| Validation | `mobile` Iran regex; rate limit 5/10min per mobile+purpose → 429 `OTP_RATE_LIMITED` |
| Success | `200 { "data": { "ok": true, "expires_in": 120 } }` — code sent via SMS; **never** return the code in prod (dev env may include `data.debug_code`) |
| Errors | 422 `VALIDATION_FAILED`; 429 `OTP_RATE_LIMITED` |
| Tables | `auth_otps` (mobile, purpose, code_hash, attempts, expires_at, consumed_at) |

### A2. Verify OTP (login or register) — `P:` `POST /auth/otp/verify`
**UI:** `OtpPage` (تأیید کد + optional referral).

| | |
|---|---|
| Body | `{ "mobile": "09121234567", "code": "123456", "referral_code": "ZARV-9K2P" }` |
| Validation | code 6 digits, not expired (10 min), attempts ≤ 5 else burn code |
| Logic | If no user for mobile → create (`role=customer`, `kyc_status=unverified`, wallets `irr`+`gold_mg` at 0, unique `referral_code`). If `referral_code` valid → row in `referrals` + reward `pending`. Issue token pair. |
| Success | `200 { "data": { "token": "...", "refresh_token": "...", "user": { ...User } } }` |
| Errors | 422 `OTP_INVALID` («کد واردشده نامعتبر است»), 409 `OTP_EXPIRED` |
| Tables | `auth_otps`, `users`, `wallets`×2, `referrals`, `referral_rewards` |

### A3. Password login — `P:` `POST /auth/login`
**UI:** `PasswordLoginPage`. Body `{ "mobile", "password" }` → 200 token pair + user; 422 `CREDENTIALS_INVALID` («شماره موبایل یا رمز عبور نادرست است»); 429 after 5 fails/10min. Table `users`.

### A4. Set / reset password — `A:` `PUT /auth/password`
**UI:** forgot-password flow (OTP then new password). Body `{ "mobile", "otp_code" (purpose=reset), "password" }`. 200 `{data:{ok:true}}`; 409 `OTP_EXPIRED/OTP_INVALID`; 422 weak password. Table `users`.

### A5. Refresh — `P:` `POST /auth/refresh` — cookie `zarvan_refresh` → new pair (rotation).

### A6. Logout — `A:` `POST /auth/logout` — revokes access+refresh. **UI:** sidebar «خروج», avatar menu.

### A7. Me — `A:` `GET /auth/me`
**UI:** `AuthProvider` boot; role drives routing/guards; `kyc_status` drives banners (KYC info banner on Dashboard, delivery-disable in Checkout).
Response `User`: `{ id, name, mobile, email, role, kyc_status, referral_code, created_at }`. Cheap endpoint.

---

## Module B — Profile, Addresses, Preferences, KYC, Referrals

### B1. Update profile — `A:` `PATCH /me/profile`
**UI:** `ProfilePage` (ذخیره). Body `{ "name": "سارا کریمی", "email": "sara@..." }`. `mobile` is read-only in UI → 422 if sent. 200 updated `User`. Table `users`.

### B2. Addresses CRUD — `A:`
- `GET /me/addresses` → `{ data: Address[] }` (UI: ProfilePage, CheckoutPage)
- `POST /me/addresses` / `PUT /me/addresses/{id}` — body `{ title, province, city, line1, postal_code, is_default }`; setting `is_default` unsets others (transaction). Validation: all required, `postal_code` `^\d{10}$`.
- `DELETE /me/addresses/{id}` — 409 `ADDRESS_REQUIRED` if it's the only one and an active delivery order references it.
**UI:** `AddressModal` (ذخیره), list delete. Table `addresses`.

### B3. Notification preferences — `A:`
- `GET /me/notification-preferences` → `NotificationPreferences { sms, email, in_app, price_alerts }`
- `PUT /me/notification-preferences` — **UI:** `ProfilePage` switches. Table `notification_preferences` (1:1 user).

### B4. KYC — `A:`
- `GET /me/kyc` → `{ data: { status, submitted_at, reviewed_at, reject_reason, documents: [{type, url(signed), uploaded_at}] , timeline: [{at,label}] } }` **UI:** `KycPage` stepper + status timeline + reject banner.
- `POST /me/kyc` — multipart: `id_front`, `id_back`, `selfie` (file ids from `POST /uploads`, type=`kyc_document`). Sets `users.kyc_status=pending`, `kyc_submissions.submitted_at=now`. 200 `{data:{status:"pending"}}`; 409 `KYC_PENDING` if already pending. Tables `kyc_submissions`, `kyc_documents`.
- *Staff side in Part 2 (approve/reject).*

### B5. Referrals — `A:` `GET /me/referrals`
**UI:** `ReferralsPage` (code copy/share, stats, masked referees).
```json
{ "data": { "code": "ZARV-9K2P", "invited_count": 3, "gold_earned_mg": 1500,
  "referees": [ { "mobile_masked": "0912***4567", "joined_at": "2026-03-02T10:00:00Z" } ] } }
```
Tables `referrals`, `referral_rewards` (status `pending|paid`). Masking is server-side.

---

## Module C — Pricing (public core of storefront)

### C1. Spot — `P:` `GET /prices/spot`
**UI:** `LivePriceTicker` (all layouts), `HomePage` spot cards, `TradePage`, `WalletPage` gold valuation, `AdminPricingPage`.
```json
{ "data": [
  { "karat": 18, "price_irr_per_gram": 3520000, "bid_irr": 3502400, "ask_irr": 3537600,
    "change_pct_24h": 0.8, "observed_at": "2026-08-13T09:42:11Z", "stale_seconds": 42, "trading_halt": false },
  { "karat": 24, "price_irr_per_gram": 4690000, "bid_irr": 4666550, "ask_irr": 4713450,
    "change_pct_24h": 0.6, "observed_at": "2026-08-13T09:42:11Z", "stale_seconds": 42, "trading_halt": false }
] }
```
- `bid/ask` derived from `settings.bid_bps/ask_bps` around spot.
- `stale_seconds ≥ 60` → UI amber «تأخیر در قیمت» (`StalePriceBanner`); `trading_halt` → red `TradingHaltedBanner`, trade disabled (backend also enforces 423 on quote/confirm).
- Cache ≤ 5s. Table `spot_price_snapshots`.

### C2. History — `P:` `GET /prices/history?range={1D|1W|1M|90D|1Y}&karat={18|24}`
**UI:** `LivePricesPage` area chart + tabs, `TradePage` mini chart, `HomePage` sparklines, admin charts.
`200 { "data": [ { "t": "2026-08-13T09:00:00Z", "price_irr": 3518000 }, ... ] }` — downsampled (1D: 5-min, 1W/1M: hourly, 90D/1Y: daily). Invalid range → 400. Table `spot_price_snapshots`.

### C3. Snapshots — `P:` `GET /prices/snapshots?karat=18&limit=10`
**UI:** `LivePricesPage` «last 10 snapshots» table. `200 { data: [{ id, t, price_irr, bid_irr, ask_irr }] }`.

### C4. CSV export — `A:` `GET /prices/history.csv?range=1M&karat=18`
**UI:** LivePricesPage «CSV (login)». 200 `text/csv` stream.

### C5. Price alerts — `A:`
- `GET /prices/alerts` → `PriceAlert[]`
- `POST /prices/alerts` — `{ karat, direction: "above"|"below", threshold_irr, is_active }`; max 20 per user → 422.
- `PATCH /prices/alerts/{id}/toggle`, `DELETE /prices/alerts/{id}`
**UI:** `PriceAlertsPage` (create/switch/delete). Cron checks on each snapshot insert → fires notification + SMS per preferences. Table `price_alerts`.

---

## Module D — Catalog

### D1. Product list — `P:` `GET /products`
**UI:** `CatalogPage` (grid, filters, sort, pagination, skeletons, empty «محصولی با این فیلتر نیست»), `HomePage` 4 cards.

| Query | Type | Notes |
|---|---|---|
| `type` | `jewelry\|bar\|coin\|melted` | |
| `karat` | `18\|24` | |
| `occ` (occasion) | string | exact match on `products.occasion` (UI chips: هدیه، نامزدی، ازدواج، جهیزیه) |
| `in_stock` | `1` | `stock_on_hand > 0` |
| `q` | string | name/sku ILIKE |
| `sort` | `featured\|-price\|price\|-weight\|-created_at` | default `featured` |
| `page`, `per_page` | | default 15 |

Response item = `Product` (§4.3 of UI types) **plus live** `quote_irr` (= ask price for weight + making charge), `bid_irr`, `ask_irr` computed from current spot — never hardcoded. Only `status=active` + `published_at ≤ now` for guests; empty result → 200 `data:[]`.
Tables `products`, `categories`, spot snapshot.

### D2. Product detail — `P:` `GET /products/{slug}`
**UI:** `ProductDetailPage` (gallery, 360, making breakdown, live quote, bid/ask, stock, tabs).
Returns full `Product` incl. `description`, `attributes`, `images[]`, `has_360`, `stock_on_hand`, `making_charge_type/irr`, `quote_irr`, `bid_irr`, `ask_irr`, category breadcrumb. 404 `NOT_FOUND` for unknown slug (UI → 404 page).

### D3. Product media / 360 frames — `P:` `GET /products/{id}/media?kind=360`
**UI:** `ProductGallery360` (drag/zoom), `ImageLightbox`. `{ data: [{ id, url, kind: "photo"|"frame_360", sort }] }` — 360 = ordered frames (≤36).

### D4. Categories — `P:` `GET /categories`
**UI:** catalog type filters, admin tree. Nested `{ data: Category[] }` with `children`. Only `is_active` for guests. Table `categories`.

### D5. Wishlist — `A:`
- `GET /me/wishlist` → product ids + minimal product objects
- `POST /me/wishlist/{product_id}` (idempotent 200/201), `DELETE /me/wishlist/{product_id}`
**UI:** ProductDetail «افزودن به علاقه‌مندی» heart toggle. Table `wishlists` (pivot).

### D6. Out-of-stock notify — `A:` `POST /products/{id}/notify-restock`
**UI:** ProductDetail OOS state («مرا باخبر کن»). Table `restock_subscriptions`. 200 `{data:{ok:true}}`; fires notification when `stock_on_hand` goes >0.

---

## Module E — Wallets & Ledger

### E1. Wallets — `A:` `GET /me/wallets`
**UI:** `WalletCard` (Dashboard, WalletPage, Topbar chips `۲۵٬۰۰۰٬۰۰۰` ریال / `۱۲٬۴۵۰ mg`).
`{ data: [ { id, currency: "irr"|"gold_mg", balance: 25000000, updated_at }, { ..., "gold_mg", 12450 } ] }`. Tables `wallets` (balances are source of truth; ledger is append-only).

### E2. Ledger — `A:` `GET /me/wallets/ledger?currency=&direction=&from=&to=&page=`
**UI:** WalletPage ledger table + filters, Dashboard last-5 rows, `LedgerRow`.
Item: `LedgerEntry { id, direction: credit|debit, amount, reason, balance_after, reference_type, reference_id, created_at }`. Sort `-created_at` fixed. Table `wallet_ledgers`.

### E3. Deposit — `A:` `POST /me/wallets/deposit`
**UI:** WalletPage «شارژ کیف پول» modal.
Body `{ "amount_irr": 5000000 }` → creates `payments(status=pending, driver=sandbox-psp)` + `orders`-less payment row → `200 { data: { payment_id, redirect_url } }` (UI opens PSP; sandbox badge in non-prod). PSP success webhook credits wallet + ledger row `reason=deposit`. Failure → `payments.status=failed`, no credit. Tables `payments`, `wallets`, `wallet_ledgers`.

### E4. Withdraw — `A:` `POST /me/wallets/withdraw`  ⚠ sensitive
**UI:** WalletPage برداشت modal + `OtpStepUpModal`.
Body `{ "amount_irr", "iban": "IR062960000000100324200001", "otp_code" }` (+ `Idempotency-Key`).
Validation: OTP valid for `purpose=withdraw` (409 `OTP_REQUIRED`/422 `OTP_INVALID`), balance check (409 `INSUFFICIENT_BALANCE` «موجودی کافی نیست»), KYC `approved` (409 `KYC_REQUIRED`), IBAN regex.
Success: debit inside transaction, ledger row, `withdraw_requests` row `processing` (payout batch). 200 updated wallets. Tables `wallets`, `wallet_ledgers`, `withdraw_requests`.

### E5. Balance 90d series — `A:` `GET /me/wallets/balance-history?days=90`
**UI:** WalletPage area chart. `{ data: SeriesPoint[] }` (daily closing `irr` balance). Materialized from ledger nightly or computed on the fly (≤90 rows).

---

## Module F — Trading (melted gold) & Buyback

### F1. Create quote — `A:` `POST /quotes`
**UI:** `TradePage` (دریافت قیمت), `PriceQuoteBox` with TTL countdown `0:18`.
Body `{ "side": "buy"|"sell", "weight_mg": 5000 }`.
Validation: `weight_mg ≥ settings.min_trade_mg`; trading halt → 423 `TRADING_HALTED`; unverified cap → 409 `DAILY_CAP_UNVERIFIED`; sell: gold balance check happens at confirm.
```json
{ "data": { "id": 88, "side": "buy", "weight_mg": 5000, "spot_irr": 3520000,
  "spread_bps": 50, "irr_amount": 17688000, "expires_at": "2026-08-13T09:42:31Z" } }
```
`expires_at = now + settings.quote_ttl_seconds` (default 20s). Table `trade_quotes` (stores snapshot spot+spread for audit).

### F2. Confirm trade — `A:` `POST /quotes/{id}/confirm`
**UI:** TradePage «تأیید» (+ `OtpStepUpModal` for sell), `QuoteExpiredModal` on 409.
Body `{ "otp_code" }` — **required when `side=sell`** (409 `OTP_REQUIRED`); buy deducts IRR wallet.
- If `now > expires_at` → **409 `QUOTE_EXPIRED`** «نقل‌قول منقضی شده است» → UI modal «دریافت مجدد».
- Buy: insufficient IRR → 409 `INSUFFICIENT_BALANCE`; sell: insufficient mg → 409 `INSUFFICIENT_GOLD`.
- Success: atomic tx — move money↔gold between user wallet and house wallet, append 2 ledger rows, insert `trades(status=filled, slippage_bps)`, `portfolio_lots` row (buy) or lot consumption FIFO (sell), create `invoices` row («فاکتور آماده است» toast), notification.
```json
{ "data": { "id": 41, "quote_id": 88, "side": "buy", "status": "filled", "weight_mg": 5000,
  "irr_amount": 17688000, "spot_irr": 3520000, "slippage_bps": 2, "filled_at": "..." , "invoice_id": 12 } }
```
Rejection path (risk rules) → `status=rejected`, funds never move, 200 with rejected trade + reason. Tables `trade_quotes`, `trades`, `wallets`, `wallet_ledgers`, `portfolio_lots`, `invoices`.

### F3. Trade history — `A:` `GET /trades?side=&from=&to=&page=`
**UI:** TradePage history mini-table, Dashboard «آخرین معامله». Item `Trade`. Table `trades`.

### F4. Buyback request — `A:` `POST /buybacks`
**UI:** `BuybackPage` (wallet vs physical, weight, notes, photo via uploads).
Body `{ "source": "wallet"|"physical", "weight_mg", "notes", "photo_id" }`.
- `wallet`: instant quote at current **bid**, auto-fill if ≥ min (same atomic flow as F2 sell, status `filled`); else 409.
- `physical`: creates `buyback_requests(status=pending)` for staff appraisal → 201.
Tables `buyback_requests`, + wallet/trade tables for wallet source.

---

## Module G — Cart, Checkout, Orders, Shipments, Invoices

### G1. Cart — `A:`
- `GET /cart` → single active `Cart` (or auto-create empty) incl. `lines[]` with embedded `product`, `unit_quote_irr` recomputed at read time from live ask, `subtotal_irr`, `discount_irr`, `total_irr`, `quote_expires_at` (price-lock window `settings.cart_quote_ttl`, default 300s). **UI:** `CartDrawer`, `CartPage`.
- `POST /cart/lines` `{ "product_id", "qty" }` — stock check → 409 `OUT_OF_STOCK` / `MAX_QTY_EXCEEDED`; toast «افزوده شد به سبد».
- `PATCH /cart/lines/{id}` `{ "qty" }` or `{ "packaging": "standard"|"luxury" }` — luxury adds `settings.luxury_packaging_irr` (UI `PackagingPicker`/`PackagingDrawer`).
- `DELETE /cart/lines/{id}`.
- `POST /cart/coupon` `{ "code" }` — validates active/uses/expiry/`min_order_irr` → 422/409 `COUPON_INVALID` «کد تخفیف نامعتبر»; success recomputes `discount_irr`. `DELETE /cart/coupon`.
Table `cart_lines` (one active cart per user), `carts`, `coupon_redemptions` reserved at checkout.

### G2. Place order — `A:` `POST /orders`
**UI:** `CheckoutPage` (stepper سبد→ارسال→پرداخت, vault/delivery radios, `AddressModal`, quote lock, KYC disables delivery).
Body `{ "fulfillment": "vault"|"delivery", "address_id"?, "notes"? }` (+ optional `coupon_code` re-validation).
Rules: non-empty cart (422), delivery requires `address_id` (422 `ADDRESS_REQUIRED`) and `kyc_status=approved` (409 `KYC_REQUIRED`), re-price lines at confirm — if any line price moved >`settings.reprice_tolerance_bps` → 409 `QUOTE_EXPIRED`-style reprice response with new totals (UI re-renders summary).
Payment: if IRR wallet balance ≥ total → auto-debit (ledger), order `paid`; else order `awaiting_payment` + `payments(pending)` + `redirect_url` (PSP).
Vault fulfillment → gold stays in vault: `order_items.vaulted=true`, solvency liability recorded.
`201 { data: Order }` incl. `number` `ZRVORD-2026-0901`. Cart status → `converted`. Tables `orders`, `order_items`, `payments`, `wallet_ledgers`, `invoices` (issued on paid).

### G3. Orders — `A:`
- `GET /me/orders?status=&page=` — **UI:** `OrdersPage` (status filter chips → table → detail).
- `GET /me/orders/{id}` → `Order` with `items[]`, `shipment` (+ `timeline`), `invoice`. **UI:** `OrderDetailPage`.
- `POST /me/orders/{id}/cancel` — only when `status ∈ awaiting_payment|paid(unfulfilled)`; else 409 `ORDER_NOT_CANCELLABLE`. Refund to IRR wallet + ledger (async for card payments). **UI:** OrderDetail «لغو» (if unpaid).
Table `orders`.

### G4. Shipment tracking — `A:` `GET /me/orders/{id}/shipment`
**UI:** `OrderDetailPage` `Timeline`, `DeliveryPage` list. `Shipment { carrier, tracking_code, status, timeline[{at,label}], shipped_at, delivered_at }`. Carrier webhook appends `shipment_events`.

### G5. Vault → physical delivery — `A:` `POST /delivery-requests`
**UI:** `DeliveryPage` form (mg, address, 5/10/50g bar denominations).
Body `{ "weight_mg", "address_id", "bar_preference": "5g"|"10g"|"50g"|"any" }` — gold balance check, KYC required, creates `delivery_requests(status=pending)` + debits gold on dispatch (staff). 201.

### G6. Invoices — `A:`
- `GET /me/invoices?page=` — **UI:** `InvoicesPage` table (number/date/gold/IRR, PDF/چاپ).
- `GET /me/invoices/{id}` — **UI:** `InvoiceDetailPage` legal preview. `Invoice { id, number: "ZRV-2026-00012", issued_at, total_irr, gold_mg, order_id, legal: {...settings.invoice_legal}, lines[] }`.
- `GET /me/invoices/{id}/pdf` — 200 `application/pdf` (wkhtmltopdf/dompdf server-side).

---

## Module H — Investment, Auto-invest, Installments

### H1. Portfolio — `A:`
- `GET /me/portfolio` → `PortfolioSummary { cost_irr, market_irr, pnl_irr, pnl_pct, gold_mg }` — market value from live 18k bid. **UI:** `PortfolioPage` KPIs, Dashboard PnL.
- `GET /me/portfolio/lots` → `PortfolioLot[]` (FIFO lots incl. trade-origin and order-origin). **UI:** lots table.
- `GET /me/portfolio/pnl?days=90` → `SeriesPoint[]`. **UI:** PnL 90d chart.
Tables `portfolio_lots`, spot snapshots.

### H2. Auto-invest plans — `A:`
- `GET /me/auto-invest/plans`, `POST` `{ "amount_irr", "day_of_month" }` (1..28), `PATCH /{id}` `{ amount_irr?, day_of_month?, is_active }`, `DELETE /{id}`.
**UI:** `AutoInvestPage` (create/stop/edit cards). Scheduler executes monthly as an internal buy at then-spot (creates `trades` + lot); insufficient IRR → skipped + notification. Table `auto_invest_plans`.

### H3. Installments — `A:`
- `GET /me/installments` → `InstallmentContract[] { id, months, down_irr, principal_irr, paid_irr, remaining_irr, status }`. **UI:** `InstallmentsPage` progress bars.
- `POST /me/installments` `{ "months": 3|6|12, "down_irr" }` — application; down payment charged immediately.
- `POST /me/installments/{id}/payments` `{ "amount_irr", otp_code? }` — **UI:** «پرداخت قسط» modal. 409 `INSUFFICIENT_BALANCE`. Tables `installment_contracts`, `installment_payments`.

---

## Module I — Promotions: Gifts, Coupons (customer side)

### I1. Gift cards — `A:`
- `GET /me/gifts` → `GiftCard[] { code, recipient_mobile, gold_mg, status: created|sent|redeemed, packaging, message }`.
- `POST /me/gifts` `{ "recipient_mobile", "gold_mg", "packaging", "message" }` — deducts gold from sender wallet (409 `INSUFFICIENT_GOLD`), creates code `GFT-XXXXXX`, SMS to recipient. **UI:** `GiftsPage` (buy + کپی کد).
- `POST /gifts/redeem` `{ "code" }` (recipient, auth) — 409 `GIFT_NOT_FOUND`/`GIFT_ALREADY_REDEEMED`; credits recipient gold wallet; physical packaging → creates `delivery_requests`.
Tables `gift_cards`, wallet/ledger.

### I2. Coupon redemption — only via cart (§G1). Customer never lists coupons.

---

## Module J — Support: Tickets & Contact

### J1. Tickets — `A:`
- `GET /me/tickets` — **UI:** `TicketsPage` list.
- `POST /me/tickets` `{ "subject", "type": "general"|"price_match"|"delivery"|"kyc", "body" }` — creates open ticket + first message. **UI:** create form.
- `GET /me/tickets/{id}/messages` → `TicketMessage[] { id, body, is_staff, created_at }`. **UI:** `TicketDetailPage` bubbles.
- `POST /me/tickets/{id}/messages` `{ "body" }` — reopens if closed. Tables `tickets`, `ticket_messages`.

### J2. Contact (guest) — `P:` `POST /contact`
**UI:** `ContactPage` (name, mobile, message; ارسال + toast). Body `{ name, mobile, message }` → stores `contact_messages`, optional internal ticket. 422 validation.

---

## Module K — Notifications

- `GET /me/notifications?page=&unread=1` — **UI:** `NotificationsPage`, Topbar bell unread `۴` (`unread()` count → `GET /me/notifications/unread-count` lightweight `{data:{count:4}}`).
- `POST /me/notifications/{id}/read`, `POST /me/notifications/read-all`.
- Item `AppNotification { id, type, title, body, data?, read_at, created_at }`. `type` ∈ `trade_filled|price_alert|kyc_approved|kyc_rejected|order_status|payment|gift_received|auto_invest|broadcast|system`.
**UI:** mark read / mark all / filters. Table `notifications`.

---

## Module L — Dealer (wholesale)

### L1. Dealer stats — `A:`(dealer) `GET /dealer/stats`
**UI:** `DealerDashboardPage` (wholesale spread KPIs). `{ data: { spread_bps_wholesale, volume_mg_30d, open_bulk_orders, settlement_irr_30d, spot_bid_24k } }`.

### L2. Bulk orders — `A:`(dealer)
- `GET /dealer/orders?page=` — **UI:** bulk orders table (both dealer pages).
- `POST /dealer/orders` `{ "items": [ { "product_id"|"sku", "qty_mg"|"qty" } ], "delivery_date", "address_id" }` — wholesale quote at `spot − dealer_spread_bps`, min 500,000 mg per order → 422. Status flow `pending_approval → confirmed → settled`. **UI:** `DealerBulkPage` «سفارش عمده».
Table `bulk_orders`, `bulk_order_items`.

---

## 9. Public-vs-auth quick reference

| Public (no token) | Authenticated |
|---|---|
| `GET /prices/spot`, `/prices/history`, `/prices/snapshots`, `GET /products`, `/products/{slug}`, `/products/{id}/media`, `GET /categories`, `POST /auth/*`, `POST /contact` | everything under `/me/*`, `/cart`, `/orders`, `/quotes`, `/trades`, `/dealer/*`, notifications, alerts, wishlist |
