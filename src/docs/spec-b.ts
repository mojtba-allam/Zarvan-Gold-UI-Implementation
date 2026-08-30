/* ================= Zarvan Gold — API Spec Data (Part B: staff + admin + registry) ================= */
import type { DocModule } from "./spec-a";
import { AUTH_MODULES } from "./spec-a";

export const OPS_MODULES: DocModule[] = [
  {
    id: "staff", code: "O", name: "پنل کارمندان", role: "staff",
    intro: "صف عملیات روزانه: وضعیت سفارش‌ها، ثبت رهگیری، بررسی KYC، ویرایش موجودی و پاسخ به تیکت‌ها. دسترسی فقط staff/admin.",
    endpoints: [
      {
        id: "staff-dash", method: "GET", path: "/staff/dashboard", name: "داشبورد کارمند",
        desc: "شمارنده‌های صف (KYC در انتظار، سفارش‌های آماده ارسال، تیکت‌های باز) و نمودار میله‌ای سفارش‌های امروز بر اساس وضعیت.",
        auth: "staff",
        res: `{
  "data": {
    "queues": { "kyc_pending": 6, "ready_to_ship": 4, "open_tickets": 3, "buyback_pending": 2 },
    "orders_by_status_today": [
      { "status": "paid", "count": 8 }, { "status": "processing", "count": 5 },
      { "status": "shipped", "count": 3 }, { "status": "delivered", "count": 2 }
    ]
  }
}`,
        tables: ["users", "orders", "tickets", "kyc_submissions"], ui: ["StaffDashboardPage"],
      },
      {
        id: "staff-orders", method: "GET", path: "/staff/orders", name: "فهرست سفارش‌ها (عملیات)",
        desc: "همه سفارش‌ها با فیلتر وضعیت/fulfillment و جستجوی شماره/مشتری + صفحه‌بندی.",
        auth: "staff",
        params: [
          { name: "status", loc: "query", type: "enum", desc: "وضعیت سفارش" },
          { name: "fulfillment", loc: "query", type: "enum", desc: "vault | delivery" },
          { name: "q", loc: "query", type: "string", desc: "شماره سفارش یا نام مشتری" },
          { name: "page", loc: "query", type: "integer", desc: "صفحه" },
        ],
        res: `{
  "data": [
    { "id": 1, "number": "ZRVORD-2026-0901", "status": "shipped", "fulfillment": "delivery",
      "total_irr": 23284000, "gold_mg": 4200, "created_at": "2026-08-10T10:30:00Z",
      "customer": { "id": 1, "name": "سارا کریمی", "mobile": "09121234567" } }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 4, "last_page": 1 }
}`,
        tables: ["orders", "users"], ui: ["StaffOrdersPage"],
      },
      {
        id: "staff-order-status", method: "PATCH", path: "/staff/orders/{id}/status", name: "تغییر وضعیت سفارش",
        desc: "گذار وضعیت بر اساس ماشین وضعیت مجاز (مثلاً paid→processing→shipped). رویداد در timeline ثبت و نوتیفیکیشن برای مشتری ارسال می‌شود.",
        auth: "staff",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سفارش" }],
        body: `{ "status": "shipped" }`,
        res: `{ "data": { "id": 1, "status": "shipped" } }`,
        errors: [{ status: 422, code: "INVALID_TRANSITION", desc: "گذار وضعیت مجاز نیست" }],
        tables: ["orders", "shipment_events", "notifications", "audit_logs"], ui: ["StaffOrdersPage — dropdown وضعیت"],
      },
      {
        id: "staff-ship", method: "POST", path: "/staff/orders/{id}/shipments", name: "ثبت رهگیری",
        desc: "ثبت carrier و tracking_code؛ وضعیت shipped می‌شود و timeline آغاز می‌گردد.",
        auth: "staff",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سفارش" }],
        body: `{ "carrier": "تیپاکس", "tracking_code": "TPX-552188" }`,
        res: `{ "data": { "tracking_code": "TPX-552188", "status": "shipped", "shipped_at": "2026-08-13T12:10:00Z" } }`,
        rules: ["tracking_code: required, min 6"],
        tables: ["shipments", "shipment_events", "orders", "notifications"], ui: ["StaffOrdersPage — مودال «ثبت رهگیری»"],
      },
      {
        id: "staff-label", method: "GET", path: "/staff/orders/{id}/label.pdf", name: "چاپ لیبل ارسال",
        desc: "PDF لیبل پستی با نشانی گیرنده و کد سفارش.",
        auth: "staff",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سفارش" }],
        res: `HTTP/1.1 200 OK
Content-Type: application/pdf`,
        tables: ["orders", "addresses"], ui: ["StaffOrdersPage — «لیبل»"],
      },
      {
        id: "staff-kyc-queue", method: "GET", path: "/staff/kyc/queue", name: "صف احراز هویت",
        desc: "کاربران با مدارک ارسال‌شده، مرتب‌شده بر اساس زمان ارسال (قدیمی‌تر اول).",
        auth: "staff",
        res: `{
  "data": [
    { "id": 3, "name": "نازنین احمدی", "mobile": "09123456789", "kyc_status": "pending",
      "submitted_at": "2026-08-12T09:10:00Z",
      "documents": [ { "id": 31, "kind": "national_id_front", "file_url": "..." } ] }
  ]
}`,
        tables: ["users", "kyc_submissions", "kyc_documents"], ui: ["StaffKycPage — کارت‌های صف"],
      },
      {
        id: "staff-kyc-approve", method: "POST", path: "/staff/kyc/{user_id}/approve", name: "تأیید مدارک",
        desc: "وضعیت کاربر به approved؛ نوتیفیکیشن خوش‌آمد + باز شدن تحویل فیزیکی و سقف‌های کامل.",
        auth: "staff",
        params: [{ name: "user_id", loc: "path", type: "integer", req: true, desc: "شناسه کاربر" }],
        res: `{ "data": { "user_id": 3, "kyc_status": "approved", "reviewed_by": 4 } }`,
        tables: ["kyc_submissions", "users", "notifications", "audit_logs"], ui: ["StaffKycPage — «تأیید»"],
      },
      {
        id: "staff-kyc-reject", method: "POST", path: "/staff/kyc/{user_id}/reject", name: "رد مدارک",
        desc: "با دلیل الزامی (RejectKycModal)؛ کاربر بنر رد می‌بیند و می‌تواند دوباره ارسال کند.",
        auth: "staff",
        params: [{ name: "user_id", loc: "path", type: "integer", req: true, desc: "شناسه کاربر" }],
        body: `{ "reason": "تصویر کارت ملی ناخوانا است؛ لطفاً عکس واضح‌تر ارسال کنید." }`,
        res: `{ "data": { "user_id": 6, "kyc_status": "rejected" } }`,
        rules: ["reason: required, min 10"],
        tables: ["kyc_submissions", "users", "notifications", "audit_logs"], ui: ["StaffKycPage — RejectKycModal"],
      },
      {
        id: "staff-inventory", method: "GET", path: "/staff/inventory", name: "موجودی انبار",
        desc: "جدول موجودی/رزرو/نقطه سفارش هر SKU با هشدار کمبود.",
        auth: "staff",
        res: `{
  "data": [
    { "sku": "BR-18-221", "name": "دستبند طنابی", "on_hand": 6, "reserved": 1,
      "reorder": 3, "level": "ok", "updated": "2026-08-12T09:00:00Z" }
  ]
}`,
        tables: ["inventories", "products"], ui: ["StaffInventoryPage"],
      },
      {
        id: "staff-stock", method: "PATCH", path: "/staff/inventory/{sku}", name: "ویرایش موجودی",
        desc: "تصحیح دستی on_hand با ثبت stock_movement و دلیل.",
        auth: "staff",
        params: [{ name: "sku", loc: "path", type: "string", req: true, desc: "شناسه SKU" }],
        body: `{ "on_hand": 8, "reason": "شمارش دوره‌ای" }`,
        res: `{ "data": { "sku": "BR-18-221", "on_hand": 8 } }`,
        rules: ["on_hand ≥ 0", "reason الزامی وقتی تغییر بیش از ۲ واحد باشد"],
        tables: ["inventories", "stock_movements", "audit_logs"], ui: ["StaffInventoryPage — ویرایش درون‌خطی"],
      },
      {
        id: "staff-tickets", method: "GET", path: "/staff/tickets", name: "تیکت‌های همه کاربران",
        desc: "با فیلتر وضعیت/اولویت/نوع و جستجو.",
        auth: "staff",
        params: [
          { name: "status", loc: "query", type: "enum", desc: "open | pending | closed" },
          { name: "priority", loc: "query", type: "enum", desc: "low | normal | high" },
          { name: "q", loc: "query", type: "string", desc: "موضوع یا موبایل" },
        ],
        res: `{
  "data": [
    { "id": 1042, "subject": "پیگیری مرسوله...", "type": "delivery", "status": "pending",
      "priority": "high", "updated_at": "2026-08-12T10:15:00Z",
      "user": { "id": 1, "name": "سارا کریمی", "mobile": "09121234567" } }
  ]
}`,
        tables: ["tickets", "users"], ui: ["StaffTicketsPage"],
      },
      {
        id: "staff-ticket-assign", method: "POST", path: "/staff/tickets/{id}/assign", name: "اختصاص تیکت",
        auth: "staff",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه تیکت" }],
        body: `{ "assignee_id": 4 }`,
        res: `{ "data": { "id": 1042, "assignee_id": 4 } }`,
        tables: ["tickets", "audit_logs"], ui: ["StaffTicketsPage — assign"],
      },
      {
        id: "staff-ticket-reply", method: "POST", path: "/staff/tickets/{id}/messages", name: "پاسخ کارمند",
        desc: "پاسخ با is_staff=true؛ status=pending و نوتیفیکیشن برای مشتری.",
        auth: "staff",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه تیکت" }],
        body: `{ "body": "سلام، مرسوله شما امروز تحویل پست شد." }`,
        res: `{ "data": { "id": 4, "body": "...", "is_staff": true, "created_at": "2026-08-13T12:20:00Z" } }`,
        tables: ["ticket_messages", "tickets", "notifications"], ui: ["StaffTicketsPage — پاسخ"],
      },
      {
        id: "staff-customers", method: "GET", path: "/staff/customers", name: "مشتریان (خواندنی)",
        desc: "جستجوی فقط‌خواندنی مشتریان با وضعیت KYC و سفارش‌های باز.",
        auth: "staff",
        params: [{ name: "q", loc: "query", type: "string", desc: "نام یا موبایل" }],
        res: `{
  "data": [
    { "id": 1, "name": "سارا کریمی", "mobile": "09121234567", "kyc_status": "approved",
      "role": "customer", "open_orders": 1, "created_at": "2025-12-02T10:12:00Z" }
  ]
}`,
        rules: ["دسترسی فقط‌خواندنی — هیچ عمل تغییری مجاز نیست"],
        tables: ["users", "orders"], ui: ["StaffCustomersPage"],
      },
    ],
  },
  {
    id: "admin-dash", code: "P1", name: "داشبورد و گزارش مدیر", role: "admin",
    intro: "KPIها و ۸ نمودار الزامی داشبورد + گزارش‌های CSV با بازه زمانی.",
    endpoints: [
      {
        id: "admin-dash", method: "GET", path: "/admin/dashboard", name: "داده داشبورد مدیر",
        desc: "همه داده ۸ نمودار + KPIها در یک پاسخ (فروش ۳۰ روز، حجم طلا، اسپات ۹۰ روز، قیف سفارش، سلامت موجودی، قیف KYC، کفایت خزانه، مشتریان جدید).",
        auth: "admin",
        params: [{ name: "range", loc: "query", type: "enum", desc: "7 | 30 | 90 — پیش‌فرض 30" }],
        res: `{
  "data": {
    "kpis": [
      { "label": "فروش ۳۰ روز", "value": "۱٫۸۵ میلیارد ریال", "delta": 12.4 },
      { "label": "مشتریان جدید ۳۰ روز", "value": 118, "delta": 15.2, "sparkline": [3, 5, 4, 7] }
    ],
    "sales_irr_30d": [ { "t": "2026-08-12T00:00:00Z", "value": 62000000 } ],
    "gold_volume_mg_30d": [ { "t": "2026-08-12T00:00:00Z", "value": 17500 } ],
    "spot_90d": [ { "t": "2026-08-12T00:00:00Z", "value": 3520000 } ],
    "orders_funnel": [ { "key": "awaiting", "label": "در انتظار پرداخت", "count": 14 } ],
    "inventory_health": [ { "sku": "RING-18-118", "level": "low", "qty": 0 } ],
    "kyc_funnel": [ { "key": "pending", "label": "در انتظار", "count": 6 } ],
    "solvency": { "vault_mg": 18420000, "liabilities_mg": 19130000, "ratio_pct": 96.3 },
    "new_customers_30d": [3, 5, 4, 7, 6]
  }
}`,
        tables: ["orders", "users", "trades", "wallets", "kyc_submissions", "inventories", "vault_lots", "price_snapshots"],
        ui: ["AdminDashboardPage — ۸ نمودار"],
      },
      {
        id: "admin-reports", method: "GET", path: "/admin/reports", name: "گزارش‌های عملیاتی",
        desc: "سری‌های قابل‌خروجی برای ReportsPage: فروش، حجم، اسپات، قیف‌ها.",
        auth: "admin",
        params: [
          { name: "type", loc: "query", type: "enum", req: true, desc: "sales | volume | spot | funnel_orders | funnel_kyc" },
          { name: "from", loc: "query", type: "date", desc: "از تاریخ" },
          { name: "to", loc: "query", type: "date", desc: "تا تاریخ" },
        ],
        res: `{ "data": { "type": "sales", "rows": [ { "t": "2026-08-12T00:00:00Z", "value": 62000000 } ] } }`,
        tables: ["orders", "trades", "price_snapshots"], ui: ["ReportsPage"],
      },
      {
        id: "admin-report-csv", method: "GET", path: "/admin/reports/export.csv", name: "خروجی CSV گزارش",
        desc: "دانلود گزارش با ستون date,value.",
        auth: "admin",
        params: [{ name: "type", loc: "query", type: "enum", req: true, desc: "نوع گزارش" }, { name: "from", loc: "query", type: "date", desc: "از" }, { name: "to", loc: "query", type: "date", desc: "تا" }],
        res: `HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8`,
        tables: ["orders", "trades"], ui: ["ReportsPage — دکمه‌های CSV"],
      },
      {
        id: "admin-audit", method: "GET", path: "/admin/audit-logs", name: "لاگ تغییرات",
        desc: "ردپای عملیات حساس ادمین/کارمند (تنظیمات، اصلاح کیف پول، توقف معاملات...).",
        auth: "admin",
        params: [{ name: "actor", loc: "query", type: "string", desc: "فیلتر کاربر" }, { name: "page", loc: "query", type: "integer", desc: "صفحه" }],
        res: `{
  "data": [
    { "id": 901, "actor": { "id": 5, "name": "مجتبی علام" }, "action": "settings.update",
      "payload": { "field": "bid_bps", "old": 55, "new": 60 }, "at": "2026-08-13T09:00:00Z" }
  ]
}`,
        tables: ["audit_logs"], ui: ["AdminSettingsPage (لینک)"],
      },
    ],
  },
  {
    id: "admin-catalog", code: "P2", name: "مدیریت کاتالوگ (ادمین)", role: "admin",
    intro: "CRUD کامل محصولات با انتشار/پیش‌نویس/حذف/بازیابی، آپلود گالری و ۳۶۰، و مدیریت درخت دسته‌بندی.",
    endpoints: [
      {
        id: "adm-products", method: "GET", path: "/admin/products", name: "همه محصولات",
        desc: "شامل draft/inactive با فیلتر نوع/وضعیت/دسته و جستجوی SKU/نام.",
        auth: "admin",
        params: [
          { name: "type", loc: "query", type: "enum", desc: "نوع محصول" },
          { name: "status", loc: "query", type: "enum", desc: "draft | active | inactive | out_of_stock" },
          { name: "q", loc: "query", type: "string", desc: "جستجو" },
          { name: "sort", loc: "query", type: "enum", desc: "newest | sku | price_asc | price_desc" },
          { name: "page", loc: "query", type: "integer", desc: "صفحه" },
        ],
        res: `{
  "data": [
    { "id": 1, "sku": "BR-18-221", "name": "دستبند طنابی ۱۸ عیار", "type": "jewelry", "karat": 18,
      "weight_mg": 4200, "status": "active", "quote_irr": 23284000, "stock_on_hand": 6,
      "images": ["..."], "has_360": true }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 10, "last_page": 1 }
}`,
        tables: ["products", "inventories"], ui: ["AdminProductsPage — جدول"],
      },
      {
        id: "adm-product-create", method: "POST", path: "/admin/products", name: "ساخت محصول",
        desc: "ثبت محصول جدید؛ slug و SKU یکتا تولید/اعتبارسنجی می‌شود.",
        auth: "admin",
        body: `{
  "sku": "BR-18-222", "name": "دستبند النگی ۱۸ عیار", "type": "jewelry", "category_id": 12,
  "karat": 18, "weight_mg": 5100, "making_charge_type": "flat", "making_charge_irr": 9200000,
  "occasion": "هدیه", "status": "draft", "description": "...",
  "attributes": { "عیار": "۱۸ (۷۵۰)" }, "image_ids": [81, 82], "has_360": false
}`,
        res: `{ "data": { "id": 11, "slug": "bangle-bracelet-18k", "status": "draft" } }`,
        rules: ["sku: required, unique, max 32", "weight_mg: min 100", "making_charge_irr ≥ 0"],
        errors: [{ status: 409, code: "SKU_TAKEN", desc: "SKU تکراری است" }],
        tables: ["products", "product_images", "audit_logs"], ui: ["AdminProductsPage — فرم ساخت"],
      },
      {
        id: "adm-product-update", method: "PUT", path: "/admin/products/{id}", name: "ویرایش محصول",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه محصول" }],
        body: `{ "name": "...", "making_charge_irr": 9500000, "attributes": { } }`,
        res: `{ "data": { "id": 1, "updated_at": "2026-08-13T12:30:00Z" } }`,
        tables: ["products", "product_images", "audit_logs"], ui: ["AdminProductsPage — فرم ویرایش"],
      },
      {
        id: "adm-product-status", method: "PATCH", path: "/admin/products/{id}/status", name: "انتشار / پیش‌نویس / توقف",
        desc: "تغییر سریع وضعیت از منوی ⋯؛ انتشار published_at را ثبت می‌کند.",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه محصول" }],
        body: `{ "status": "active" }`,
        res: `{ "data": { "id": 1, "status": "active", "published_at": "2026-08-13T12:30:00Z" } }`,
        tables: ["products", "audit_logs"], ui: ["AdminProductsPage — منوی ⋯"],
      },
      {
        id: "adm-product-delete", method: "DELETE", path: "/admin/products/{id}", name: "حذف محصول (Soft)",
        desc: "حذف نرم با تأیید DeleteProductModal؛ از کاتالوگ پنهان می‌شود ولی در سفارش‌های قدیمی باقی می‌ماند.",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه محصول" }],
        res: `{ "data": { "ok": true } }`,
        errors: [{ status: 409, code: "PRODUCT_IN_CARTS", desc: "در سبد فعال کاربران است؛ ابتدا غیرفعال کنید" }],
        tables: ["products", "audit_logs"], ui: ["AdminProductsPage — DeleteProductModal"],
      },
      {
        id: "adm-product-restore", method: "POST", path: "/admin/products/{id}/restore", name: "بازیابی محصول",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه محصول" }],
        res: `{ "data": { "id": 1, "status": "draft" } }`,
        tables: ["products"], ui: ["AdminProductsPage — بازیابی"],
      },
      {
        id: "adm-upload", method: "POST", path: "/admin/uploads", name: "آپلود تصویر / فریم ۳۶۰",
        desc: "آپلود گالری محصول و فریم‌های نمای چرخان (۲۴ فریم webp).",
        auth: "admin",
        body: `Content-Type: multipart/form-data
file: <binary>
kind: "product_image | product_360"
product_id: 1`,
        res: `{ "data": { "id": 81, "kind": "product_image", "url": "https://cdn.zarvan.gold/p/...webp" } }`,
        rules: ["MIME: image/jpeg, image/png, image/webp", "حداکثر ۸MB", "برای ۳۶۰ دقیقاً ۲۴ فریم با نام ترتیبی"],
        tables: ["product_images", "product_360_frames"], ui: ["AdminProductsPage — Dropzone"],
      },
      {
        id: "adm-cats", method: "GET", path: "/admin/categories", name: "درخت دسته‌ها (ادمین)",
        desc: "همه دسته‌ها شامل غیرفعال‌ها با تعداد محصول.",
        auth: "admin",
        res: `{
  "data": [
    { "id": 1, "name": "جواهرات", "slug": "jewelry", "type": "jewelry", "sort_order": 1,
      "is_active": true, "products_count": 5, "children": [ { "id": 11, "name": "انگشتر", "products_count": 2, "children": [] } ] }
  ]
}`,
        tables: ["categories", "products"], ui: ["AdminCategoriesPage"],
      },
      {
        id: "adm-cat-create", method: "POST", path: "/admin/categories", name: "افزودن دسته",
        auth: "admin",
        body: `{ "name": "پابند", "parent_id": 1, "type": "jewelry" }`,
        res: `{ "data": { "id": 14, "slug": "anklets" } }`,
        rules: ["name: unique در هم‌سطح", "حداکثر ۲ سطح عمق"],
        tables: ["categories"], ui: ["AdminCategoriesPage — افزودن زیرمجموعه"],
      },
      {
        id: "adm-cat-update", method: "PUT", path: "/admin/categories/{id}", name: "ویرایش دسته",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه دسته" }],
        body: `{ "name": "...", "is_active": false }`,
        res: `{ "data": { "id": 11, "is_active": false } }`,
        tables: ["categories"], ui: ["AdminCategoriesPage — Switch فعال"],
      },
      {
        id: "adm-cat-reorder", method: "PATCH", path: "/admin/categories/reorder", name: "مرتب‌سازی دسته‌ها",
        desc: "Drag & Drop در UI → ارسال ترتیب جدید.",
        auth: "admin",
        body: `{ "order": [ { "id": 11, "sort_order": 2 }, { "id": 12, "sort_order": 1 } ] }`,
        res: `{ "data": { "ok": true } }`,
        tables: ["categories"], ui: ["AdminCategoriesPage — جابه‌جایی"],
      },
      {
        id: "adm-cat-delete", method: "DELETE", path: "/admin/categories/{id}", name: "حذف دسته",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه دسته" }],
        res: `{ "data": { "ok": true } }`,
        errors: [{ status: 409, code: "CATEGORY_NOT_EMPTY", desc: "دارای محصول یا زیردسته است" }],
        tables: ["categories"], ui: ["AdminCategoriesPage — حذف"],
      },
    ],
  },
  {
    id: "admin-ops", code: "P3", name: "موجودی، قیمت و سفارش (ادمین)", role: "admin",
    intro: "لات‌های خزانه و کفایت، کنترل اسپات/اسپرد/توقف، و ابزارهای پیشرفته سفارش و پرداخت.",
    endpoints: [
      {
        id: "adm-inventory", method: "GET", path: "/admin/inventory", name: "موجودی + لات‌های خزانه",
        desc: "جدول SKUها و لات‌های فیزیکی خزانه با عیار و شماره سریال.",
        auth: "admin",
        res: `{
  "data": {
    "rows": [ { "sku": "COIN-24-BAHAR", "on_hand": 24, "reserved": 2, "reorder": 10, "updated": "2026-08-13T08:00:00Z" } ],
    "vault_lots": [ { "id": 7, "karat": 24, "weight_mg": 5000000, "serial": "VLT-2026-07", "stored_at": "2026-05-02T00:00:00Z" } ]
  }
}`,
        tables: ["inventories", "vault_lots"], ui: ["AdminInventoryPage"],
      },
      {
        id: "adm-lot-create", method: "POST", path: "/admin/inventory/lots", name: "افزودن لات خزانه",
        desc: "ثبت ورود شمش به خزانه (خرید عمده/ذوب) — روی vault_mg کفایت اثر می‌گذارد.",
        auth: "admin",
        body: `{ "karat": 24, "weight_mg": 2000000, "serial": "VLT-2026-12", "cost_irr": 9380000000 }`,
        res: `{ "data": { "id": 8, "serial": "VLT-2026-12" } }`,
        tables: ["vault_lots", "audit_logs"], ui: ["AdminInventoryPage — «افزودن لات»"],
      },
      {
        id: "adm-solvency", method: "GET", path: "/admin/inventory/solvency", name: "کفایت خزانه",
        desc: "نسبت طلای فیزیکی به تعهدات کاربران (گِیج ۹۶٫۳٪ در داشبورد).",
        auth: "admin",
        res: `{ "data": { "vault_mg": 18420000, "liabilities_mg": 19130000, "ratio_pct": 96.3, "updated_at": "2026-08-13T12:00:00Z" } }`,
        tables: ["vault_lots", "wallets"], ui: ["AdminDashboardPage — گِیج", "AdminInventoryPage"],
      },
      {
        id: "adm-spot", method: "POST", path: "/admin/pricing/spot", name: "ثبت نرخ دستی",
        desc: "وقتی فید بازار قطع است؛ snapshot با source=manual ثبت و observed_at تازه می‌شود.",
        auth: "admin",
        body: `{ "karat": 18, "price_irr_per_gram": 3525000 }`,
        res: `{ "data": { "observed_at": "2026-08-13T12:40:00Z", "source": "manual" } }`,
        rules: ["انحراف بیش از ۵٪ از آخرین نرخ → نیازمند تأیید دوم (confirm=true)"],
        tables: ["spot_prices", "price_snapshots", "audit_logs"], ui: ["AdminPricingPage — نرخ دستی"],
      },
      {
        id: "adm-spread", method: "PUT", path: "/admin/pricing/spread", name: "تنظیم اسپرد Bid/Ask",
        desc: "bid_bps و ask_bps برای معاملات و محصولات.",
        auth: "admin",
        body: `{ "bid_bps": 60, "ask_bps": 45 }`,
        res: `{ "data": { "bid_bps": 60, "ask_bps": 45 } }`,
        rules: ["0..500 bps"],
        tables: ["price_settings", "audit_logs"], ui: ["AdminPricingPage — ذخیره اسپرد"],
      },
      {
        id: "adm-halt", method: "POST", path: "/admin/pricing/halt", name: "توقف/ازسرگیری معاملات",
        desc: "توقف سراسری با تایپ عبارت HALT در HaltTradingModal؛ همه Quoteها باطل و Ticker قرمز می‌شود.",
        auth: "admin",
        body: `{ "trading_halt": true, "confirmation": "HALT", "reason": "نوسان شدید بازار" }`,
        res: `{ "data": { "trading_halt": true, "quotes_invalidated": 7 } }`,
        errors: [{ status: 422, code: "HALT_CONFIRMATION", desc: "عبارت تأیید نادرست است" }],
        tables: ["price_settings", "trade_quotes", "audit_logs"], ui: ["HaltTradingModal", "AdminPricingPage", "AdminDashboardPage"],
      },
      {
        id: "adm-orders", method: "GET", path: "/admin/orders", name: "همه سفارش‌ها (پیشرفته)",
        desc: "فیلتر ترکیبی وضعیت/fulfillment/بازه/مبلغ + جستجو.",
        auth: "admin",
        params: [
          { name: "status", loc: "query", type: "enum", desc: "وضعیت" },
          { name: "fulfillment", loc: "query", type: "enum", desc: "vault | delivery" },
          { name: "from", loc: "query", type: "date", desc: "از تاریخ" },
          { name: "to", loc: "query", type: "date", desc: "تا تاریخ" },
          { name: "min_total", loc: "query", type: "integer", desc: "حداقل مبلغ" },
          { name: "q", loc: "query", type: "string", desc: "شماره/مشتری" },
          { name: "page", loc: "query", type: "integer", desc: "صفحه" },
        ],
        res: `{
  "data": [
    { "id": 1, "number": "ZRVORD-2026-0901", "status": "shipped", "fulfillment": "delivery",
      "total_irr": 23284000, "gold_mg": 4200, "created_at": "2026-08-10T10:30:00Z",
      "customer": { "id": 1, "name": "سارا کریمی", "mobile": "09121234567" } }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 4, "last_page": 1 }
}`,
        tables: ["orders", "users"], ui: ["AdminOrdersPage"],
      },
      {
        id: "adm-orders-csv", method: "GET", path: "/admin/orders/export.csv", name: "خروجی CSV سفارش‌ها",
        desc: "ستون‌های number,customer,date,total_irr,gold_mg,status,fulfillment.",
        auth: "admin",
        params: [{ name: "status", loc: "query", type: "enum", desc: "فیلتر اختیاری" }],
        res: `HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8`,
        tables: ["orders"], ui: ["AdminOrdersPage — دکمه CSV"],
      },
      {
        id: "adm-payments", method: "GET", path: "/admin/payments", name: "پرداخت‌ها",
        desc: "همه تراکنش‌های درگاه/کیف پول با مشتری و سفارش مرتبط.",
        auth: "admin",
        params: [{ name: "status", loc: "query", type: "enum", desc: "pending | paid | failed | cancelled" }, { name: "driver", loc: "query", type: "string", desc: "درگاه" }],
        res: `{
  "data": [
    { "id": 551, "amount_irr": 23284000, "driver": "به‌پرداخت ملت", "status": "paid",
      "ref_id": "A1B2C3", "paid_at": "2026-08-10T11:02:00Z",
      "customer": "سارا کریمی", "order_no": "ZRVORD-2026-0901" }
  ]
}`,
        tables: ["payments", "orders", "users"], ui: ["AdminPaymentsPage"],
      },
      {
        id: "adm-refund", method: "POST", path: "/admin/payments/{id}/refund", name: "بازپرداخت",
        desc: "RefundModal: مبلغ + دلیل الزامی؛ سفارش refunded و مبلغ به کیف پول ریال مشتری برمی‌گردد.",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه پرداخت" }],
        body: `{ "amount_irr": 23284000, "reason": "انصراف مشتری پیش از ارسال" }`,
        res: `{ "data": { "refund_id": 12, "status": "refunded", "order_status": "refunded" } }`,
        rules: ["amount ≤ مبلغ پرداخت", "reason: required, min 10"],
        errors: [{ status: 409, code: "ALREADY_REFUNDED", desc: "قبلاً بازپرداخت شده" }],
        tables: ["payment_refunds", "payments", "orders", "wallets", "wallet_ledgers", "audit_logs", "notifications"],
        ui: ["AdminPaymentsPage — RefundModal"],
      },
      {
        id: "adm-invoices", method: "GET", path: "/admin/invoices", name: "همه فاکتورها",
        desc: "جستجوی شماره/مشتری + دانلود PDF.",
        auth: "admin",
        params: [{ name: "q", loc: "query", type: "string", desc: "شماره فاکتور یا مشتری" }, { name: "page", loc: "query", type: "integer", desc: "صفحه" }],
        res: `{
  "data": [
    { "id": 1, "number": "ZRV-2026-00012", "issued_at": "2026-08-10T11:02:00Z",
      "total_irr": 23284000, "gold_mg": 4200, "customer": "سارا کریمی", "pdf_url": "/invoices/1.pdf" }
  ]
}`,
        tables: ["invoices", "users"], ui: ["AdminInvoicesPage"],
      },
    ],
  },
  {
    id: "admin-users", code: "P4", name: "مشتریان، کیف پول و کارکنان (ادمین)", role: "admin",
    intro: "مدیریت نقش و KYC کاربران، جستجوی کیف پول و اصلاح دستی Ledger با دلیل الزامی، و دعوت کارکنان.",
    endpoints: [
      {
        id: "adm-customers", method: "GET", path: "/admin/customers", name: "همه کاربران",
        desc: "با نقش، KYC و موجودی‌ها؛ فیلتر نقش/KYC و جستجو.",
        auth: "admin",
        params: [
          { name: "role", loc: "query", type: "enum", desc: "customer | dealer | staff" },
          { name: "kyc", loc: "query", type: "enum", desc: "وضعیت احراز هویت" },
          { name: "q", loc: "query", type: "string", desc: "نام/موبایل" },
          { name: "page", loc: "query", type: "integer", desc: "صفحه" },
        ],
        res: `{
  "data": [
    { "id": 1, "name": "سارا کریمی", "mobile": "09121234567", "role": "customer",
      "kyc_status": "approved", "wallets": { "irr": 25000000, "gold_mg": 12450 },
      "created_at": "2025-12-02T10:12:00Z" }
  ]
}`,
        tables: ["users", "wallets"], ui: ["AdminCustomersPage"],
      },
      {
        id: "adm-customer-detail", method: "GET", path: "/admin/customers/{id}", name: "پرونده کاربر",
        desc: "جزئیات کامل برای Drawer: پروفایل، کیف پول‌ها، آخرین سفارش‌ها و تیکت‌ها.",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه کاربر" }],
        res: `{
  "data": {
    "id": 1, "name": "سارا کریمی", "role": "customer", "kyc_status": "approved",
    "wallets": [ { "currency": "irr", "balance": 25000000 } ],
    "recent_orders": [ { "number": "ZRVORD-2026-0901", "status": "shipped" } ],
    "open_tickets": 1
  }
}`,
        tables: ["users", "wallets", "orders", "tickets"], ui: ["AdminCustomersPage — Drawer"],
      },
      {
        id: "adm-role", method: "PATCH", path: "/admin/customers/{id}/role", name: "تغییر نقش",
        desc: "ارتقا به dealer/staff یا تنزل؛ Impersonate عمداً وجود ندارد.",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه کاربر" }],
        body: `{ "role": "dealer" }`,
        res: `{ "data": { "id": 2, "role": "dealer" } }`,
        errors: [{ status: 403, code: "SELF_DEMOTION", desc: "نمی‌توانید نقش خود را تغییر دهید" }],
        tables: ["users", "audit_logs"], ui: ["AdminCustomersPage — تغییر نقش"],
      },
      {
        id: "adm-wallet-search", method: "GET", path: "/admin/wallets/search", name: "جستجوی کیف پول",
        desc: "یافتن کاربر با موبایل/نام + کیف پول‌ها و Ledger (برای AdminWalletsPage).",
        auth: "admin",
        params: [{ name: "q", loc: "query", type: "string", req: true, desc: "موبایل یا نام" }],
        res: `{
  "data": {
    "user": { "id": 1, "name": "سارا کریمی", "mobile": "09121234567" },
    "wallets": [ { "id": 1, "currency": "irr", "balance": 25000000 }, { "id": 2, "currency": "gold_mg", "balance": 12450 } ],
    "ledger": [ { "id": 2, "direction": "debit", "amount": 3520000, "reason": "خرید طلای آب‌شده", "balance_after": 25000000, "created_at": "2026-08-12T17:22:00Z" } ]
  }
}`,
        tables: ["users", "wallets", "wallet_ledgers"], ui: ["AdminWalletsPage — جستجو"],
      },
      {
        id: "adm-wallet-adjust", method: "POST", path: "/admin/wallets/{user_id}/adjust", name: "اصلاح دستی کیف پول",
        desc: "افزایش/کسر با دلیل الزامی و تأیید دوم؛ در Ledger با reference_type=adjustment و در audit_logs ثبت می‌شود.",
        auth: "admin",
        params: [{ name: "user_id", loc: "path", type: "integer", req: true, desc: "شناسه کاربر" }],
        body: `{ "currency": "irr", "amount": -500000, "reason": "اصلاح کارمزد اشتباه تراکنش ۱۰۳۹" }`,
        res: `{ "data": { "ledger_id": 7, "balance_after": 24500000 } }`,
        rules: ["reason: required, min 10", "amount ≠ 0", "کسر بیش از موجودی → 422"],
        errors: [{ status: 422, code: "INSUFFICIENT_BALANCE", desc: "کسر بیش از موجودی ممکن نیست" }],
        tables: ["wallets", "wallet_ledgers", "audit_logs"], ui: ["AdminWalletsPage — مودال اصلاح"],
      },
      {
        id: "adm-staff", method: "GET", path: "/admin/staff", name: "فهرست کارکنان",
        auth: "admin",
        res: `{
  "data": [
    { "id": 4, "name": "الهام رضایی", "mobile": "09120001122", "email": "elham@zarvan.gold",
      "role": "staff", "is_active": true, "created_at": "2025-11-10T08:00:00Z" }
  ]
}`,
        tables: ["users"], ui: ["AdminStaffPage"],
      },
      {
        id: "adm-staff-invite", method: "POST", path: "/admin/staff/invites", name: "دعوت کارمند",
        desc: "ارسال دعوت‌نامه SMS/ایمیل با نقش staff یا admin؛ کاربر پس از OTP فعال می‌شود.",
        auth: "admin",
        body: `{ "mobile": "09120003344", "role": "staff" }`,
        res: `{ "data": { "invite_id": 3, "expires_at": "2026-08-20T12:00:00Z" } }`,
        rules: ["mobile unique بین کاربران فعلی"],
        tables: ["staff_invites", "users"], ui: ["AdminStaffPage — فرم دعوت"],
      },
      {
        id: "adm-staff-update", method: "PATCH", path: "/admin/staff/{id}", name: "غیرفعال‌سازی کارمند",
        desc: "تعلیق دسترسی بدون حذف تاریخچه.",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه کاربر" }],
        body: `{ "is_active": false }`,
        res: `{ "data": { "id": 4, "is_active": false } }`,
        tables: ["users", "sessions", "audit_logs"], ui: ["AdminStaffPage — تعلیق"],
      },
    ],
  },
  {
    id: "admin-config", code: "P5", name: "تنظیمات، پروموشن و اعلان همگانی (ادمین)", role: "admin",
    intro: "تنظیمات سامانه (اسپرد، TTL، سقف‌ها، حقوقی، PSP، توقف)، مدیریت کوپن/هدیه/معرفی و Broadcast.",
    endpoints: [
      {
        id: "adm-settings-get", method: "GET", path: "/admin/settings", name: "تنظیمات سامانه",
        auth: "admin",
        res: `{
  "data": {
    "bid_bps": 60, "ask_bps": 45, "quote_ttl_sec": 18, "slippage_bps": 10, "min_trade_mg": 100,
    "unverified_daily_cap_irr": 50000000, "otp_enabled": true, "vat_pct": 0,
    "invoice_legal_name": "شرکت طلای زرون (سهامی خاص)", "invoice_reg_no": "۵۴۸۹۳۲",
    "psp": "به‌پرداخت ملت", "sms_provider": "کاوه‌نگار",
    "vault_address": "تهران، خیابان فردوسی...", "maintenance": false, "trading_halt": false
  }
}`,
        tables: ["settings"], ui: ["AdminSettingsPage"],
      },
      {
        id: "adm-settings-save", method: "PUT", path: "/admin/settings", name: "ذخیره تنظیمات",
        desc: "هر تغییر در audit_logs ثبت می‌شود؛ maintenance=true صفحه Maintenance را برای مهمان‌ها فعال می‌کند.",
        auth: "admin",
        body: `{ "quote_ttl_sec": 20, "min_trade_mg": 200, "maintenance": false }`,
        res: `{ "data": { "updated_fields": ["quote_ttl_sec", "min_trade_mg"] } }`,
        rules: ["quote_ttl_sec: 5..120", "min_trade_mg: 50..10000", "vat_pct: 0..20"],
        tables: ["settings", "audit_logs"], ui: ["AdminSettingsPage — ذخیره"],
      },
      {
        id: "adm-coupons", method: "GET", path: "/admin/promotions/coupons", name: "کوپن‌ها",
        auth: "admin",
        res: `{
  "data": [
    { "id": 1, "code": "GOLD-NOWRUZ", "type": "percent", "value": 5, "max_uses": 500,
      "uses_count": 213, "min_order_irr": 5000000, "expires_at": "2026-03-20T23:59:00Z", "is_active": true }
  ]
}`,
        tables: ["coupons"], ui: ["AdminPromotionsPage — تب کوپن"],
      },
      {
        id: "adm-coupon-create", method: "POST", path: "/admin/promotions/coupons", name: "ساخت کوپن",
        auth: "admin",
        body: `{ "code": "SUMMER-10", "type": "percent", "value": 10, "max_uses": 300, "min_order_irr": 3000000, "expires_at": "2026-09-22T23:59:00Z", "is_active": true }`,
        res: `{ "data": { "id": 3, "code": "SUMMER-10", "uses_count": 0 } }`,
        rules: ["code: unique, 3..24, حروف بزرگ و خط‌تیره", "percent → value 1..90؛ fixed_irr → value ≥ 100000"],
        errors: [{ status: 409, code: "COUPON_TAKEN", desc: "کد تکراری است" }],
        tables: ["coupons"], ui: ["AdminPromotionsPage — فرم کوپن"],
      },
      {
        id: "adm-coupon-update", method: "PATCH", path: "/admin/promotions/coupons/{id}", name: "فعال/غیرفعال کوپن",
        auth: "admin",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه کوپن" }],
        body: `{ "is_active": false }`,
        res: `{ "data": { "id": 1, "is_active": false } }`,
        tables: ["coupons"], ui: ["AdminPromotionsPage — Switch"],
      },
      {
        id: "adm-gifts", method: "GET", path: "/admin/promotions/gifts", name: "کارت‌های هدیه",
        desc: "همه هدیه‌ها با وضعیت created/sent/redeemed برای گزارش.",
        auth: "admin",
        res: `{ "data": [ { "id": 77, "code": "ZGIFT-88KQ2", "recipient_mobile": "0912•••0000", "gold_mg": 5000, "status": "sent" } ] }`,
        tables: ["gift_cards"], ui: ["AdminPromotionsPage — تب هدیه"],
      },
      {
        id: "adm-referrals", method: "GET", path: "/admin/promotions/referrals", name: "گزارش معرفی",
        desc: "برترین معرف‌ها و پاداش‌های پرداخت‌شده/در انتظار.",
        auth: "admin",
        res: `{
  "data": {
    "top": [ { "user_id": 1, "code": "ZARV-9K2P", "invited_count": 4, "gold_earned_mg": 4800 } ],
    "pending_rewards_mg": 2400
  }
}`,
        tables: ["referrals", "referral_rewards"], ui: ["AdminPromotionsPage — تب معرفی"],
      },
      {
        id: "adm-broadcast", method: "POST", path: "/admin/broadcasts", name: "اعلان همگانی",
        desc: "ارسال انبوه با کانال‌های انتخابی؛ در notifications همه کاربران (یا فیلتر KYC/نقش) درج می‌شود.",
        auth: "admin",
        body: `{ "title": "به‌روزرسانی سامانه", "body": "پنجشنبه ۲۳ مرداد، ۲ تا ۴ بامداد...", "channels": ["in_app", "sms"], "audience": "all" }`,
        res: `{ "data": { "id": 12, "recipients": 709, "queued": true } }`,
        rules: ["title: 5..80", "body: 10..500", "حداقل یک کانال"],
        tables: ["broadcast_messages", "notifications"], ui: ["AdminBroadcastPage — «ارسال همگانی»"],
      },
      {
        id: "health", method: "GET", path: "/health", name: "سلامت سامانه",
        desc: "برای مانیتورینگ: وضعیت DB، Redis، صف و فید قیمت.",
        auth: "public",
        res: `{ "data": { "status": "ok", "db": "up", "queue": "up", "price_feed": "up", "version": "1.0.0", "time": "2026-08-13T12:00:00Z" } }`,
        tables: [], ui: ["(زیرساخت)"],
      },
    ],
  },
];

export const ALL_MODULES: DocModule[] = [...AUTH_MODULES, ...OPS_MODULES];
export const ROLE_LABEL: Record<string, string> = {
  public: "عمومی", customer: "مشتری", dealer: "نماینده", staff: "کارمند", admin: "مدیر",
};
