# Zarvan Gold — Backend API Specification · Part 0: Foundation

> Companion documents: `01-api-customer.md` (public + customer + dealer), `02-api-staff-admin.md` (staff + admin), `03-database-erd.md` (schema/ERD), `04-mapping-audit.md` (UI↔API mapping + coverage audit).
>
> This spec is generated from the shipped SPA (every page/component listed in `04-mapping-audit.md`). A Laravel backend can be built directly from these four documents.

---

## 1. General conventions

| Item | Value |
|---|---|
| Base URL | `{VITE_API_URL}` → production `https://api.zarvan.example/api/v1` |
| Format | JSON only (`Content-Type: application/json`), except uploads (multipart) and PDF/binary downloads |
| Charset | UTF-8. Persian text is stored/returned as-is; the API never transliterates |
| Money | **integer Iranian Rials (IRR)**, field suffix `_irr`. Never floats. |
| Mass | **integer milligrams (mg)**, field suffix `_mg`. 1 gram = 1000 mg. |
| Basis points | integer `_bps` (1 bp = 0.01%) |
| Dates | ISO-8601 UTC (`2026-08-13T09:42:11Z`). Client converts to Jalali for display. |
| IDs | unsigned bigint, sequential, exposed as numbers |
| Idempotency | Mutating money endpoints (`/wallets/withdraw`, `/quotes/{id}/confirm`, `/orders`, `/payments/{id}/refund`, `/installments/{id}/payments`) accept header `Idempotency-Key: <uuid>`; replay within 24h returns the original result |
| Rate limits | Global 120 req/min per token (header `X-RateLimit-Remaining`). OTP send: 5/10min per mobile. Login verify: 5 attempts/10min. 429 body follows the error envelope with `retry_after` |
| CORS | Storefront origin + admin origin |
| Timezone | DB UTC; business reports convert to Asia/Tehran |

## 2. Standard response envelope

All responses use one of two shapes. UI code (`src/api`) expects exactly these.

### 2.1 Single resource / object

```json
{ "data": { "id": 1, "name": "سارا کریمی" } }
```

### 2.2 Paginated list (Laravel ResourceCollection shape — UI reads `data`, `meta`, `links`)

```json
{
  "data": [ { "id": 1 } ],
  "meta": { "current_page": 1, "per_page": 15, "total": 34, "last_page": 3 },
  "links": { "first": "...?page=1", "last": "...?page=3", "prev": null, "next": "...?page=2" }
}
```

- Default `per_page=15` (UI `Pagination` default), max `per_page=100`.
- Non-paginated small collections (e.g. `GET /prices/spot`, `GET /categories`, `GET /cart`) may return `{ "data": [...] }` without meta. UI handles both via `Array.isArray(data) ? data : data.data`.

### 2.3 Mutation acknowledgement

```json
{ "data": { "ok": true } }        // or the created/updated resource
```

## 3. Error envelope & status codes

```json
{
  "message": "نقل‌قول منقضی شده است",
  "code": "QUOTE_EXPIRED",
  "errors": { "code": ["کد واردشده نامعتبر است"] },
  "retry_after": 18,
  "trace_id": "01J9ZK3..."
}
```

`message` is always user-presentable Persian (UI toasts it verbatim). `code` is a stable machine string. `errors` only on 422 (field → messages, matching `ApiError` in `src/api/index.ts`).

| HTTP | When | Example `code` |
|---|---|---|
| 400 | Malformed request / business rule | `INVALID_RANGE` |
| 401 | Missing/invalid/expired token | `UNAUTHENTICATED` → UI: logout + «نشست منقضی شد» toast, redirect `/login` |
| 403 | Authenticated, wrong role / resource-level | `ROLE_FORBIDDEN` → UI routes to `/403` |
| 404 | Resource missing (incl. hidden by scope) | `NOT_FOUND` |
| 409 | State conflict | `QUOTE_EXPIRED` (trade TTL), `COUPON_INVALID`, `INSUFFICIENT_BALANCE`, `OTP_REQUIRED` (withdraw/sell step-up), `OUT_OF_STOCK`, `ALREADY_REFUNDED`, `ORDER_NOT_CANCELLABLE` |
| 422 | Validation failure | `VALIDATION_FAILED` (+ `errors` map) |
| 423 | Trading halted | `TRADING_HALTED` → UI red banner, buttons disabled |
| 429 | Rate limit | `RATE_LIMITED` + `retry_after` |
| 500 | Server error | `SERVER_ERROR` → UI ErrorState + Retry; `/500` page |
| 503 | Maintenance | `MAINTENANCE` + `retry_after` → UI `/maintenance` page |

### Application error code registry (complete)

`UNAUTHENTICATED`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_REQUIRED`, `OTP_RATE_LIMITED`, `CREDENTIALS_INVALID`, `ROLE_FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `QUOTE_EXPIRED`, `QUOTE_TTL_TOO_SHORT`, `TRADING_HALTED`, `STALE_PRICE` (warning only, 200 body carries `stale_seconds`), `INSUFFICIENT_BALANCE`, `INSUFFICIENT_GOLD`, `DAILY_CAP_UNVERIFIED` (unverified-KYC trade cap), `KYC_REQUIRED` (delivery fulfillment blocked), `KYC_PENDING`, `OUT_OF_STOCK`, `MAX_QTY_EXCEEDED`, `COUPON_INVALID` (inactive/expired/min-order/uses exceeded), `GIFT_NOT_FOUND`, `GIFT_ALREADY_REDEEMED`, `ADDRESS_REQUIRED`, `ORDER_NOT_CANCELLABLE`, `ALREADY_REFUNDED`, `REFUND_EXCEEDS_PAYMENT`, `IBAN_INVALID`, `UPLOAD_TOO_LARGE`, `UPLOAD_TYPE_INVALID`, `HALT_CONFIRMATION` (admin halt without typing HALT), `RATE_LIMITED`, `MAINTENANCE`, `SERVER_ERROR`.

## 4. Authentication

### 4.1 Flows implemented by the UI

1. **OTP login/register (primary)** — `LoginPage` → `OtpPage`. First successful verify auto-creates the account (registration = OTP-first; UI copy states this). Optional referral code captured at verify.
2. **Password login** — `PasswordLoginPage`.
3. **Password reset / forgot** — link goes through the OTP flow (`/otp`), then `PUT /auth/password` with the verified OTP.
4. **OTP step-up** for sensitive operations: withdraw and sell trades (`OtpStepUpModal`) — new 6-digit OTP with `purpose=withdraw|trade`, verified inline by including `otp_code` in the sensitive request (single-use, binds to the operation, 10 min TTL).
5. **Logout** — sidebar/topbar «خروج» + forced on 401.

### 4.2 Token handling

- Bearer JWT (or Sanctum tokens) in `Authorization: Bearer <token>`; UI stores the **user id flag** in `localStorage` and the token in memory/localStorage (`zarvan_token`). Backend must accept both `Authorization` header and `?api_token=` fallback for PDF/binary downloads.
- Access token TTL 24h; **refresh token** (httpOnly cookie `zarvan_refresh`, 30d, rotation) via `POST /auth/refresh`. On 401 the client calls refresh once, then retries the request, else logout.
- `GET /auth/me` is called on every app boot (`AuthProvider`) — must be cheap (≤50ms) and include `kyc_status`, `role`, `referral_code`.

### 4.3 Role matrix (resource-level authorization)

| Role | Scope |
|---|---|
| `guest` | Public pricing/catalog/prices history/snapshots, contact form, size-guide save is login-gated |
| `customer` | Own resources only (`/me/*`, own orders/tickets/wallets/trades). Cannot read other users. |
| `dealer` | customer scope + `/dealer/*` (bulk orders, wholesale quotes) |
| `staff` | staff scope: KYC queue review, order status/tracking, inventory adjust, ticket reply/assign/close, customer search (read-only). No admin settings, no refunds, no role changes. |
| `admin` | everything in `/admin/*` incl. settings, broadcast, refunds, wallet adjustments, halt |

Wrong role on any `/admin/*` → 403 `ROLE_FORBIDDEN`; wrong role on `/staff/*` → 403; guest on `/me/*` → 401. UI maps 403 → `Error403Page`, guest-on-`/app/*` → redirect `/login` with `state.from`.

## 5. Validation rules (global)

| Field | Rule |
|---|---|
| `mobile` | `required`, Iran mobile regex `^09\d{9}$` (Persian digits normalized server-side to ASCII) |
| `code` (OTP) | `required`, exactly 6 ASCII digits |
| `amount_irr` | `integer`, `min:10000` (۱۰ هزار ریال floor), `max:50,000,000,000` |
| `weight_mg` | `integer`, `min: settings.min_trade_mg` (default 100), `max: 100,000,000` |
| `iban` | `required_with:withdraw`, `regex:^IR\d{24}$` |
| `otp_code` (step-up) | `required` on `POST /me/wallets/withdraw` and sell `POST /quotes/{id}/confirm` |
| `reason` (wallet adjust / refund / KYC reject) | `required`, `min:5`, `max:500` — never optional (UI enforces too) |
| `coupon_code` | `alpha_dash`, `max:32` |
| `password` | `min:8`, must contain digit+letter |
| `day_of_month` | `1..28` (avoid month-length issues; UI slider matches) |
| Files | see §7 |

Unverified-KYC caps (settings-driven): trade ≤ `unverified_max_trade_irr` (default 50,000,000), withdraw disabled until `approved` — return 409 `DAILY_CAP_UNVERIFIED` / `KYC_REQUIRED`.

## 6. Pagination / search / filtering / sorting (standard)

All list endpoints support:

| Param | Notes |
|---|---|
| `page` (≥1) | default 1 |
| `per_page` | default 15, max 100 |
| `q` | case-insensitive `LIKE %q%` over documented searchable columns |
| `sort` | `-created_at` default; whitelisted per endpoint (documented per endpoint) |
| filters | per endpoint |

Empty result → 200 with `data: []`, `meta.total: 0` (UI renders `EmptyState`).

## 7. File & media handling

Used by: KYC uploads (`FileDropzone` on `KycPage`), product images + 360 frames (`AdminProductsPage` dropzone), buyback photo (`BuybackPage`).

**Endpoint:** `POST /uploads` (auth) — multipart, field `file` + `type` ∈ `kyc_document|product_image|product_360|buyback_photo|avatar`.

| Rule | Value |
|---|---|
| MIME | `image/jpeg,image/png,image/webp` (KYC also `application/pdf`) |
| Size | ≤ 5 MB (KYC), ≤ 8 MB (product), ≤ 10 MB (360 frames, bulk `files[]` max 36 frames) |
| Storage | private disk for KYC (signed URLs, 15 min TTL); public CDN disk for catalog media |
| Response | `{ "data": { "id": 12, "url": "...", "path": "kyc/...", "mime": "...", "bytes": 312000 } }` |
| Replace/delete | `DELETE /uploads/{id}` — owner or staff/admin; KYC docs immutable after review starts (409) |
| Antivirus/clamAV | recommended pipeline hook for KYC (non-functional requirement) |

PDF download (invoices): `GET /invoices/{id}/pdf` → `200 application/pdf`, `Content-Disposition: inline; filename=ZRV-2026-00012.pdf`, auth via token query fallback.

## 8. Webhooks / outbound (backend responsibilities implied by UI states)

- Payment gateway (PSP/Shetab) callback `POST /webhooks/psp` — verify signature, mark `payments.status=paid`, transition order `awaiting_payment → paid → reserved/processing`, issue `invoices`, credit ledger («فاکتور آماده است» toast is triggered by polling `GET /orders/{id}`; optionally push via notification).
- SMS provider webhook for delivery codes — appends `shipment_events`.
- Price feed cron (every 30s) → inserts `spot_price_snapshots`; staleness computed as `now - observed_at` (UI shows amber when `stale_seconds ≥ 60`).
- Scheduler: auto-invest execution (`day_of_month`), installment due reminders, abandoned cart (24h), OTP cleanup, referral reward settlement (`pending → paid` after referee's first trade).
