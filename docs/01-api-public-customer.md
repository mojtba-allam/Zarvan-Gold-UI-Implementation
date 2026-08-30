# Zarvan Gold — Backend API Specification · Part 1: Public, Customer & Dealer

> Conventions, envelope, auth, and error registry: see `00-foundation.md`.
> `★` = requires Bearer token. Role tags: **C** customer, **D** dealer, **S** staff, **A** admin.

---

## Module A — Authentication (public)

### A1. Send OTP — `POST /auth/otp/send`
**UI:** `LoginPage` → «ارسال کد تأیید»; `OtpStepUpModal` → «ارسال دوباره»; `PasswordLoginPage` → forgot password.
**Body:** `{ "mobile": "09121234567", "purpose": "login" }` (`purpose ∈ login|withdraw|trade`, default `login`)
**Validation:** `mobile` regex `^09\d{9}$`. Rate limit 3/min (§9 foundation).
**Success 200:** `{ "data": { "ok": true, "expires_in_sec": 300 } }`
**Errors:** `422 VALIDATION_ERROR`; `429 RATE_LIMITED` (`Retry-After`).

### A2. Verify OTP (login or register) — `POST /auth/otp/verify`
**UI:** `OtpPage` → «تأیید کد» (optional referral field).
**Body:** `{ "mobile": "09121234567", "code": "482913", "referral_code": "ZARV-9K2P" }` (`referral_code` optional; ignored if invalid)
**Success 200:**
```json
{ "data": {
  "user": { "id": 1, "name": "سارا کریمی", "mobile": "09121234567", "email": "sara@example.com",
            "role": "customer", "kyc_status": "approved", "referral_code": "ZARV-9K2P",
            "created_at": "2025-12-02T10:12:00Z" },
  "token": "eyJ…", "refresh_token": "rt_…"
} }
```
**Behavior:** unknown mobile → create account (`role=customer`, `kyc_status=unverified`, generated `referral_code` `ZARV-XXXX`); if `referral_code` matches another user's code, set `users.referred_by_id` and insert `referral_rewards(status=pending, gold_mg=settings.referral_reward_mg)` + credit on referee's first approved KYC (job). **Both wallets are auto-created** (`irr`, `gold_mg`, balance 0).
**Errors:** `422 OTP_INVALID` «کد واردشده نامعتبر است»; `429` after 5 wrong codes (15-min lockout).

### A3. Password login — `POST /auth/login/password`
**UI:** `PasswordLoginPage`.
**Body:** `{ "mobile": "09121234567", "password": "secret1" }`
**Success 200:** same shape as A2.
**Errors:** `422 CREDENTIALS_INVALID` «شماره موبایل یا رمز عبور نادرست است».

### A4. Current user — `GET /auth/me` ★
**UI:** `AuthProvider` hydration on every app load; topbar avatar, KYC pill, role routing.
**Success 200:** `{ "data": { "user": { …User } } }` — `401 AUTH_EXPIRED` when token invalid (client logs out).

### A5. Logout — `POST /auth/logout` ★ → `204`. Revokes the refresh token.

### A6. Refresh — `POST /auth/refresh` — `{ "refresh_token": "rt_…" }` → `{ "data": { "token": "…", "refresh_token": "…" } }`; invalid → `401`.

### A7. Forgot password — `POST /auth/password/forgot` — `{ "mobile" }` → always `{ "data": { "ok": true } }` (sends OTP `purpose=login` if user exists; no enumeration).

### A8. Reset password — `POST /auth/password/reset` — `{ "mobile", "code", "password" }` → `{ "data": { "ok": true } }`; `422 OTP_INVALID` / `VALIDATION_ERROR` (min 6 chars).

> *Demo note:* the frontend's `demoLogin` quick-login buttons are build-only; no backend equivalent.

---

## Module B — Profile, Addresses, KYC, Preferences, Referrals (★ C/D)

### B1. Update profile — `PATCH /me`
**UI:** `ProfilePage` → «ذخیره» (name, email; mobile read-only).
**Body:** `{ "name": "سارا کریمی", "email": "sara@example.com" }` (both optional; `email` format-validated)
**Success 200:** `{ "data": { "user": { …updated } } }`

### B2. List addresses — `GET /me/addresses` ★
**UI:** `ProfilePage` addresses card; `CheckoutPage` address radios.
**Success 200:** `{ "data": [ { "id": 1, "title": "منزل", "province": "تهران", "city": "تهران", "line1": "زعفرانیه، خیابان مقدسی، پلاک ۱۲، واحد ۳", "postal_code": "1938614557", "is_default": true }, … ] }`

### B3. Create/update address — `POST /me/addresses`, `PUT /me/addresses/{id}`
**UI:** `AddressModal` → «ذخیره».
**Body:** all fields above; `title` ≤ 40, `postal_code` 10 digits. `is_default:true` atomically unsets others.
**Success:** `201`/`200` with the resource.

### B4. Delete address — `DELETE /me/addresses/{id}` → `204`. If default, promote lowest-id remaining.

### B5. Submit KYC — `POST /me/kyc` ★
**UI:** `KycPage` stepper (upload 3 docs → «ارسال مدارک»).
**Flow:** upload each document first via `POST /me/kyc/documents` (multipart `file`, `kind ∈ id_card|national_card|selfie`; §7 foundation), then submit `{ "first_name", "last_name", "national_id", "birth_date" }`.
**Behavior:** sets `users.kyc_status=pending`, writes `kyc_events(submitted)`; appears in staff queue (`GET /staff/kyc`).
**Success 201:** `{ "data": { "status": "pending", "submitted_at": "2026-08-13T10:00:00Z" } }`
**Errors:** `422` missing documents or invalid `national_id` (10 digits, checksum).

### B6. KYC status/timeline — `GET /me/kyc` ★
**UI:** `KycPage` status timeline + reject banner.
**Success 200:** `{ "data": { "status": "rejected", "timeline": [ {"at":"…","label":"ثبت مدارک"}, … ], "reject_reason": "تصویر کارت ملی ناخوانا است" } }`

### B7. Notification preferences — `GET /me/notification-preferences`, `PATCH /me/notification-preferences`
**UI:** `ProfilePage` switches (sms, email, in_app, price_alerts).
**Body:** `{ "sms": true, "email": false, "in_app": true, "price_alerts": true }` → `200` with merged object.
**Rule:** `in_app=false` suppresses only *marketing* notifications; transactional (trade/order/KYC) always delivered.

### B8. Save ring/bracelet size — `POST /me/size-profile`
**UI:** `SizeGuidePage` → «ذخیره سایز من» (currently a client stub → **wire to this endpoint**, see audit).
**Body:** `{ "kind": "ring", "size_ir": 52, "size_mm": 16.5, "size_us": "6" }` (upsert per kind)
**Success 200:** `{ "data": { …saved } }`

### B9. Referral stats — `GET /me/referrals` ★
**UI:** `ReferralsPage` (code, copy/share buttons, stats, masked referees).
**Success 200:**
```json
{ "data": { "code": "ZARV-9K2P", "invited_count": 4, "gold_earned_mg": 4800,
  "referees": [ { "mobile_masked": "0912•••5000", "joined_at": "2026-07-28T13:00:00Z" }, … ] } }
```
**Masking rule:** first 4 + last 4 digits only, server-side.

---

## Module C — Pricing (public reads, authenticated alerts)

### C1. Spot prices — `GET /pricing/spot`
**UI:** `LivePriceTicker` (all layouts), `HomePage` spot cards, `TradePage` price panel, `AdminPricingPage`.
**Success 200:**
```json
{ "data": [
  { "karat": 18, "price_irr_per_gram": 3520000, "bid_irr": 3498880, "ask_irr": 3535840,
    "change_pct_24h": 0.8, "observed_at": "2026-08-13T11:58:00Z", "stale_seconds": 12, "trading_halt": false },
  { "karat": 24, "price_irr_per_gram": 4690000, "bid_irr": 4661860, "ask_irr": 4711050,
    "change_pct_24h": 0.6, "observed_at": "2026-08-13T11:58:00Z", "stale_seconds": 12, "trading_halt": false }
] }
```
**Derivation:** `bid = round(spot × (1 − bid_bps/10000))`, `ask = round(spot × (1 + ask_bps/10000))` from `settings`.
**Staleness:** `stale_seconds = now − observed_at`; UI shows amber «تأخیر در قیمت» above 120 s. `trading_halt` mirrors `settings.trading_halt`.
**Cache:** `Cache-Control: max-age=5, stale-while-revalidate=10`.

### C2. Price history — `GET /pricing/history?range=1D|1W|1M|90D|1Y&karat=18|24`
**UI:** `LivePricesPage` area chart + tabs + 24k overlay; `TradePage` mini chart; `AdminPricingPage` mini chart; `AdminDashboardPage` spot-90d.
**Success 200:** `{ "data": [ { "t": "2026-08-13T00:00:00Z", "price_irr": 3520000 }, … ] }`
**Resolution:** `1D` → 24 hourly points; `1W` → 7×24 or 168; `1M/90D/1Y` → daily closes (≤ 366 points). Source: `price_snapshots` table (downsampled server-side).

### C3. Last snapshots — `GET /pricing/snapshots?karat=18&limit=10`
**UI:** `LivePricesPage` «۱۰ تغییر آخر» table.
**Success 200:** `{ "data": [ { "id": 91234, "t": "…", "price_irr": 3520000, "change_bps": 3 }, … ] }` ordered desc.

### C4. History CSV export — `GET /pricing/history.csv?range=1Y&karat=18` ★(C/D)
**UI:** `LivePricesPage` → «CSV» button (login-gated in UI). Currently built client-side from C2; endpoint exists for full-resolution export. Streams `text/csv` with header `time,price_irr_per_gram`.

### C5. List price alerts — `GET /pricing/alerts` ★(C/D)
**UI:** `PriceAlertsPage` list with switches.
**Success 200:** `{ "data": [ { "id": 1, "karat": 18, "direction": "above", "threshold_irr": 3600000, "is_active": true }, … ] }`

### C6. Create alert — `POST /pricing/alerts` ★ → `201`
**UI:** `PriceAlertsPage` → «هشدار جدید» (karat, direction, threshold).
**Body:** `{ "karat": 18, "direction": "above", "threshold_irr": 3600000 }`; threshold ≥ 1000. Max 20 active alerts per user → `422`.

### C7. Toggle alert — `PATCH /pricing/alerts/{id}` `{ "is_active": false }` → `200` with resource. Owner-scoped.

### C8. Delete alert — `DELETE /pricing/alerts/{id}` → `204`. Owner-scoped.

---

## Module D — Catalog (public)

### D1. List products — `GET /catalog/products`
**UI:** `CatalogPage` grid + filters + search + sort + pagination (8-card skeletons while loading); `HomePage` featured 4; `AdminProductsPage` table (via admin-scoped variant, see N2).
**Query params (all optional):**
| Param | Values | UI control |
|---|---|---|
| `type` | `jewelry\|bar\|coin\|melted` | type chips |
| `karat` | `18\|24` | karat chips |
| `occasion` | free string (`هدیه`, `نامزدی`, `ازدواج`, `جهیزیه` seeded) | occasion checkboxes |
| `category` | category slug | category tree |
| `q` | partial match on `name`, `sku`, `description` | search box / header search |
| `in_stock` | `1` | «فقط کالاهای موجود» checkbox |
| `min_price` / `max_price` | IRR vs computed `quote_irr` | price slider |
| `min_mg` / `max_mg` | weight filter | slider |
| `sort` | `featured` (default, `published_at desc`)\|`newest`\|`price_asc`\|`price_desc`\|`weight_asc`\|`weight_desc` | sort select |
| `page`, `per_page` | default 15 | pagination |

**Success 200:** `ApiList<Product>`:
```json
{ "data": [ {
  "id": 1, "sku": "BR-18-221", "slug": "rope-bracelet-18k", "name": "دستبند طنابی ۱۸ عیار",
  "type": "jewelry", "category_id": 12, "karat": 18, "weight_mg": 4200,
  "making_charge_type": "flat", "making_charge_irr": 8500000, "occasion": "هدیه",
  "status": "active", "description": "…", "attributes": { "عیار": "۱۸ (۷۵۰)", "قفل": "خرچنگی" },
  "images": ["https://…/media/…"], "has_360": true,
  "quote_irr": 23284000, "bid_irr": null, "ask_irr": null, "stock_on_hand": 6,
  "published_at": "2026-06-21T00:00:00Z"
} ],
  "meta": { "current_page": 1, "per_page": 15, "total": 10, "last_page": 1 },
  "links": { "first": "…", "last": "…", "prev": null, "next": null } }
```
**Quote computation (server, re-priced on every render):** jewelry `quote_irr = round(weight_mg/1000 × spot(karat)) + making` where `making = making_charge_irr` (flat) or `weight_mg/1000 × making_charge_irr` (per_gram). Bullion uses live `bid_irr`/`ask_irr` (`quote_irr = ask_irr`).
**Visibility:** only `status=active` **and** `published_at ≤ now` (admin variant returns all statuses).

### D2. Product detail — `GET /catalog/products/{slug}` (also accepts numeric id)
**UI:** `ProductDetailPage` (gallery, 360 drag, making breakdown, live quote, size select, qty, packaging, tabs, reserve/OOS notify).
**Success 200:** `{ "data": { …Product, "related": [ …up to 4 Product ] } }`
**Errors:** `404 NOT_FOUND` «محصول پیدا نشد».
**360:** `has_360:true` implies `media` frames exist; frames returned in `images` order or via `GET /catalog/products/{slug}/media?kind=frame360` → `{ "data": [urls] }` (36 ordered frames).

### D3. Category tree — `GET /catalog/categories`
**UI:** `CatalogPage` filter tree; `AdminCategoriesPage`.
**Success 200:** `{ "data": [ { "id": 1, "parent_id": null, "name": "جواهرات", "slug": "jewelry", "type": "jewelry", "sort_order": 1, "is_active": true, "children": [ {…rings}, {…bracelets}, {…necklaces} ] }, {…bullion + children}, {…melted} ] }`
Nested exactly two levels. Public variant hides `is_active:false`.

### D4. Contact message — `POST /contact`
**UI:** `ContactPage` form → «ارسال» + toast.
**Body:** `{ "name": "…", "mobile": "09…", "message": "…" }` (message 10–2000 chars)
**Success 201:** `{ "data": { "ok": true } }` — stored in `contact_messages`, shown to staff as low-priority tickets (`type=general`) or a staff inbox.

### D5. Reserve product (deposit) — `POST /catalog/products/{id}/reservations` ★(C/D)
**UI:** `ProductDetailPage` → `ReserveProductModal` «پرداخت بیعانه» (jewelry only, e.g. out-of-stock wedding band).
**Body:** `{ "deposit_irr": 2000000, "size": "56" }` → creates `reservations(status=pending_deposit)` + PSP redirect `{ "data": { "reservation_id": 9, "payment_url": "https://psp…" } }`.
**Rules:** deposit = 10% of `quote_irr` (server-computed, body value validated ±0); reservation holds stock 72 h.

### D6. Restock notification — `POST /catalog/products/{id}/restock-notify` ★(C/D)
**UI:** `ProductDetailPage` OOS state → «خبرم کن».
**Success 201:** `{ "data": { "ok": true } }`; job notifies when `stock_on_hand` goes 0→>0.

### D7. Wishlist *(spec item, not currently wired in UI)* — optional endpoints `POST/DELETE /me/wishlist/{product_id}`, `GET /me/wishlist`. Listed in audit as not-required-unless-added.

---

## Module E — Wallets & Ledger (★ C/D)

### E1. My wallets — `GET /wallets`
**UI:** `WalletPage` two cards; topbar chips «کیف پول ریال / طلا».
**Success 200:** `{ "data": [ { "id": 1, "currency": "irr", "balance": 25000000, "updated_at": "2026-08-13T09:40:00Z" }, { "id": 2, "currency": "gold_mg", "balance": 12450, "updated_at": "2026-08-13T09:41:00Z" } ] }`

### E2. Ledger — `GET /wallets/ledger?currency=irr|gold_mg&direction=credit|debit&reason=&page=&per_page=`
**UI:** `WalletPage` ledger table with filters; `AdminWalletsPage` (admin variant, see N8).
**Success 200:** `ApiList<LedgerEntry>`:
```json
{ "data": [ { "id": 1, "direction": "credit", "amount": 1200, "reason": "پاداش معرفی دوست",
  "balance_after": 12450, "reference_type": "referral", "reference_id": 1,
  "created_at": "2026-08-13T09:41:00Z" } ], "meta": {…}, "links": {…} }
```
`reference_type ∈ deposit|withdraw|trade|order|gift|auto_invest|installment|referral|adjustment|buyback|delivery_fee`. Default order `created_at desc`.

### E3. Deposit — `POST /wallets/deposit`
**UI:** `WalletPage` → «شارژ کیف پول» modal (`MoneyInput` + ریال suffix).
**Body:** `{ "amount_irr": 50000000 }` — min 100 000, max 5 000 000 000 per transaction.
**Success 201:** `{ "data": { "payment": { "id": 552, "driver": "به‌پرداخت ملت", "status": "pending" }, "payment_url": "https://psp.example/…" } }`
**Completion:** PSP webhook → `payments.status=paid` → ledger credit (reason «واریز از درگاه بانکی», `reference_type=deposit`) → toast path on return URL. Frontend currently mocks instant credit; backend must implement the redirect loop.

### E4. Withdraw — `POST /wallets/withdraw`
**UI:** `WalletPage` → «برداشت» modal (amount + IBAN) → `OtpStepUpModal`.
**Body:** `{ "amount_irr": 10000000, "iban": "IR820540102680020817909002", "otp_code": "193847" }`
**Flow:** missing `otp_code` → `403 OTP_REQUIRED`; min 100 000 IRR; > balance → `422 INSUFFICIENT_BALANCE` «موجودی کافی نیست»; unverified KYC daily cap `settings.unverified_daily_cap_irr` → `422`.
**Success 200:** `{ "data": { "withdrawal_id": 31, "status": "processing", "eta_hours": 24, "wallets": [ …E1 shape ] } }` + ledger debit (reason «برداشت به شبا», `reference_type=withdraw`).
**Settlement:** payout job marks `paid`/`failed` + notification.

### E5. Balance history — `GET /wallets/balance-history?days=90&currency=irr`
**UI:** `WalletPage` 90-day area chart.
**Success 200:** `{ "data": [ { "t": "2026-05-16T00:00:00Z", "value": 25000000 }, … ] }` — daily closing balance (rebuilt from ledger).

---

## Module F — Instant-gold Trading (★ C/D)

### F1. Request quote — `POST /trades/quote`
**UI:** `TradePage` → «دریافت قیمت» (tabs خرید/فروش, mg/g `MassInput`).
**Body:** `{ "side": "buy", "weight_mg": 1000 }`
**Errors:** `503 TRADING_HALTED` «معاملات موقتاً متوقف است»; `422 MIN_TRADE_WEIGHT` «حداقل وزن معامله ۱۰۰ میلی‌گرم است».
**Success 200:**
```json
{ "data": { "id": 5001, "side": "buy", "weight_mg": 1000, "spot_irr": 3520000,
  "spread_bps": 45, "irr_amount": 3535840, "expires_at": "2026-08-13T12:00:18Z" } }
```
**Server rules:** `buy: irr_amount = round(gross × (1 + ask_bps/1e4))`; `sell: round(gross × (1 − bid_bps/1e4))`; TTL = `settings.quote_ttl_sec` (18 s) — UI countdown derives from `expires_at`. Row stored `trade_quotes(status=active)`.

### F2. Confirm trade — `POST /trades`
**UI:** `TradePage` → «تأیید معامله» (sell may require OTP step-up).
**Body:** `{ "quote_id": 5001, "otp_code": "…" }`
**Errors (exact UI behaviors):**
| Condition | Response | UI reaction |
|---|---|---|
| quote past `expires_at` or `status≠active` | `409 QUOTE_EXPIRED` «قیمت منقضی شد» | `QuoteExpiredModal` → «دریافت مجدد» |
| sell & `settings.otp_enabled` & no/invalid `otp_code` | `403 OTP_REQUIRED` «کد تأیید لازم است» | `OtpStepUpModal` |
| buy & IRR balance < `irr_amount` | `422 INSUFFICIENT_BALANCE` «موجودی کافی نیست» | toast |
| sell & gold balance < `weight_mg` | `422 INSUFFICIENT_BALANCE` «موجودی طلای کافی نیست» | toast |
| halt flipped meanwhile | `503 TRADING_HALTED` | halt banner |

**Success 200:**
```json
{ "data": { "id": 2001, "quote_id": 5001, "side": "buy", "status": "filled",
  "weight_mg": 1000, "irr_amount": 3535840, "spot_irr": 3520000, "slippage_bps": 0,
  "filled_at": "2026-08-13T12:00:21Z" } }
```
**Atomicity (single transaction):** mark quote `filled`; debit/credit both wallets with row locks; append **two** ledger entries is NOT required — one entry on the *moving* side per current UI (`reference_type=trade`, reason «خرید/فروش طلای آب‌شده — {mg} mg»); insert `trades`; write `portfolio_lots` row on buy (cost basis), FIFO consumption on sell; vault liabilities += weight on buy; notification type `trade`.
**Slippage:** if spot moved between quote and fill beyond `settings.slippage_bps`, either fill at quoted price (preferred) or reject with `409` — record `slippage_bps`.

### F3. Trade history — `GET /trades?side=&status=&page=`
**UI:** `TradePage` history list; `DashboardPage` last-trade KPI.
**Success 200:** `ApiList<Trade>` (shape as F2 data), default `filled_at desc`.

### F4. Buyback request — `POST /buyback-requests`
**UI:** `BuybackPage` (wallet vs physical tabs, weight, notes, photo upload via `POST /uploads?context=buyback`).
**Body:** `{ "source": "physical", "weight_mg": 4200, "notes": "دستبند قدیمی", "photo_url": "https://…/media/…" }`
**Errors:** `422 MIN_BUYBACK_WEIGHT` «حداقل وزن بازخرید ۵۰۰ میلی‌گرم است»; `source=wallet` requires balance ≥ weight (`422 INSUFFICIENT_BALANCE`).
**Success 201:** `{ "data": { "id": 12, "status": "pending_review", "estimated_irr": 14683000 } }`
**Workflow:** staff assay → approve pays at *current* bid (ledger credit `buyback`) or reject (notification). `source=wallet` skips assay (auto-approve job).

---

## Module G — Portfolio & Investment products (★ C/D)

### G1. Portfolio summary — `GET /portfolio/summary`
**UI:** `PortfolioPage` KPI row; `DashboardPage` PnL card.
**Success 200:** `{ "data": { "cost_irr": 41300000, "market_irr": 43824000, "pnl_irr": 2524000, "pnl_pct": 6.1, "gold_mg": 12450 } }`
Computed: open `portfolio_lots` (cost basis) vs `gold wallet × current spot`. `pnl_pct` rounded to 1 decimal.

### G2. Lots — `GET /portfolio/lots`
**UI:** `PortfolioPage` lots table.
**Success 200:** `{ "data": [ { "id": 1, "acquired_at": "2026-08-12T17:22:00Z", "weight_mg": 1000, "cost_irr": 3520000, "market_irr": 3520000 }, … ] }` — `market_irr = weight_mg × spot18 / 1000` live.

### G3. PnL history — `GET /portfolio/pnl-history?days=90`
**UI:** `PortfolioPage` 90d PnL area chart. **Success:** `{ "data": SeriesPoint[] }` — daily `(market − cost)` using snapshot prices.

### G4. Portfolio value history — `GET /portfolio/value-history?days=30`
**UI:** `DashboardPage` portfolio-30d line chart. **Success:** `{ "data": SeriesPoint[] }`.

### G5. Auto-invest plans — `GET /auto-invest/plans`, `POST /auto-invest/plans`
**UI:** `AutoInvestPage` cards + create modal (amount + day + switch), stop/edit.
**Create body:** `{ "amount_irr": 10000000, "day_of_month": 5 }` (min 1 000 000; day 1–28)
**Success 201:** `{ "data": { "id": 3, "amount_irr": 10000000, "day_of_month": 5, "is_active": true } }`
**Execution:** `RunAutoInvestPlans` buys at spot on the day; insufficient IRR → skip + notification; ledger `auto_invest`.

### G6. Toggle plan — `PATCH /auto-invest/plans/{id}` `{ "is_active": false }` → `200`. Also `DELETE` → `204`.

### G7. Installment contracts — `GET /installments/contracts`
**UI:** `InstallmentsPage` contracts + progress bars.
**Success 200:** `{ "data": [ { "id": 1, "months": 12, "down_irr": 12000000, "principal_irr": 60000000, "paid_irr": 24000000, "remaining_irr": 36000000, "status": "active", "next_due_at": "2026-09-05T00:00:00Z" } ] }` — `status ∈ active|completed|overdue|cancelled`.

### G8. Pay installment — `POST /installments/contracts/{id}/payments`
**UI:** `InstallmentsPage` → «پرداخت قسط» modal.
**Body:** `{ "amount_irr": 6000000 }` — validates ≤ `remaining_irr` and ≤ IRR balance (`422 INSUFFICIENT_BALANCE`).
**Success 201:** `{ "data": { "paid_irr": 30000000, "remaining_irr": 30000000, "status": "active" } }` + ledger `installment` + receipt notification. Full payoff flips `status=completed`.

---

## Module H — Cart, Checkout, Orders (★ C/D)

### H1. Get cart — `GET /cart`
**UI:** `CartDrawer`, `CartPage`, checkout summary, header badge count.
**Success 200:**
```json
{ "data": { "id": 1, "status": "active",
  "lines": [ { "id": 1, "product_id": 1, "product": { …Product }, "qty": 1,
               "packaging": "luxury", "unit_quote_irr": 23284000 } ],
  "coupon_code": null, "subtotal_irr": 23284000, "discount_irr": 0, "total_irr": 23284000,
  "quote_expires_at": null } }
```
One active cart per user (auto-created). `quote_expires_at` set when totals are locked at checkout step 2 (60 s lock); stale lock re-quotes on next H8.

### H2. Add line — `POST /cart/lines`
**UI:** `ProductCard` «افزودن به سبد», `ProductDetailPage` «افزودن به سبد خرید» (toast «افزوده شد به سبد»).
**Body:** `{ "product_id": 1, "qty": 1 }` — `404` unknown/`draft`/`inactive` product; stock check (`422` «موجودی کافی نیست» if `qty > stock_on_hand`, except `melted` type which is unlimited); existing line for same product merges qty.
**Success 200:** full cart (H1 shape).

### H3. Update line — `PATCH /cart/lines/{id}`
**UI:** `CartPage` qty stepper; `PackagingDrawer` / per-line packaging picker.
**Body:** `{ "qty": 2 }` (min 1, stock-capped) and/or `{ "packaging": "luxury" }` (`standard|luxury`; luxury adds `settings.luxury_packaging_irr` per line — document in cart totals as part of `unit_quote_irr` or a `packaging_irr` line field; frontend re-reads cart).
**Success 200:** full cart.

### H4. Remove line — `DELETE /cart/lines/{id}` → full cart, `200`.

### H5. Apply coupon — `POST /cart/coupon`
**UI:** `CouponApplyModal` → «اعمال».
**Body:** `{ "code": "GOLD-NOWRUZ" }` (case-insensitive, trimmed).
**Errors:** `422 COUPON_INVALID` «کد تخفیف نامعتبر» for unknown/inactive/expired/`max_uses` reached/`min_order_irr` not met (message varies: «حداقل مبلغ سفارش رعایت نشده است»).
**Success 200:** full cart with `coupon_code` + recomputed `discount_irr` (`percent`: round(subtotal×v/100); `fixed_irr`: min(v, subtotal)).

### H6. Remove coupon — `DELETE /cart/coupon` → full cart with zeroed discount.

### H7. Preview checkout totals — `GET /checkout/preview?fulfillment=delivery&address_id=2`
**UI:** `CheckoutPage` live summary (subtotal, making, packaging, discount, tax, delivery fee, total).
**Success 200:** `{ "data": { "subtotal_irr": …, "making_irr": …, "packaging_irr": …, "discount_irr": …, "tax_irr": …, "delivery_fee_irr": 0, "total_irr": …, "gold_mg": … } }` — `tax_irr = round(subtotal × vat_pct/100)`; delivery fee 0 for vault, `settings.delivery_fee_irr` for physical (insured post).

### H8. Place order — `POST /checkout`
**UI:** `CheckoutPage` stepper سبد→ارسال→پرداخت → «پرداخت و ثبت سفارش».
**Body:** `{ "fulfillment": "vault" | "delivery", "address_id": 2, "payment_method": "wallet" | "psp" }` (`address_id` required for `delivery`).
**Errors:** `422 CART_EMPTY` «سبد خرید خالی است»; `403 KYC_REQUIRED` «برای ارسال فیزیکی ابتدا احراز هویت را تکمیل کنید» (delivery + `kyc_status≠approved` — UI disables the radio too); `409 QUOTE_EXPIRED` if re-quote changed totals by > `slippage_bps`; `422` insufficient wallet balance for `payment_method=wallet`.
**Success 201:**
```json
{ "data": { "id": 5, "number": "ZRVORD-2026-0932", "status": "awaiting_payment",
  "fulfillment": "delivery", "subtotal_irr": 23284000, "making_irr": 8500000,
  "discount_irr": 0, "tax_irr": 0, "total_irr": 23284000, "gold_mg": 4200,
  "paid_at": null, "created_at": "2026-08-13T12:30:00Z",
  "items": [ …CartLine ], "customer": { "id": 1, "name": "سارا کریمی", "mobile": "09121234567" },
  "payment_url": "https://psp.example/…" } }
```
**Server behavior:** atomically create order + items + `payments(status=pending, driver=settings.psp)`; **reserve stock** (`inventory.reserved += qty`); convert cart to `converted`; number format `ZRVORD-{YYYY}-{seq4}`. `payment_method=wallet`: debit immediately → `status=paid`, issue invoice (job G), credit vault gold.
`payment_method=psp` + `fulfillment=vault` shortcut used by the current mock (`placeOrder(fulfillment)` returning `vaulted`/`paid`): backend implements via wallet default per §4.4 frontend simplification — i.e. mock assumes wallet payment.

### H9. List my orders — `GET /orders?status=&fulfillment=&page=`
**UI:** `OrdersPage` status filter chips + table.
**Success 200:** `ApiList<Order>` (H8 data shape, without `payment_url`), default `created_at desc`.

### H10. Order detail — `GET /orders/{id}`
**UI:** `OrderDetailPage`. `{id}` = numeric id **or** `number`. Owner-scoped (staff/admin variant in Part 2).
**Success 200:** `{ "data": { …Order, "shipment": { "carrier": "پست جمهوری اسلامی", "tracking_code": "IRPOST-883421", "status": "shipped", "shipped_at": "…", "delivered_at": null,
"timeline": [ { "at": "2026-08-10T10:30:00Z", "label": "ثبت سفارش" }, { "at": "2026-08-10T11:02:00Z", "label": "پرداخت موفق" }, { "at": "2026-08-11T15:40:00Z", "label": "بسته‌بندی لوکس و پلمب" }, { "at": "2026-08-12T09:00:00Z", "label": "تحویل به پست — کد رهگیری IRPOST-883421" } ] },
"invoice": { "id": 1, "number": "ZRV-2026-00012" } } }`
`shipment` null until shipped (vault orders show vault timeline instead: ثبت → پرداخت → واریز به خزانه).

### H11. Cancel order — `POST /orders/{id}/cancel`
**UI:** `OrderDetailPage` «لغو سفارش» (only when `awaiting_payment`).
**Errors:** `404`; `422 ORDER_PAID` «سفارش پرداخت‌شده قابل لغو نیست».
**Success 200:** updated order `status=cancelled`; releases reserved stock; cart not restored (v1).

---

## Module I — Invoices & Delivery (★ C/D)

### I1. List invoices — `GET /invoices?page=`
**UI:** `InvoicesPage` table (number/date/gold/IRR, PDF + چاپ buttons).
**Success 200:** `ApiList<Invoice>`: `{ "data": [ { "id": 1, "number": "ZRV-2026-00012", "issued_at": "2026-08-10T11:02:00Z", "total_irr": 23284000, "gold_mg": 4200, "pdf_url": "/api/v1/invoices/1/pdf" } ] , … }`
Number format `ZRV-{YYYY}-{seq5}`; issued on payment success.

### I2. Invoice detail — `GET /invoices/{id}`
**UI:** `InvoiceDetailPage` legal layout.
**Success 200:** `{ "data": { …Invoice, "order_number": "ZRVORD-2026-0901", "legal": { "name": "شرکت طلای زرون (سهامی خاص)", "reg_no": "۵۴۸۹۳۲", "economic_code": "…", "vault_address": "…" }, "lines": [ { "sku": "BR-18-221", "name": "…", "qty": 1, "unit_irr": 23284000, "total_irr": 23284000 } ], "totals": { "subtotal_irr": …, "discount_irr": …, "vat_irr": …, "total_irr": … } } }` — legal block sourced from settings.

### I3. Invoice PDF — `GET /invoices/{id}/pdf` → `200 application/pdf` (owner or staff/admin). `GenerateInvoicePdf` job.

### I4. Delivery requests (vault → physical) — `GET /deliveries`, `POST /deliveries`
**UI:** `DeliveryPage` list + «تبدیل به فیزیکی» form (mg, address, preset 5/10/50 g chips).
**Create body:** `{ "gold_mg": 5000, "address_id": 1 }` — multiples of preset grams allowed; min 5000 mg; requires `kyc_status=approved` (`403 KYC_REQUIRED`); gold balance check (`422 INSUFFICIENT_BALANCE`).
**Success 201:** `{ "data": { "id": 4, "gold_mg": 5000, "status": "pending", "fee_irr": 2500000, "address": {…}, "created_at": "…" } }`
**Workflow:** admin schedules shipment → ledger debit `delivery_fee` + gold debit on dispatch → `shipment_events` feed the same timeline component as orders.

---

## Module J — Gifts & Referral redemption (★ C/D)

### J1. My gifts — `GET /gifts?page=`
**UI:** `GiftsPage` sent/redeemed list + «کپی کد».
**Success 200:** `ApiList<GiftCard>`: `{ "data": [ { "id": 77, "code": "ZGIFT-88KQ2", "recipient_mobile": "09125550000", "gold_mg": 5000, "status": "sent", "packaging": "luxury", "message": "تولدت مبارک!", "created_at": "2026-07-28T13:00:00Z" } ] }` — `status ∈ created|sent|redeemed`.

### J2. Send gift — `POST /gifts`
**UI:** `GiftsPage` form (mg, mobile, packaging, message) → «ارسال هدیه».
**Body:** `{ "recipient_mobile": "09125550000", "gold_mg": 5000, "packaging": "luxury", "message": "تولدت مبارک!" }` (message ≤ 200; min 100 mg; recipient ≠ self)
**Behavior:** debit sender gold wallet (`422 INSUFFICIENT_BALANCE` «موجودی طلای کافی نیست»), ledger `gift` («انتقال هدیه به ۰۹۱۲•••۰۰۰۰» masked), generate code `ZGIFT-XXXXX`, SMS recipient (if registered user: credit their wallet instantly → `redeemed` + notif; else hold as claimable code → stays `sent`).
**Success 201:** the GiftCard resource.

### J3. Redeem gift — `POST /gifts/redeem` `{ "code": "ZGIFT-88KQ2" }` ★
Backend-only counterpart for SMS link flow (recipient logs in / registers then redeems). `422` «کد هدیه نامعتبر یا استفاده شده است». Credits gold wallet, marks `redeemed`, notifies sender.

---

## Module K — Support tickets (★ C/D for own; staff variants in Part 2)

### K1. My tickets — `GET /tickets?status=&type=&page=`
**UI:** `TicketsPage` list + filters.
**Success 200:** `ApiList<Ticket>`: `{ "data": [ { "id": 1042, "subject": "پیگیری مرسوله ZRVORD-2026-0901", "type": "delivery", "status": "pending", "priority": "high", "updated_at": "2026-08-12T10:15:00Z" } ] }` — customer payload omits `user`.

### K2. Create ticket — `POST /tickets`
**UI:** `TicketsPage` create modal (subject/type/body).
**Body:** `{ "subject": "…", "type": "general|price_match|delivery|kyc", "body": "…" }` (subject ≤ 120, body ≤ 5000; `type=delivery` optionally `order_id`)
**Success 201:** `{ "data": { "id": 1043, "subject": "…", "type": "…", "status": "open", "priority": "normal", "updated_at": "…" } }` — first message created from `body`.

### K3. Ticket thread — `GET /tickets/{id}/messages`
**UI:** `TicketDetailPage` bubbles.
**Success 200:** `{ "data": [ { "id": 1, "body": "سلام…", "is_staff": false, "created_at": "2026-08-12T09:50:00Z" }, { "id": 2, "body": "سلام سارا عزیز…", "is_staff": true, "created_at": "2026-08-12T10:15:00Z" } ] }`

### K4. Reply — `POST /tickets/{id}/messages` `{ "body": "…" }`
Customer reply sets ticket `status=open` (back in queue); staff reply sets `pending` (see Part 2). **Success 201** returns the message. Notifies the other side.

### K5. Close own ticket — `POST /tickets/{id}/close` → `204` (`status=closed`).

---

## Module L — Notifications & Dealer

### L1. List notifications — `GET /notifications?type=&read=&page=`
**UI:** `NotificationsPage` filters; `AppTopbar` bell popover (latest 5).
`type ∈ trade|price|order|promo|system|kyc|gift`. **Success 200:** `ApiList<AppNotification>`:
`{ "data": [ { "id": 1, "type": "trade", "title": "معامله انجام شد", "body": "خرید ۱ گرم طلای ۱۸ عیار با موفقیت ثبت شد.", "data": { "trade_id": 2001 }, "read_at": null, "created_at": "2026-08-12T17:22:00Z" } ] }`
`data` is a typed link map per type (e.g. `{order_id}`, `{ticket_id}`) powering click-through navigation.

### L2. Unread count — `GET /notifications/unread-count` → `{ "data": { "count": 4 } }` — topbar badge `۴`. Poll every 60 s (or websocket optional).

### L3. Mark one read — `POST /notifications/{id}/read` → `204`.
### L4. Mark all read — `POST /notifications/read-all` → `204`.

### L5. Dealer dashboard — `GET /dealer/stats` ★(**D** only)
**UI:** `DealerDashboardPage` (spread KPI, volume, wholesale orders table).
**Success 200:**
```json
{ "data": { "spread_bps": 25, "volume_30d_mg": 1240000, "orders_count": 9,
  "orders": [ { "id": 1, "number": "ZRVWHL-2026-114", "qty_mg": 500000,
                "total_irr": 1755000000, "status": "processing", "date": "2026-08-11T10:00:00Z" }, … ] } }
```
Wholesale price = spot × (1 − `settings.dealer_spread_bps`/1e4).

### L6. Dealer bulk orders — `GET /dealer/orders?page=`, `POST /dealer/orders`
**UI:** `DealerBulkPage` qty bars + «سفارش عمده» + delivery schedule.
**Create body:** `{ "qty_mg": 250000, "requested_delivery_at": "2026-08-20T09:00:00Z", "address_id": 2 }` — min 100 g (`422`); number `ZRVWHL-{YYYY}-{seq3}`; status flow `processing → scheduled → delivered` (admin-driven, Part 2).
**Success 201:** resource incl. locked `unit_irr` + `total_irr`.

### L7. Dealer delivery schedule — `GET /dealer/deliveries` → upcoming armored-delivery slots with capacity; used by the schedule picker in `DealerBulkPage`.
