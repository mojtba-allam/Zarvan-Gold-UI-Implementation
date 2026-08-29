# Zarvan Gold — Backend API Specification · Part 0: Foundation

> **Audience:** Laravel / backend developers. This document set is the single source of truth for
> building the entire backend of the Zarvan Gold SPA (storefront + customer + dealer + staff + admin).
> Every endpoint listed was reverse-engineered from the shipped frontend (`src/pages/*`, `src/api/index.ts`,
> `src/types/index.ts`). Where the frontend mock currently fakes behavior, the required server behavior
> is specified here.
>
> **Document map**
> | File | Contents |
> |---|---|
> | `00-foundation.md` | Conventions, envelope, auth & authorization, errors, validation, pagination, files, rate limits |
> | `01-api-public-customer.md` | Modules A–L: Auth, Profile/KYC, Pricing, Catalog, Wallets, Trades, Portfolio/Invest, Cart/Checkout/Orders, Invoices/Delivery, Gifts, Tickets, Notifications, Dealer |
> | `02-api-staff-admin.md` | Modules M–O: Staff console, Admin console, System |
> | `03-database-erd.md` | Full ERD (Mermaid) + all table definitions, enums, indexes, relationships |
> | `04-mapping-audit.md` | UI element → endpoint → table mapping + completeness audit + gap list |

---

## 1. General conventions

| Item | Rule |
|---|---|
| Base URL | `{VITE_API_URL}` → REST root **`/api/v1`** |
| Content type | `application/json; charset=utf-8` (both directions) |
| Language | Responses carry Persian `message` strings ready for direct toast display (RTL). Keep the exact strings in §6 as the canonical UX copy. |
| Money | **Integer Iranian Rials (IRR)**, field suffix `_irr`. Never floats. |
| Mass | **Integer milligrams (mg)**, field suffix `_mg` (or `weight_mg`, `gold_mg`). 1 gram = 1000. |
| Rates/spreads | Basis points, suffix `_bps` (1 bp = 0.01%). |
| Dates | ISO-8601 UTC, e.g. `2026-08-13T09:41:00Z`. Frontend converts to Jalali client-side. |
| IDs | Auto-increment `bigint unsigned`, serialized as integers (frontend accepts number\|string). |
| Public business numbers | Persian-digit formatting is done client-side; API always returns ASCII digits. |
| Idempotency | Mutations that move money (`POST /trades`, `POST /wallets/withdraw`, `POST /checkout`, `POST /admin/payments/{id}/refund`) **SHOULD** honor an `Idempotency-Key` request header; replay within 24h returns the original response. |
| Clock | Server-side quote TTLs are authoritative. `expires_at` values are absolute ISO timestamps; clients only display countdowns. |

### 1.1 Units cheat-sheet (frontend formats these verbatim)

| Concept | Field examples | Unit |
|---|---|---|
| Prices, totals, fees | `price_irr_per_gram`, `total_irr`, `making_charge_irr` | rials |
| Gold weight | `weight_mg`, `gold_mg`, `balance` (gold wallet) | milligrams |
| Spread/slippage | `bid_bps`, `spread_bps`, `slippage_bps` | basis points |
| Percent coupons | `value` when `type=percent` | integer percent |

---

## 2. Response envelope

### 2.1 Success — single resource

```json
{ "data": { /* resource */ } }
```

### 2.2 Success — paginated list (Laravel paginator shape, consumed verbatim by `ApiList<T>`)

```json
{
  "data": [ /* resources */ ],
  "meta": { "current_page": 1, "per_page": 15, "total": 128, "last_page": 9 },
  "links": { "first": "...", "last": "...", "prev": null, "next": "...?page=2" }
}
```

- `meta` keys are **exactly**: `current_page`, `per_page`, `total`, `last_page`.
- Non-paginated arrays (e.g. `GET /pricing/spot`, `GET /wallets`) use `{ "data": [...] }` **without** meta — the frontend reads them as plain arrays.
- Actions with no body return `204 No Content` (e.g. delete, toggle, mark-read).

### 2.3 Error envelope (consumed verbatim by `ApiError`)

```json
{
  "message": "موجودی کافی نیست",
  "code": "INSUFFICIENT_BALANCE",
  "errors": { "amount_irr": ["حداقل مبلغ برداشت ۱۰۰٬۰۰۰ ریال است"] }
}
```

- `message` — Persian, shown directly in toasts/banners.
- `code` — stable machine code (§6).
- `errors` — only on `422`; map of field → Persian messages, rendered inline under inputs.

---

## 3. HTTP status codes

| Status | Meaning in this system |
|---|---|
| `200` | OK (reads + most mutations) |
| `201` | Created (`POST` of a resource: ticket, alert, plan, coupon, gift, address, product, broadcast) |
| `204` | No content (delete / toggle / mark-read / logout) |
| `400` | Malformed request body |
| `401` | Missing/invalid/expired token → frontend force-logs-out + toast «نشست منقضی شد» |
| `403` | Authenticated but not allowed. Sub-codes: `FORBIDDEN` (role), `OTP_REQUIRED` (step-up), `KYC_REQUIRED` (delivery checkout) |
| `404` | Resource not found («سفارش پیدا نشد», «محصول پیدا نشد») |
| `409` | `QUOTE_EXPIRED` — trade quote TTL elapsed → frontend opens **QuoteExpiredModal** |
| `422` | Validation / business rule failure (see §6) |
| `429` | Rate limited (OTP send: 3/min per mobile) — `Retry-After` header in seconds |
| `500` | Unexpected — frontend shows Error500Page / retry banner |
| `503` | `TRADING_HALTED` — trading endpoints while halt flag on; also used for `/maintenance` gate |

---

## 4. Authentication & authorization

### 4.1 Session model

- **Access token:** opaque `Bearer` JWT, 30 min TTL, header `Authorization: Bearer <token>` (frontend stores in `localStorage` and attaches via the fetch client).
- **Refresh token:** opaque, 30 days, rotated on use; `POST /auth/refresh {refresh_token}` → new pair. On refresh failure → `401`.
- **401 handling contract:** any `401` from any endpoint triggers client logout + redirect to `/login` + toast «نشست منقضی شد».

### 4.2 Registration & login (OTP-first)

Registration and login are the **same flow**; first successful verify of an unknown mobile creates the account.

| Step | Endpoint | Notes |
|---|---|---|
| 1 | `POST /auth/otp/send` `{mobile, purpose?}` | `purpose ∈ login\|withdraw\|trade` (default `login`). Creates 6-digit code, TTL 5 min, max 5 attempts. SMS via provider in `settings.sms_provider`. Rate limit 3/min. |
| 2 | `POST /auth/otp/verify` `{mobile, code, referral_code?}` | Wrong/expired → `422 {code:"OTP_INVALID", message:"کد واردشده نامعتبر است"}`. Success on unknown mobile → **creates user** (`role=customer`, `kyc_status=unverified`, generates unique `referral_code` like `ZARV-XXXX`), links `referred_by` if `referral_code` valid, queues referral reward. Returns `{data:{user, token, refresh_token}}`. |
| alt | `POST /auth/login/password` `{mobile, password}` | For users who set a password. Failure → `422 {code:"CREDENTIALS_INVALID", message:"شماره موبایل یا رمز عبور نادرست است"}`. |
| alt | `POST /auth/password/forgot` `{mobile}` | Sends OTP with `purpose=login`; always `200` (no user enumeration). |
| alt | `POST /auth/password/reset` `{mobile, code, password}` | Verifies OTP then sets bcrypt password. |
| — | `GET /auth/me` | `{data:{user}}` — frontend hydrates role/KYC from here on every load. |
| — | `POST /auth/logout` | Revokes refresh token. `204`. |

**Frontend demo shortcut:** `authApi.demoLogin(uid)` exists only for the shipped demo build; **do not implement** server-side.

### 4.3 Step-up OTP (sensitive mutations)

Two UI flows require a fresh OTP bound to the **signed-in user**, not a mobile form:

| Trigger (UI) | Endpoint behavior |
|---|---|
| **Withdraw** (`WalletPage` → برداشت) | `POST /wallets/withdraw` without `otp_code` → `403 {code:"OTP_REQUIRED"}`. Client opens `OtpStepUpModal`, calls `POST /auth/otp/send {purpose:"withdraw"}` (code SMS'd to the user's own mobile), then retries withdraw with `otp_code`. |
| **Sell trade** (`TradePage`, when `settings.otp_enabled`) | `POST /trades` without `otp_code` → `403 {code:"OTP_REQUIRED", message:"کد تأیید لازم است"}`; same modal with `purpose:"trade"`. |

Step-up codes: 6 digits, TTL 3 min, single-use, verified against the bearer user's mobile.

### 4.4 Roles & route authorization

Roles: `customer`, `dealer`, `staff`, `admin` (`users.role`).

| API prefix | Allowed roles | Frontend route guarded |
|---|---|---|
| `/auth/*` | public | `/login`, `/otp` |
| Public reads: `/pricing/spot`, `/pricing/history`, `/catalog/*`, `/faq`, `/contact` | public | storefront |
| `/me/*`, `/wallets/*`, `/trades/*`, `/cart*`, `/checkout`, `/orders`, `/invoices`, `/portfolio/*`, `/auto-invest/*`, `/installments/*`, `/gifts`, `/tickets`, `/notifications`, `/pricing/alerts`, `/buyback-requests`, `/deliveries` | `customer`, `dealer` | `/app/*` |
| `/dealer/*` | `dealer` (+`admin` read) | `/app/dealer` |
| `/staff/*` | `staff`, `admin` | `/staff/*` |
| `/admin/*` | `admin` | `/admin/*` |

- Wrong role → `403 {code:"FORBIDDEN"}` → frontend renders **Error403Page**.
- Guest hitting a guarded route → frontend redirects to `/login` (state carries `from`).
- **Resource-level rules:** customers see only their own orders/invoices/tickets/wallets/notifications; `GET /orders/{id}` resolves by numeric `id` **or** by `number` (`ZRVORD-2026-0901`) but only within the caller's scope; staff read all orders/tickets/customers (customers **read-only**); admins write everywhere. **No impersonation endpoint exists** (out of scope by design).

---

## 5. Validation rules (global)

| Field | Rule | Persian error copy |
|---|---|---|
| `mobile` | required, regex `^09\d{9}$` | «شماره موبایل نامعتبر است» |
| `otp code` | required, exactly 6 digits | «کد واردشده نامعتبر است» |
| `password` | min 6 chars | «رمز عبور باید حداقل ۶ کاراکتر باشد» |
| `amount_irr` / money fields | integer ≥ 0 | «مبلغ نامعتبر است» |
| `weight_mg` | integer ≥ 1 | «وزن نامعتبر است» |
| `iban` | required for withdraw, `^IR\d{24}$` | «شبا نامعتبر است» |
| `postal_code` | 10 digits | «کد پستی نامعتبر است» |
| `day_of_month` | 1–28 (auto-invest) | «روز ماه باید بین ۱ تا ۲۸ باشد» |
| `percent value` | 1–90 | «درصد تخفیف نامعتبر است» |
| `enum` fields | must match union (e.g. `fulfillment ∈ vault\|delivery`) | «مقدار نامعتبر است» |
| uploads | see §7 | «فایل پذیرفته نمی‌شود» |

Unauthenticated/unknown-entity validation still returns `422` with field `errors` so the UI can render inline messages.

---

## 6. Application error-code registry

| HTTP | `code` | Canonical `message` (fa) | Thrown by |
|---|---|---|---|
| 401 | `AUTH_EXPIRED` | «نشست منقضی شد» | any guarded endpoint |
| 403 | `FORBIDDEN` | «دسترسی مجاز نیست» | role mismatch |
| 403 | `OTP_REQUIRED` | «کد تأیید لازم است» | withdraw, sell trade, admin wallet adjust (optional policy) |
| 403 | `KYC_REQUIRED` | «برای ارسال فیزیکی ابتدا احراز هویت را تکمیل کنید» | checkout with `fulfillment=delivery` when `kyc_status ≠ approved` |
| 404 | `NOT_FOUND` | «سفارش پیدا نشد» / «محصول پیدا نشد» / … | missing resource in scope |
| 409 | `QUOTE_EXPIRED` | «قیمت منقضی شد» | `POST /trades` after `trade_quotes.expires_at`; also checkout when cart `quote_expires_at` passed |
| 409 | `CONFLICT` | «این عملیات اکنون ممکن نیست» | e.g. cancelling a paid order via race |
| 422 | `VALIDATION_ERROR` | «ورودی‌ها را بررسی کنید» (+ `errors`) | field validation |
| 422 | `INSUFFICIENT_BALANCE` | «موجودی کافی نیست» / «موجودی طلای کافی نیست» | buy trade (IRR), sell trade / gift (gold) |
| 422 | `MIN_TRADE_WEIGHT` | «حداقل وزن معامله {min} میلی‌گرم است» | quote below `settings.min_trade_mg` (100) |
| 422 | `MIN_BUYBACK_WEIGHT` | «حداقل وزن بازخرید ۵۰۰ میلی‌گرم است» | buyback < 500 mg |
| 422 | `COUPON_INVALID` | «کد تخفیف نامعتبر» | inactive/unknown/exhausted/expired/below `min_order_irr` |
| 422 | `CART_EMPTY` | «سبد خرید خالی است» | checkout with 0 lines |
| 422 | `ORDER_PAID` | «سفارش پرداخت‌شده قابل لغو نیست» | cancel after payment |
| 422 | `REASON_REQUIRED` | «دلیل اصلاح الزامی است» | admin wallet adjustment w/o reason |
| 422 | `OTP_INVALID` | «کد واردشده نامعتبر است» | wrong/expired OTP |
| 422 | `CREDENTIALS_INVALID` | «شماره موبایل یا رمز عبور نادرست است» | password login |
| 422 | `HALT_CONFIRMATION` | «برای توقف معاملات عبارت HALT را وارد کنید» | admin halt without typed token |
| 429 | `RATE_LIMITED` | «تعداد درخواست بیش از حد مجاز است» | OTP send burst |
| 503 | `TRADING_HALTED` | «معاملات موقتاً متوقف است» | quote/trade endpoints while `settings.trading_halt` |

---

## 7. File & media handling

| Uploader (UI) | Endpoint | Files | Constraints |
|---|---|---|---|
| `KycPage` FileDropzone ×3 (ID card, national card, selfie) | `POST /me/kyc/documents` (multipart `file`, `kind ∈ id_card\|national_card\|selfie`) | jpg/png/webp | ≤ 5 MB; kind required; replaces previous doc of same kind |
| `BuybackPage` photo | `POST /uploads` (multipart `file`, `context=buyback`) | jpg/png/webp | ≤ 8 MB; returns `{data:{url}}` saved as `buyback_requests.photo_url` |
| `AdminProductsPage` images + 360 frames | `POST /admin/products/{id}/media` (multipart `files[]`, `kind ∈ image\|frame360`) | jpg/png/webp | ≤ 5 MB each; max 8 images, 36 frames; ordered by upload sequence |

- Storage: private S3-compatible disk; served via signed URLs (15 min) through `GET /media/{uuid}`.
- `files` table tracks `disk, path, mime, size_bytes, context, context_id, uploaded_by`.
- Deletion/replacement: uploading a new `kind` for KYC soft-supersedes the old row (`superseded_at`); product media deletable via `DELETE /admin/products/{id}/media/{fileId}`.
- Invoice PDF: generated server-side (`invoices.pdf_url`), `GET /invoices/{id}/pdf` streams `application/pdf` (authorized owner or staff/admin). Filename `ZRV-2026-00012.pdf`.

## 8. Pagination, search, filtering, sorting

- Default `per_page=15`, max `100` (matches UI `Pagination`, «۱۵ در هر صفحه»).
- Page-based (`?page=&per_page=`) everywhere; ledger/notifications may additionally accept `?before_id=` for infinite scroll (optional).
- Search params are always `q` (partial, case-insensitive, matches the fields listed per endpoint).
- Filters are query params mirroring the UI controls (documented per endpoint). Unknown filter values → ignored (never 500).
- Default order is documented per endpoint (usually `created_at desc`).
- Empty list → `{data: [], meta: {current_page:1, per_page:15, total:0, last_page:1}}`; UI renders its EmptyState.

## 9. Rate limits & security

| Bucket | Limit | Headers |
|---|---|---|
| `POST /auth/otp/send` | 3 / min / mobile, 10 / hour / mobile | `Retry-After` |
| `POST /auth/otp/verify` | 10 / min / mobile (lockout 15 min after 5 wrong) | — |
| Trading (`/trades/quote`, `/trades`) | 30 / min / user | — |
| Global per IP | 300 / min | `X-RateLimit-*` |

- All money math in integers; wallet mutations inside a DB transaction with `SELECT ... FOR UPDATE`; `wallet_ledger` is append-only and `wallets.balance` must always equal the last `balance_after` (nightly reconcile job).
- Every money/status mutation writes an `audit_logs` row (`actor_id, action, subject_type/id, payload_hash, ip`).
- CSP/CORS: allow only the SPA origin; API sets `Cache-Control: no-store` on authenticated JSON.

## 10. Background jobs the UI implies

| Job | Trigger | Effect visible in UI |
|---|---|---|
| `IngestSpotPrices` | cron every 60 s (or feed push) | ticker staleness (`stale_seconds`), charts, quotes |
| `ExpireTradeQuotes` | every 10 s | `trade_quotes.status → expired`; confirm returns 409 |
| `EvaluatePriceAlerts` | on each new snapshot | creates `notifications` (type `price`); respects `notification_preferences.price_alerts` |
| `RunAutoInvestPlans` | daily at 00:30 | buys gold at spot, ledger entry `auto_invest`, notif |
| `InstallmentDueNotifier` | daily | notif 2 days before due date |
| `AbandonCarts` | hourly | carts idle > 24 h → `abandoned` (admin funnel) |
| `SweepAwaitingPayments` | every 15 min | orders `awaiting_payment` > 30 min → `cancelled` (restores stock) |
| `GenerateInvoicePdf` | on payment success | `invoices.pdf_url` becomes available |
| `ReconcileVaultSolvency` | nightly | `solvency` widget numbers + alert admins if ratio < 95% |
| `PspWebhookHandler` | PSP callback | flips `payments.status`, marks order paid, issues invoice, credits vault gold |

## 11. Settings singleton (contract for `GET/PATCH /admin/settings`)

Exact keys, types and current defaults (from `settingsDb`):

| Key | Type | Default | Validation |
|---|---|---|---|
| `bid_bps` | int | 60 | 0–500 |
| `ask_bps` | int | 45 | 0–500 |
| `quote_ttl_sec` | int | 18 | 5–120 |
| `slippage_bps` | int | 10 | 0–100 |
| `min_trade_mg` | int | 100 | 10–100000 |
| `unverified_daily_cap_irr` | int | 50000000 | ≥ 0 |
| `otp_enabled` | bool | true | — |
| `vat_pct` | int | 0 | 0–20 |
| `invoice_legal_name` | string | «شرکت طلای زرون (سهامی خاص)» | ≤ 120 |
| `invoice_reg_no` | string | «۵۴۸۹۳۲» | ≤ 40 |
| `psp` | string | «به‌پرداخت ملت» | enum of configured drivers |
| `sms_provider` | string | «کاوه‌نگار» | enum |
| `vault_address` | string | Tehran… | ≤ 255 |
| `maintenance` | bool | false | when true, storefront APIs return `503` (except `/health`) |
| `trading_halt` | bool | false | gates `/trades/*` with `503 TRADING_HALTED` |

`PATCH` accepts a partial object; every change is audit-logged; halt changes additionally require `confirm_token:"HALT"` in the payload (UI `HaltTradingModal` types it).
