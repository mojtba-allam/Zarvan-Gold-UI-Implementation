# Zarvan Gold — Backend API Specification · Part 2: Staff & Admin

> Conventions: `00-foundation.md`. Tags: **S** staff, **A** admin. Staff = operations (read-heavy +
> order/KYC/inventory/ticket ops). Admin = full control including money adjustments and settings.
> All actions in this document are audit-logged (`audit_logs`).

---

## Module M — Staff console (`/staff/*`, roles: staff, admin)

### M1. Staff dashboard — `GET /staff/dashboard`
**UI:** `StaffDashboardPage` — queue count cards + «سفارش‌های امروز بر اساس وضعیت» bar chart.
**Success 200:**
```json
{ "data": {
  "queues": { "kyc_pending": 6, "tickets_open": 4, "orders_awaiting_fulfillment": 9, "buybacks_pending": 2 },
  "orders_by_status_today": [ { "key": "paid", "label": "پرداخت‌شده", "count": 7 }, { "key": "processing", "label": "در حال پردازش", "count": 3 }, { "key": "shipped", "label": "ارسال‌شده", "count": 2 } ]
} }
```

### M2. Orders (all customers) — `GET /staff/orders?q=&status=&fulfillment=&page=&per_page=`
**UI:** `StaffOrdersPage` — filters, status dropdown, «ثبت رهگیری» modal, «چاپ لیبل» (client print).
- `q` matches `number` or customer name/mobile.
**Success 200:** `ApiList<Order & { customer: {id,name,mobile} }>` (same Order shape as customer API, plus `customer`).
**Writable subset:** staff may only transition within the fulfillment path:
`awaiting_payment → paid` (manual mark after bank transfer proof), `paid → processing`, `processing → shipped` (tracking required), `shipped → delivered`, any pre-ship → `cancelled` (auto-refund if paid). Illegal transition → `422` «تغییر وضعیت مجاز نیست».

### M3. Update order status — `PATCH /staff/orders/{id}/status`
**UI:** status `Select` + tracking modal.
**Body:** `{ "status": "shipped", "carrier": "پست جمهوری اسلامی", "tracking_code": "IRPOST-883421" }`
- `tracking_code` **required** for `shipped` (`422` «کد رهگیری الزامی است»); creates/updates `shipments` + appends `shipment_events` (timeline labels auto: «تحویل به پست — کد رهگیری …»); `delivered` sets `delivered_at` and releases `inventory.reserved → on_hand` decrement.
**Success 200:** `{ "data": { …Order with updated shipment } }`; notifies customer (type `order`).

### M4. KYC queue — `GET /staff/kyc?status=pending&q=&page=`
**UI:** `StaffKycPage` queue cards (name, mobile, submitted_at, status, actions).
**Success 200:** `ApiList<{ …User, "submitted_at": "2026-08-12T09:00:00Z", "documents": [ { "kind": "id_card", "url": "…" }, { "kind": "national_card", "url": "…" }, { "kind": "selfie", "url": "…" } ] }>`
Default filter `status=pending`, order `submitted_at asc` (oldest first).

### M5. Approve KYC — `POST /staff/kyc/{user_id}/approve`
**UI:** «تأیید» button.
**Behavior:** `users.kyc_status=approved`; `kyc_events(reviewed_by, approved)`; **pays pending referral reward** if `referred_by_id` set (credit referrer gold wallet, ledger `referral`, notification); unblocks delivery checkout + raises daily caps; notifies user (type `kyc`).
**Success 200:** `{ "data": { "user_id": 3, "kyc_status": "approved" } }`

### M6. Reject KYC — `POST /staff/kyc/{user_id}/reject`
**UI:** `RejectKycModal` → reason → «رد مدارک».
**Body:** `{ "reason": "تصویر کارت ملی ناخوانا است" }` — required, ≤ 500 chars.
**Behavior:** `kyc_status=rejected`, reason stored in `kyc_events` + exposed via `GET /me/kyc` reject banner; user may resubmit (B5 resets to `pending`). **Success 200** as M5.

### M7. Inventory — `GET /staff/inventory?q=&level=low|ok|over&page=`
**UI:** `StaffInventoryPage` stock table with inline edit + low-stock warnings.
**Success 200:** `ApiList<{ "sku": "BR-18-221", "name": "دستبند طنابی", "on_hand": 6, "reserved": 1, "reorder": 3, "updated": "2026-08-12T09:00:00Z" }>` — `level` derived: `on_hand ≤ reorder → low`, `on_hand ≥ 3×reorder → over`, else `ok`.

### M8. Adjust stock — `PATCH /staff/inventory/{sku}`
**UI:** inline numeric edit → save.
**Body:** `{ "on_hand": 8, "note": "شارژ از کارگاه" }` (`on_hand ≥ reserved`, else `422`) — writes `inventory_movements(delta, reason, actor)`, flips product `status` to/from `out_of_stock` automatically, fires restock notifications (D6).
**Success 200:** updated row.

### M9. Tickets (all) — `GET /staff/tickets?q=&status=&type=&priority=&assignee=me|all&page=`
**UI:** `StaffTicketsPage` — assign, reply, close.
**Success 200:** `ApiList<Ticket>` including `user: {id,name,mobile}` and `assignee_id`.

### M10. Assign ticket — `PATCH /staff/tickets/{id}` `{ "assignee_id": 4, "priority": "high" }` → `200`.

### M11. Staff reply — `POST /staff/tickets/{id}/messages` `{ "body": "…" }`
Same endpoint as K4 but bearer role decides `is_staff=true`; sets ticket `status=pending` (waiting on customer) and `updated_at`. Customer sees a styled staff bubble.

### M12. Close ticket — `POST /staff/tickets/{id}/close` → `204`; notifies customer.

### M13. Customers (read-only) — `GET /staff/customers?q=&page=`
**UI:** `StaffCustomersPage` — search, open orders count. **No write endpoints for staff.**
**Success 200:** `ApiList<{ …User, "balances": { "irr": 25000000, "gold_mg": 12450 }, "open_orders": 1, "orders_count": 4 }>` — `q` matches name/mobile.

### M14. Buyback review — `GET /staff/buybacks?status=pending`, `POST /staff/buybacks/{id}/decide`
**UI:** implied by `BuybackPage` pending state + staff queue card (`buybacks_pending`).
**Decide body:** `{ "approve": true, "final_weight_mg": 4150, "final_irr": 14508000 }` — approve credits customer IRR at *current bid* (ledger `buyback`) or rejects with `reason`. Notifies customer.

---

## Module N — Admin console (`/admin/*`, role: admin)

### N1. Dashboard — `GET /admin/dashboard?range=7|30|90`
**UI:** `AdminDashboardPage` — KPI row + **8 mandatory charts** + halt switch + spread summary.
**Success 200:** exact `AdminDashboardData` contract from `src/types`:
```json
{ "data": {
  "kpis": [
    { "label": "فروش ۳۰ روز", "value": "۱٫۸۵ میلیارد ریال", "delta": 12.4 },
    { "label": "حجم طلا ۳۰ روز", "value": "۵۲۰٬۰۰۰ mg", "delta": 8.1 },
    { "label": "سفارش‌های باز", "value": 14, "delta": -2 },
    { "label": "KYC در انتظار", "value": 6, "delta": 1 },
    { "label": "نرخ لحظه‌ای ۱۸ عیار", "value": "۳٬۵۲۰٬۰۰۰", "delta": 0.8 },
    { "label": "مشتریان جدید ۳۰ روز", "value": 118, "delta": 15.2, "sparkline": [3,5,2,7, …] }
  ],
  "sales_irr_30d": [ { "t": "…", "value": 62000000 }, … ],
  "gold_volume_mg_30d": [ { "t": "…", "value": 17500 }, … ],
  "spot_90d": [ { "t": "…", "value": 3520000 }, … ],
  "orders_funnel": [ { "key": "awaiting", "label": "در انتظار پرداخت", "count": 14 },
                     { "key": "paid", "label": "پرداخت‌شده", "count": 38 },
                     { "key": "processing", "label": "در حال پردازش", "count": 22 },
                     { "key": "shipped", "label": "ارسال‌شده", "count": 17 },
                     { "key": "delivered", "label": "تحویل‌شده", "count": 121 },
                     { "key": "cancelled", "label": "لغوشده", "count": 6 } ],
  "inventory_health": [ { "sku": "RING-18-118", "level": "low", "qty": 0 }, … ],
  "kyc_funnel": [ { "key": "unverified", "label": "تأییدنشده", "count": 214 },
                  { "key": "pending", "label": "در انتظار", "count": 6 },
                  { "key": "approved", "label": "تأییدشده", "count": 489 },
                  { "key": "rejected", "label": "ردشده", "count": 11 } ],
  "solvency": { "vault_mg": 18420000, "liabilities_mg": 19130000, "ratio_pct": 96.3 },
  "new_customers_30d": [4,2,7, …]
} }
```
**Chart → series mapping:** 1) sales bar → `sales_irr_30d`; 2) gold volume line → `gold_volume_mg_30d`; 3) spot area → `spot_90d` (+24k toggle fetched via `GET /pricing/history?range=90D&karat=24`); 4) orders funnel → `orders_funnel`; 5) inventory horizontal bars → `inventory_health`; 6) KYC funnel → `kyc_funnel`; 7) solvency gauge → `solvency` (vault_mg = physical+allocated vault gold; liabilities_mg = Σ customer gold wallets + pending deliveries; ratio = vault/liabilities); 8) new-customers sparkline → `new_customers_30d` + KPI `sparkline`.
`range` rescales series windows (7/30/90 days).

### N2. Products CRUD
- **List** `GET /admin/products?q=&type=&status=&karat=&page=` — like D1 but includes `draft|inactive|out_of_stock`, never filters by publish date; rows carry `stock_on_hand`, `reserved`.
  **UI:** `AdminProductsPage` table (thumbnail, sku, name, type, karat, weight, status, quote, ⋯ menu).
- **Create** `POST /admin/products` — body: `{ "sku", "name", "type", "category_id", "karat", "weight_mg", "making_charge_type", "making_charge_irr", "occasion", "description", "attributes", "status": "draft|active", "images": [fileIds], "has_360": bool }`.
  Validation: `sku` unique `409` «این SKU قبلاً ثبت شده است»; `weight_mg ≥ 1`; `making_charge_irr ≥ 0`; `category_id` must match `type` family (jewelry→jewelry cats, bar/coin→bullion, melted→melted) else `422`.
  Slug auto-generated from name (unique, suffixed `-2` on collision). **Success 201** with resource.
- **Update** `PUT /admin/products/{id}` — same body partial; `sku` immutable after first sale (else `409`).
- **Status** `PATCH /admin/products/{id}/status` `{ "status": "active|inactive|draft" }` — `published_at` set on first activation; `out_of_stock` is system-managed (stock 0) and cannot be set manually (`422`).
- **Delete** `DELETE /admin/products/{id}` → soft delete **only when no order/line references** else `409` «امکان حذف وجود ندارد؛ محصول را غیرفعال کنید». `DeleteProductModal` confirms.
- **Media** `POST /admin/products/{id}/media` (multipart `files[]`, `kind=image|frame360`), `DELETE /admin/products/{id}/media/{fileId}` — §7 foundation.

### N3. Categories
- `GET /admin/categories` — full tree incl. inactive + product counts. **UI:** `AdminCategoriesPage` tree.
- `POST /admin/categories` `{ "name", "parent_id": null|id, "type" }` — max depth 2 (`422` «حداکثر دو سطح»); slug auto; **201**.
- `PUT /admin/categories/{id}` `{ "name" }`.
- `PATCH /admin/categories/{id}/active` `{ "is_active": false }` — deactivating a parent cascades to children; products inside become unreachable in public catalog (kept, not deleted).
- `PATCH /admin/categories/reorder` `{ "ordered_ids": [13, 11, 12] }` — rewrites `sort_order` within parent.

### N4. Inventory & vault
- `GET /admin/inventory?level=&q=` — M7 shape + `cost_irr_avg`.
- `PATCH /admin/inventory/{sku}` — M8 (superset: also `reorder` point: `{ "on_hand": 8, "reorder": 4 }`).
- `POST /admin/vault-lots` `{ "weight_mg": 50000, "cost_irr": 234900000, "supplier": "…", "serial": "ZV-…" }` — adds physical vault gold (solvency numerator); audit-logged. **UI:** «افزودن لات».
- `GET /admin/vault-lots?page=` — lot list with serials.
- `GET /admin/solvency` — `{ "data": { …SolvencyGauge, "vault_lots": [ {"serial","weight_mg","acquired_at"} ], "liability_breakdown": { "wallets_mg": …, "pending_deliveries_mg": … } } }`.

### N5. Pricing control
**UI:** `AdminPricingPage` — spot card + stale age, manual price form, bid/ask bps inputs, 1M history mini chart, halt switch.
- `GET /admin/pricing` → `{ "data": { "spot": [ …SpotPrice ], "spread": { "bid_bps": 60, "ask_bps": 45 }, "quote_ttl_sec": 18, "feed_status": "live|stale|manual", "last_ingest_at": "…" } }`
- `POST /admin/pricing/spot` `{ "karat": 18, "price_irr_per_gram": 3530000, "source": "manual" }` — creates `price_snapshots(source=manual)`; marks feed `manual` until next feed tick; immediately re-evaluates alerts. **201** with snapshot.
- `PATCH /admin/pricing/spread` `{ "bid_bps": 60, "ask_bps": 45 }` — same as settings keys; validates 0–500. **200** with `{bid_irr, ask_irr}` preview per karat.
- `POST /admin/pricing/halt` `{ "halt": true, "confirm_token": "HALT" }` — wrong token → `422 HALT_CONFIRMATION`; success flips `settings.trading_halt`, broadcasts notification type `system` «معاملات متوقف شد», audit-logs. Halt switch on `AdminDashboardPage` + `TradingHaltedBanner` react to this.

### N6. Orders (all) — `GET /admin/orders?q=&status=&fulfillment=&from=&to=&page=`
**UI:** `AdminOrdersPage` advanced filters + CSV. Superset of M2 (adds date range + financial totals row in meta: `meta_aggregates: { sum_total_irr, sum_gold_mg }` optional).
- **CSV export** `GET /admin/orders/export.csv?{same filters}` — streams `number,customer,date,total_irr,gold_mg,status,fulfillment` (matches the client-side export columns the UI already emits; server export removes the 10k-row cap).
- Status changes reuse **M3** (admins may also `refunded` after N7 refund).

### N7. Payments — `GET /admin/payments?status=&driver=&q=&page=`
**UI:** `AdminPaymentsPage` table (id, amount, driver, status, paid_at, customer, order) + `RefundModal`; sandbox badge when `settings.psp` is a sandbox driver.
**Success 200:** `ApiList<Payment & { "customer": "سارا کریمی", "order_no": "ZRVORD-2026-0901" }>`.
- **Refund** `POST /admin/payments/{id}/refund` `{ "amount_irr": 23284000, "reason": "انصراف مشتری" }`
  Rules: only `status=paid`; `amount_irr ≤ paid − already_refunded`; reason required (`422 REASON_REQUIRED` style «دلیل بازپرداخت الزامی است»); creates `payment_refunds` + flips order `refunded` when full; reverses vault gold credit and stock for the order's items; ledger debit on customer wallet if wallet-paid; notification. **201** with refund resource.

### N8. Invoices (all) — `GET /admin/invoices?q=&from=&to=&page=` (search by number/customer), `GET /admin/invoices/{id}` (I2), `GET /admin/invoices/{id}/pdf` (I3). **UI:** `AdminInvoicesPage`.

### N9. Customers — `GET /admin/customers?q=&role=&kyc_status=&page=`
**UI:** `AdminCustomersPage` table + detail drawer + «تغییر نقش».
**Success 200:** `ApiList<User & { balances, orders_count, lifetime_irr }>`.
- **Detail** `GET /admin/customers/{id}` → `{ "data": { …User, "wallets": […], "recent_orders": […5], "kyc": {…}, "tickets_open": 1 } }` (drawer content).
- **Change role** `PATCH /admin/customers/{id}/role` `{ "role": "dealer" }` — allowed transitions: `customer ↔ dealer`; promoting to `staff/admin` only via N13 invite; demoting self → `422`. Audit-logged; notifies user.

### N10. Wallet operations — `GET /admin/wallets/search?q=`
**UI:** `AdminWalletsPage` — search by mobile/name → user's wallets + ledger.
**Success 200:** `{ "data": { "user": {…User}, "wallets": […E1], "ledger": […E2 rows, latest 20] } }` (empty `q` → no user, `data: null`; UI shows empty state).
- **Manual adjustment** `POST /admin/wallets/{user_id}/adjust`
  **Body:** `{ "currency": "irr|gold_mg", "amount": 5000000, "reason": "جبران مغایرت درگاه" }` — `amount` signed (positive credit, negative debit); `reason` required (`422` «دلیل اصلاح الزامی است»); negative beyond balance → `422 INSUFFICIENT_BALANCE`; writes ledger `reference_type=adjustment` with reason prefixed «اصلاح دستی: …»; **double-entry**: mirror row in `treasury_ledger`; notification to customer. Audit-logged with before/after balances. **200** with updated wallets.

### N11. Promotions — `GET /admin/promotions?tab=coupons|gifts|referrals|cashback`
**UI:** `AdminPromotionsPage` tabs + coupon create form.
- **Coupons list** `GET /admin/coupons?q=&active=&page=` → `ApiList<Coupon>`.
- **Create coupon** `POST /admin/coupons` `{ "code": "GOLD-NOWRUZ", "type": "percent|fixed_irr", "value": 5, "max_uses": 500, "min_order_irr": 5000000, "expires_at": "2026-03-20T23:59:00Z", "is_active": true }` — `code` unique, `^[A-Z0-9-]{4,24}$`, uppercased server-side; `value` percent 1–90 / fixed ≥ 10 000; **201**.
- **Toggle** `PATCH /admin/coupons/{id}` `{ "is_active": false }` → `200`.
- **Redemption report** `GET /admin/coupons/{id}/redemptions?page=` → `ApiList<{ user, order_no, discount_irr, at }>`.
- **Gifts oversight** `GET /admin/gifts?status=&page=` → `ApiList<GiftCard & { sender: {name, mobile} }>`.
- **Referrals overview** `GET /admin/referrals/overview?page=` → top inviters `{ user, invited_count, gold_paid_mg, gold_pending_mg }`.

### N12. Reports — `GET /admin/reports/{key}?from=&to=&format=json|csv`
**UI:** `ReportsPage` — DateRangePicker + per-report «خروجی CSV (n ردیف)» buttons (currently client-built; server endpoint canonical).
Keys and columns:
| key | rows |
|---|---|
| `sales` | `date,total_irr,orders_count,gold_mg` |
| `gold_volume` | `date,buy_mg,sell_mg,net_mg` |
| `spot` | `date,close_irr_18k,close_irr_24k` |
| `orders_funnel` | `status,count` |
| `inventory` | `sku,name,on_hand,reserved,reorder,level` |
| `kyc` | `date,submitted,approved,rejected` |
| `new_customers` | `date,count` |
JSON variant returns the same arrays the dashboard charts use (`SeriesPoint[]`/`FunnelStep[]`), so ReportsPage charts = AdminDashboard charts over the chosen range. `format=csv` streams download.

### N13. Staff management — `GET /admin/staff?page=`
**UI:** `AdminStaffPage` — list + invite + deactivate.
**Success 200:** `ApiList<User & { "is_active": true, "last_login_at": "…" }>` (role `staff|admin`).
- **Invite** `POST /admin/staff/invites` `{ "mobile": "09120001122", "role": "staff|admin", "name": "الهام رضایی" }` — creates user with `status=invited` + OTP/SMS onboarding; existing mobile → `409`. **201**.
- **Toggle active** `PATCH /admin/staff/{id}/active` `{ "is_active": false }` — revokes tokens immediately; self-deactivation → `422`.

### N14. Settings — `GET /admin/settings`, `PATCH /admin/settings`
**UI:** `AdminSettingsPage` (spreads, quote TTL, slippage, min trade, unverified caps, OTP, VAT, invoice legal, PSP, SMS, vault address, maintenance, danger: halt).
Contract: foundation §11 table. `PATCH` accepts any subset; each key validated independently; response returns full merged object; every change audit-logged with diff. `trading_halt` changes additionally require `confirm_token:"HALT"` (same as N5).

### N15. Broadcast — `POST /admin/broadcasts`
**UI:** `AdminBroadcastPage` — title/body/channel → «ارسال همگانی» confirm modal.
**Body:** `{ "title": "…", "body": "…", "channels": ["in_app", "sms"], "audience": "all|customers|dealers" }` (title ≤ 80, body ≤ 500).
**Behavior:** creates `notifications` row per recipient (type `system`), enqueues SMS batch per `channels`; respects per-user `notification_preferences` for the in_app channel. **201** `{ "data": { "recipients": 712, "sms_queued": 480 } }`.

### N16. Audit log — `GET /admin/audit-logs?actor=&action=&subject_type=&from=&to=&page=`
Read-only stream of `audit_logs` (admin actions: settings, adjustments, refunds, halt, role changes, KYC decisions, stock edits). **UI gap:** currently no dedicated page — see audit doc (renders via future `/admin/audit` or inside Settings).

---

## Module O — System

### O1. Health — `GET /health` (public) → `{ "data": { "status": "ok", "version": "1.0.0", "db": "ok", "feed_age_sec": 12 } }`. Used by uptime monitoring; exempt from maintenance gate.

### O2. Maintenance state — `GET /system/state` (public) → `{ "data": { "maintenance": false, "trading_halt": false, "notice": null } }` — storefront checks on boot; `maintenance:true` → SPA routes to `MaintenancePage`; API returns `503` for non-health endpoints with Persian message «سرویس موقتاً در دسترس نیست».

### O3. Webhook (PSP) — `POST /webhooks/psp/{driver}` — signed callback; verifies HMAC; idempotent on `ref_id`; flips payment → order → invoice → vault pipeline (§10 foundation). Not consumed by the SPA directly.
