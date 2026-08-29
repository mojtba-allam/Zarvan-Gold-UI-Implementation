# Zarvan Gold — Backend API Specification · Part 2: Staff & Admin

All endpoints: `A:` + role in header. Staff = `staff|admin`; Admin = `admin` only. Wrong role → 403 `ROLE_FORBIDDEN`. Conventions from Part 0 apply.

---

## Module M — Staff panel (`/staff/*`)

### M1. Staff dashboard — `GET /staff/dashboard`
**UI:** `StaffDashboardPage` (queue counts + orders-by-status bar chart today).
```json
{ "data": { "queues": { "kyc_pending": 6, "tickets_open": 3, "awaiting_payment": 2, "processing": 4, "delivery_requests": 2, "buyback_requests": 1 },
  "orders_by_status_today": [ { "status": "paid", "count": 5 }, { "status": "processing", "count": 3 } ] } }
```

### M2. Staff orders — `GET /staff/orders?status=&q=&fulfillment=&page=`
**UI:** `StaffOrdersPage` (filters, status dropdown, ثبت رهگیری modal, چاپ لیبل). Same `Order` shape as customer + `customer` embed. Sortable `-created_at`.

### M3. Update order status / tracking — `PATCH /staff/orders/{id}/status`
Body `{ "status": OrderStatus, "tracking_code"?, "carrier"? }`.
Rules: forward-only transition map (draft→awaiting_payment→paid→reserved→processing→vaulted|shipped→delivered; cancelled/refunded are terminal-ish). Setting `shipped` **requires** `tracking_code` + `carrier` (422) → creates `shipments` + first `shipment_events` row, notification to customer. «چاپ لیبل» = `GET /staff/orders/{id}/label` → PDF (A4 ZPL-style). Table `orders`, `shipments`, `shipment_events`.

### M4. KYC review —
- `GET /staff/kyc/queue?status=pending&page=` → `(User & { submitted_at, documents[] })[]`. **UI:** `StaffKycPage` queue cards.
- `POST /staff/kyc/{user_id}/approve` — sets `approved`, `reviewed_at`, notification `kyc_approved`. **UI:** «تأیید».
- `POST /staff/kyc/{user_id}/reject` `{ "reason" }` (required ≥5 chars) — `rejected`, notification with reason. **UI:** `RejectKycModal` (رد مدارک).
Tables `users.kyc_status`, `kyc_submissions`.

### M5. Staff inventory — `GET /staff/inventory?low=1&q=` and `PATCH /staff/inventory/{sku}` `{ "qty" }`
**UI:** `StaffInventoryPage` (inline edit, low-stock warning at `qty ≤ reorder_point`). Adjustment writes `inventory_movements(reason="manual", by_user_id)`. Tables `products.stock_on_hand`, `inventory_movements`.

### M6. Staff tickets —
- `GET /staff/tickets?status=&type=&priority=&assignee=me&page=` — **UI:** `StaffTicketsPage`.
- `PATCH /staff/tickets/{id}` `{ "status"?, "priority"?, "assignee_id"? }` — assign/close.
- `POST /staff/tickets/{id}/messages` `{ "body" }` — `is_staff=true`, sets ticket `status=pending` (awaiting customer), notification. **UI:** reply.

### M7. Staff customers (read-only) — `GET /staff/customers?q=&kyc=&page=`
**UI:** `StaffCustomersPage` search + open-orders count. Returns masked fields (no email unless KYC reviewer), `open_orders_count`, wallet balances. **No** mutation endpoints — write attempts → 403.

---

## Module N — Admin panel (`/admin/*`)

### N1. Admin dashboard — `GET /admin/dashboard?range=7|30|90`
**UI:** `AdminDashboardPage` — powers the KPI row (sales 1.854B IRR, gold 520,000 mg, open orders 14, KYC pending 6, spot 3,520,000, new customers 118) and **all 8 mandatory charts**.
```json
{ "data": {
  "kpis": [ { "label": "فروش ۳۰ روز", "value": 1854000000, "delta": 12.4, "sparkline": [40,55,...] } ],
  "sales_irr_30d": [ { "t": "...", "value": 61500000 } ],
  "gold_volume_mg_30d": [ { "t": "...", "value": 17400 } ],
  "spot_90d": [ { "t": "...", "value": 3520000 } ],
  "orders_funnel": [ { "key": "awaiting", "label": "در انتظار پرداخت", "count": 9 }, ... ],
  "inventory_health": [ { "sku": "BR-18-221", "level": "low", "qty": 2 } ],
  "kyc_funnel": [ { "key": "unverified", "label": "...", "count": 41 }, ... ],
  "solvency": { "vault_mg": 1240000, "liabilities_mg": 1193680, "ratio_pct": 96.3 },
  "new_customers_30d": [3,5,2,...]
} }
```
Computed from `orders`, `trades`, `spot_price_snapshots`, `users`, `kyc_submissions`, `vault_lots`/`wallets`. `range` rescales sales/volume/new-customers series.

### N2. Products CRUD —
- `GET /admin/products?q=&type=&status=&page=` — includes `draft|inactive` (customer list excludes). **UI:** `AdminProductsPage` table.
- `POST /admin/products` / `PUT /admin/products/{id}` — body: `{ sku, name, slug?, type, category_id, karat, weight_mg, making_charge_type: "flat"|"per_gram", making_charge_irr, occasion?, description?, attributes?, status: "draft"|"active"|"inactive", media_ids[] }`. Validation: `sku` unique, `weight_mg ≥ 1`, per_gram making ≥ 0. 422 field errors shown inline.
- `POST /admin/products/{id}/publish` / `/unpublish` — sets `status` + `published_at`.
- `DELETE /admin/products/{id}` — **soft delete**; 409 if referenced by active cart lines or open orders. **UI:** `DeleteProductModal`. Restore: `POST /admin/products/{id}/restore`.
- Media: `POST /admin/products/{id}/media` multipart `files[]` (photo or 360 frames via `kind`), `DELETE /admin/products/{id}/media/{media_id}`.
Tables `products` (softDeletes), `product_media`, `categories`.

### N3. Categories —
- `GET /admin/categories` (tree incl. inactive), `POST` / `PUT /{id}` `{ parent_id, name, slug, type, sort_order, is_active }`, `DELETE /{id}` (409 if has products → reassign first).
- `PATCH /admin/categories/reorder` `{ "ordered_ids": [3,1,2] }` — **UI:** reorder buttons. Table `categories`.

### N4. Inventory & vault —
- `GET /admin/inventory?level=&q=` → rows `{ sku, product, on_hand, reserved, reorder_point, updated_at }` + vault lots. **UI:** `AdminInventoryPage`.
- `PATCH /admin/inventory/{sku}` `{ "qty", "reason" }` — movement audit.
- `POST /admin/inventory/vault-lots` `{ "weight_mg", "karat", "ref", "supplier" }` — «افزودن لات»; increases `vault_lots` + solvency numerator.
- `GET /admin/inventory/solvency` → `SolvencyGauge` (live). Tables `vault_lots`, `inventory_movements`.

### N5. Pricing control —
- `GET /admin/pricing` → current spot both karats + `stale_seconds` + `spread: SpreadSettings { bid_bps, ask_bps }` + `trading_halt` + mini history. **UI:** `AdminPricingPage`.
- `POST /admin/pricing/spot` `{ "karat", "price_irr_per_gram", "source": "manual" }` — manual override; inserts snapshot, resets staleness. (Feed source inserts via cron, `source="feed"`.)
- `PUT /admin/pricing/spread` `{ "bid_bps", "ask_bps" }` — 0..500; affects C1 bid/ask immediately. **UI:** spread save.
- `POST /admin/pricing/halt` `{ "halt": true }` — **requires body `confirm_text: "HALT"`** else 422 `HALT_CONFIRMATION` (**UI:** `HaltTradingModal` type-HALT confirm). Sets `settings.trading_halt`, surfaces in C1, blocks quotes/confirms (423). Table `settings` + `pricing_events` audit log.

### N6. Admin orders — `GET /admin/orders?status=&fulfillment=&q=&from=&to=&page=&sort=` + CSV
**UI:** `AdminOrdersPage` (advanced filters, CSV export, staff status tools reuse M3). `?format=csv` → stream; progress toast client-side. Same transition rules; admin may also `refund` via payments.

### N7. Payments —
- `GET /admin/payments?status=&driver=&q=&page=` — joins order/customer names. **UI:** `AdminPaymentsPage` (sandbox badge when `settings.env != production`).
- `POST /admin/payments/{id}/refund` `{ "amount_irr", "reason" }` — **UI:** `RefundModal`. Full/partial; ≤ paid−refunded (409 `REFUND_EXCEEDS_PAYMENT`), only `status=paid` (409 `ALREADY_REFUNDED`→`refunded`), credits customer IRR wallet + ledger, marks invoice void. Tables `payments`, `payment_refunds`, `wallet_ledgers`.

### N8. Admin invoices — `GET /admin/invoices?q=&from=&to=&page=` + `GET /invoices/{id}/pdf` (same as customer, admin-scoped). **UI:** `AdminInvoicesPage`.

### N9. Admin customers —
- `GET /admin/customers?role=&kyc=&q=&page=` — balances embed. **UI:** `AdminCustomersPage` drawer.
- `PATCH /admin/users/{id}/role` `{ "role" }` — «تغییر نقش»; audit log; cannot demote self/last admin (422). **No impersonation endpoint** (out of scope v1). Tables `users`, `audit_logs`.

### N10. Wallet operations —
- `GET /admin/wallets?q=` — search by name/mobile → `{ data: { user, wallets: Wallet[] } }`. **UI:** `AdminWalletsPage`.
- `GET /admin/wallets/{user_id}/ledger?currency=&page=`.
- `POST /admin/wallets/{user_id}/adjust` `{ "currency": "irr"|"gold_mg", "amount", "direction": "credit"|"debit", "reason" }` — reason required; debit ≤ balance (409); writes ledger `reason="adjustment: …"`, `reference_type=admin_adjustment`. **UI:** adjustment modal (confirm + reason). Tables `wallets`, `wallet_ledgers`, `audit_logs`.

### N11. Promotions —
- Coupons: `GET /admin/coupons?page=`, `POST` `{ code, type: "percent"|"fixed_irr", value, max_uses?, min_order_irr?, expires_at?, is_active }` (code unique, percent 1..90), `PATCH /{id}` (edit/toggle), `DELETE /{id}` (soft; redeemed history kept). **UI:** `AdminPromotionsPage` coupons tab + form.
- Gifts: `GET /admin/gifts?status=&page=` (all users' gifts, read + aggregate mg).
- Referrals: `GET /admin/referrals/stats` → totals + top referrers. Cashback tab: `GET /admin/cashback/stats`.
Tables `coupons`, `coupon_redemptions`, `gift_cards`, `referrals`.

### N12. Reports — `GET /admin/reports?from=&to=`
**UI:** `ReportsPage` (date range; same chart payloads as N1 for chosen window) + CSV exports:
`GET /admin/reports/sales.csv`, `/gold-volume.csv`, `/orders.csv`, `/ledger.csv`, `/kyc.csv` — each 200 `text/csv` async-safe (≤50k rows) with progress toast client-side. Table: derived from core tables.

### N13. Staff management —
- `GET /admin/staff` → staff+admin users with `is_active`. **UI:** `AdminStaffPage`.
- `POST /admin/staff/invite` `{ "mobile", "role": "staff"|"admin" }` — creates inactive user + `staff_invites` + SMS with first-login OTP. 409 if mobile exists.
- `POST /admin/staff/{id}/deactivate` / `/activate` — revokes tokens; cannot deactivate self. Tables `users`, `staff_invites`, `audit_logs`.

### N14. Settings — `GET /admin/settings`, `PATCH /admin/settings`
**UI:** `AdminSettingsPage` + halt switches on Dashboard/Pricing. Single `settings` JSON row keyed singleton. Fields (all validated):
`bid_bps, ask_bps, quote_ttl_seconds (5..120), slippage_max_bps, min_trade_mg, unverified_max_trade_irr, otp_length, otp_ttl_seconds, vat_pct, invoice_legal { company_name, reg_no, economic_code, address }, psp { driver, merchant_id, sandbox: bool }, sms { provider, enabled }, vault_address, maintenance_mode: bool, trading_halt: bool, luxury_packaging_irr, cart_quote_ttl_seconds, dealer_spread_bps`.
`maintenance_mode=true` → all non-admin routes return 503 `MAINTENANCE` (**UI:** `MaintenancePage`). Audit every change.

### N15. Broadcast — `POST /admin/broadcast`
**UI:** `AdminBroadcastPage` (title/body/channel + «ارسال همگانی» confirm).
Body `{ "title", "body", "channels": ["in_app","sms","email"] }` → queues `notifications(type=broadcast)` for all active customers per their `notification_preferences`. 201 `{ data: { queued: 1184 } }`. Table `notifications`, `broadcasts` (history).

---

## Module O — System / health

- `P:` `GET /health` → `{ data: { status: "ok", db: true, feed_age_s: 12, version } }` (used by ops + future offline banner logic).
- `A:`(admin) `GET /admin/audit-logs?user=&action=&page=` — every sensitive action above writes here.
- `P:` `GET /webhooks/psp` (signature-verified), `GET /webhooks/carrier` — never exposed to UI.

---

## P. Authorization summary (staff vs admin)

| Capability | staff | admin |
|---|---|---|
| KYC approve/reject | ✅ | ✅ |
| Order status + tracking | ✅ | ✅ |
| Inventory adjust | ✅ (with reason) | ✅ |
| Ticket assign/reply/close | ✅ | ✅ |
| Customer search (read) | ✅ | ✅ |
| Refunds | ❌ (403) | ✅ |
| Wallet adjustments | ❌ (403) | ✅ |
| Role changes / staff invites | ❌ | ✅ |
| Pricing manual/spread/halt | ❌ | ✅ |
| Settings / broadcast / reports | ❌ | ✅ |
| Product/category CRUD | ❌ | ✅ |
