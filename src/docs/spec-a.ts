/* ================= Zarvan Gold — API Spec Data (Part A: types + public/customer/dealer) ================= */

export type DocMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type DocRole = "public" | "customer" | "dealer" | "staff" | "admin";

export interface DocParam {
  name: string;
  loc: "path" | "query" | "header";
  type: string;
  req?: boolean;
  desc: string;
}
export interface DocError { status: number; code: string; desc: string }
export interface Endpoint {
  id: string;
  method: DocMethod;
  path: string;
  name: string;
  desc?: string;
  auth: DocRole;
  params?: DocParam[];
  body?: string;
  res: string;
  rules?: string[];
  errors?: DocError[];
  tables: string[];
  ui: string[];
}
export interface DocModule {
  id: string;
  code: string;
  name: string;
  role: DocRole;
  intro: string;
  endpoints: Endpoint[];
}

export const AUTH_MODULES: DocModule[] = [
  {
    id: "auth", code: "A", name: "احراز هویت و نشست", role: "public",
    intro: "ورود OTP-محور (ثبت‌نام با اولین تأیید کد)، ورود با رمز، توکن دسترسی + رفرش، و گام تأیید دوم (Step-up) برای عملیات حساس.",
    endpoints: [
      {
        id: "otp-send", method: "POST", path: "/auth/otp/send", name: "ارسال کد یکبارمصرف",
        desc: "ارسال کد ۶ رقمی با SMS. اگر شماره جدید باشد، حساب در مرحله verify ساخته می‌شود (ثبت‌نام OTP-first).",
        auth: "public",
        params: [{ name: "X-App-Version", loc: "header", type: "string", desc: "نسخه کلاینت برای لاگ" }],
        body: `{
  "mobile": "09121234567",
  "purpose": "login"
}`,
        res: `{
  "data": {
    "expires_in": 120,
    "resend_after": 60
  }
}`,
        rules: ["mobile: required, regex ^09\\d{9}$", "purpose: in login,withdraw,trade — پیش‌فرض login", "هر شماره حداکثر ۵ درخواست در ۱۰ دقیقه"],
        errors: [{ status: 422, code: "VALIDATION", desc: "قالب شماره نامعتبر" }, { status: 429, code: "RATE_LIMITED", desc: "تلاش بیش از حد؛ Retry-After" }],
        tables: ["otp_codes", "users"], ui: ["LoginPage", "PasswordLoginPage (فراموشی رمز)"],
      },
      {
        id: "otp-verify", method: "POST", path: "/auth/otp/verify", name: "تأیید کد و صدور توکن",
        desc: "اعتبارسنجی کد؛ ساخت کاربر جدید در صورت نیاز؛ اتصال معرف؛ صدور access_token (۶۰ دقیقه) و refresh_token (۳۰ روز).",
        auth: "public",
        body: `{
  "mobile": "09121234567",
  "code": "482913",
  "referral_code": "ZARV-9K2P"
}`,
        res: `{
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "dGhpcyBp...",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "name": "سارا کریمی",
      "mobile": "09121234567",
      "role": "customer",
      "kyc_status": "approved"
    }
  }
}`,
        rules: ["code: required, 6 رقم", "کد منقضی‌شده (۱۲۰ ثانیه) → OTP_EXPIRED", "۵ بار کد اشتباه → بلاک ۱۵ دقیقه‌ای", "referral_code اختیاری؛ فقط روی ثبت‌نام جدید اثر دارد"],
        errors: [{ status: 422, code: "OTP_INVALID", desc: "کد اشتباه" }, { status: 409, code: "OTP_EXPIRED", desc: "کد منقضی؛ ارسال دوباره" }],
        tables: ["otp_codes", "users", "sessions", "referrals"], ui: ["OtpPage"],
      },
      {
        id: "auth-me", method: "GET", path: "/auth/me", name: "کاربر جاری",
        desc: "دریافت پروفایل کاربرِ توکن؛ برای hydrate کردن AuthProvider هنگام بارگذاری اپ.",
        auth: "customer",
        res: `{
  "data": {
    "user": {
      "id": 1,
      "name": "سارا کریمی",
      "mobile": "09121234567",
      "email": "sara@example.com",
      "role": "customer",
      "kyc_status": "approved",
      "referral_code": "ZARV-9K2P",
      "created_at": "2025-12-02T10:12:00Z"
    }
  }
}`,
        tables: ["users"], ui: ["AuthProvider (همه Layoutها)"],
      },
      {
        id: "auth-refresh", method: "POST", path: "/auth/refresh", name: "تجدید توکن",
        desc: "دریافت access_token جدید با refresh_token معتبر. چرخش (Rotation): رفرش قبلی باطل می‌شود.",
        auth: "public",
        body: `{ "refresh_token": "dGhpcyBp..." }`,
        res: `{
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "bmV3IHJl...",
    "expires_in": 3600
  }
}`,
        errors: [{ status: 401, code: "TOKEN_INVALID", desc: "رفرش نامعتبر یا استفاده‌شده (Replay) → خروج کامل" }],
        tables: ["sessions"], ui: ["api/client.ts — 401 interceptor"],
      },
      {
        id: "password-login", method: "POST", path: "/auth/password/login", name: "ورود با رمز عبور",
        desc: "ورود کلاسیک برای کاربرانی که رمز تعیین کرده‌اند.",
        auth: "public",
        body: `{ "mobile": "09121234567", "password": "••••••••" }`,
        res: `{ "data": { "access_token": "...", "refresh_token": "...", "expires_in": 3600, "user": { "id": 1, "role": "customer" } } }`,
        errors: [{ status: 422, code: "CREDENTIALS_INVALID", desc: "شماره یا رمز نادرست (بدون تفکیک)" }],
        tables: ["users", "sessions"], ui: ["PasswordLoginPage"],
      },
      {
        id: "password-reset", method: "POST", path: "/auth/password/reset", name: "بازیابی رمز (OTP)",
        desc: "جریان فراموشی رمز: ابتدا otp/send با purpose=login، سپس تنظیم رمز جدید با کد.",
        auth: "public",
        body: `{ "mobile": "09121234567", "code": "482913", "password": "newPass!2026", "password_confirmation": "newPass!2026" }`,
        res: `{ "data": { "ok": true } }`,
        rules: ["password: حداقل ۸ کاراکتر، شامل حرف و رقم"],
        tables: ["users", "otp_codes"], ui: ["PasswordLoginPage → «رمز را فراموش کردم»"],
      },
      {
        id: "password-change", method: "POST", path: "/auth/password/change", name: "تغییر رمز عبور",
        desc: "تغییر رمز با تأیید رمز فعلی؛ همه نشست‌های دیگر باطل می‌شوند.",
        auth: "customer",
        body: `{ "current_password": "...", "password": "...", "password_confirmation": "..." }`,
        res: `{ "data": { "ok": true, "sessions_revoked": 2 } }`,
        tables: ["users", "sessions"], ui: ["ProfilePage"],
      },
      {
        id: "otp-stepup", method: "POST", path: "/auth/otp/step-up", name: "گام تأیید دوم (Step-up)",
        desc: "برای برداشت وجه و فروش طلا: یک OTP تازه با purpose جدا ارسال و یک challenge_token کوتاه‌مدت (۵ دقیقه) برمی‌گرداند که در بدنه عملیات حساس می‌آید.",
        auth: "customer",
        body: `{ "purpose": "withdraw" }`,
        res: `{ "data": { "challenge_id": "ch_8842", "expires_in": 300 } }`,
        rules: ["چالش فقط برای همان purpose معتبر است", "۳ بار اشتباه → باطل شدن چالش"],
        tables: ["otp_codes"], ui: ["OtpStepUpModal (TradePage, WalletPage)"],
      },
      {
        id: "sessions", method: "GET", path: "/auth/sessions", name: "نشست‌های فعال",
        desc: "فهرست دستگاه‌های واردشده برای مدیریت نشست.",
        auth: "customer",
        res: `{
  "data": [
    { "id": 12, "device": "Chrome — Android", "ip": "2.180.••.••", "last_active_at": "2026-08-13T09:40:00Z", "current": true }
  ]
}`,
        tables: ["sessions"], ui: ["ProfilePage"],
      },
      {
        id: "session-revoke", method: "DELETE", path: "/auth/sessions/{id}", name: "بستن نشست",
        desc: "باطل‌کردن یک نشست مشخص (جز نشست جاری).",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه نشست" }],
        res: `{ "data": { "ok": true } }`,
        tables: ["sessions"], ui: ["ProfilePage"],
      },
      {
        id: "auth-logout", method: "POST", path: "/auth/logout", name: "خروج",
        desc: "ابطال access/refresh توکن نشست جاری.",
        auth: "customer",
        res: `{ "data": { "ok": true } }`,
        tables: ["sessions"], ui: ["Sidebar «خروج»، Topbar avatar menu"],
      },
    ],
  },
  {
    id: "pricing", code: "D", name: "قیمت‌گذاری زنده", role: "public",
    intro: "نرخ لحظه‌ای ۱۸ و ۲۴ عیار با Bid/Ask، تاریخچه، snapshotهای اخیر و هشدارهای قیمت. منبع Ticker و همه Quoteها.",
    endpoints: [
      {
        id: "spot", method: "GET", path: "/prices/spot", name: "نرخ لحظه‌ای",
        desc: "آخرین نرخ هر عیار +Bid/Ask محاسبه‌شده از spread تنظیمی، درصد تغییر ۲۴ ساعته، سن داده (stale_seconds) و وضعیت توقف.",
        auth: "public",
        res: `{
  "data": [
    {
      "karat": 18,
      "price_irr_per_gram": 3520000,
      "bid_irr": 3498880,
      "ask_irr": 3535840,
      "change_pct_24h": 0.8,
      "observed_at": "2026-08-13T11:58:12Z",
      "stale_seconds": 42,
      "trading_halt": false
    },
    { "karat": 24, "price_irr_per_gram": 4690000, "bid_irr": 4661860, "ask_irr": 4711105, "change_pct_24h": 0.6, "observed_at": "2026-08-13T11:58:12Z", "stale_seconds": 42, "trading_halt": false }
  ]
}`,
        rules: ["stale_seconds بیش از ۶۰ → کلاینت بنر «تأخیر در قیمت» نشان می‌دهد", "trading_halt=true → دکمه‌های معامله غیرفعال + بنر قرمز"],
        tables: ["spot_prices", "price_settings"], ui: ["LivePriceTicker", "HomePage", "TradePage", "AdminPricingPage"],
      },
      {
        id: "price-history", method: "GET", path: "/prices/history", name: "تاریخچه قیمت",
        desc: "سری زمانی برای نمودار Area در صفحات قیمت، معامله و داشبوردها.",
        auth: "public",
        params: [
          { name: "range", loc: "query", type: "enum", req: true, desc: "1D | 1W | 1M | 90D | 1Y" },
          { name: "karat", loc: "query", type: "enum", desc: "18 | 24 — پیش‌فرض 18" },
        ],
        res: `{
  "data": [
    { "t": "2026-08-12T12:00:00Z", "price_irr": 3508000 },
    { "t": "2026-08-13T12:00:00Z", "price_irr": 3520000 }
  ]
}`,
        rules: ["1D → ۲۴ نقطه ساعتی؛ بقیه روزانه تا سقف ۱۲۰ نقطه (فراتر، تجمیع هفتگی)"],
        tables: ["price_snapshots"], ui: ["LivePricesPage", "TradePage (نمودار 1D)", "DashboardPage", "AdminDashboardPage"],
      },
      {
        id: "price-snapshots", method: "GET", path: "/prices/snapshots", name: "آخرین snapshotها",
        desc: "۱۰ ثبت اخیر نرخ برای جدول «آخرین به‌روزرسانی‌ها».",
        auth: "public",
        params: [{ name: "limit", loc: "query", type: "integer", desc: "پیش‌فرض ۱۰، حداکثر ۵۰" }],
        res: `{ "data": [ { "t": "2026-08-13T11:58:12Z", "price_irr": 3520000, "source": "feed" } ] }`,
        tables: ["price_snapshots"], ui: ["LivePricesPage"],
      },
      {
        id: "price-export", method: "GET", path: "/prices/export.csv", name: "خروجی CSV تاریخچه",
        desc: "دانلود تاریخچه به CSV (ستون‌های time,price_irr_per_gram).",
        auth: "customer",
        params: [{ name: "range", loc: "query", type: "enum", req: true, desc: "محدوده زمانی" }, { name: "karat", loc: "query", type: "enum", desc: "عیار" }],
        res: `HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="zarvan-18k-1M.csv"`,
        tables: ["price_snapshots"], ui: ["LivePricesPage — دکمه CSV"],
      },
      {
        id: "alerts-list", method: "GET", path: "/prices/alerts", name: "فهرست هشدارهای قیمت",
        desc: "هشدارهای فعال کاربر برای عبور قیمت از آستانه.",
        auth: "customer",
        res: `{
  "data": [
    { "id": 1, "karat": 18, "direction": "above", "threshold_irr": 3600000, "is_active": true },
    { "id": 2, "karat": 18, "direction": "below", "threshold_irr": 3400000, "is_active": false }
  ]
}`,
        tables: ["price_alerts"], ui: ["PriceAlertsPage"],
      },
      {
        id: "alerts-create", method: "POST", path: "/prices/alerts", name: "ساخت هشدار قیمت",
        desc: "ثبت آستانه جدید؛ عبور قیمت → نوتیفیکیشن (in_app + SMS طبق ترجیحات).",
        auth: "customer",
        body: `{ "karat": 18, "direction": "above", "threshold_irr": 3600000 }`,
        res: `{ "data": { "id": 3, "karat": 18, "direction": "above", "threshold_irr": 3600000, "is_active": true } }`,
        rules: ["threshold_irr: min 1000000", "حداکثر ۱۰ هشدار فعال per user"],
        tables: ["price_alerts", "notifications"], ui: ["PriceAlertsPage — فرم ساخت"],
      },
      {
        id: "alerts-toggle", method: "PATCH", path: "/prices/alerts/{id}", name: "فعال/غیرفعال کردن هشدار",
        desc: "تغییر is_active با Switch در لیست.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه هشدار" }],
        body: `{ "is_active": false }`,
        res: `{ "data": { "id": 1, "is_active": false } }`,
        tables: ["price_alerts"], ui: ["PriceAlertsPage — Switch"],
      },
      {
        id: "alerts-delete", method: "DELETE", path: "/prices/alerts/{id}", name: "حذف هشدار",
        desc: "حذف هشدار با تأیید در UI.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه هشدار" }],
        res: `{ "data": { "ok": true } }`,
        tables: ["price_alerts"], ui: ["PriceAlertsPage — حذف"],
      },
    ],
  },
  {
    id: "catalog", code: "E", name: "کاتالوگ محصولات", role: "public",
    intro: "فهرست و جزئیات محصولات با فیلتر/جستجو/مرتب‌سازی/صفحه‌بندی، دسته‌بندی درختی، گالری ۳۶۰، علاقه‌مندی و اطلاع موجودی.",
    endpoints: [
      {
        id: "products-list", method: "GET", path: "/catalog/products", name: "فهرست محصولات",
        desc: "فهرست صفحه‌بندی‌شده با فیلترهای نوع، عیار، مناسبت، موجودی، بازه قیمت/وزن و جستجو. فقط status=active برای مهمان.",
        auth: "public",
        params: [
          { name: "type", loc: "query", type: "enum", desc: "jewelry | bar | coin | melted" },
          { name: "karat", loc: "query", type: "enum", desc: "18 | 24" },
          { name: "category", loc: "query", type: "slug", desc: "slug دسته" },
          { name: "occasion", loc: "query", type: "string", desc: "هدیه | نامزدی | ازدواج | جهیزیه" },
          { name: "q", loc: "query", type: "string", desc: "جستجو در نام و SKU" },
          { name: "in_stock", loc: "query", type: "boolean", desc: "فقط موجودها" },
          { name: "price_min", loc: "query", type: "integer", desc: "حداقل قیمت (ریال)" },
          { name: "price_max", loc: "query", type: "integer", desc: "حداکثر قیمت" },
          { name: "weight_min", loc: "query", type: "integer", desc: "حداقل وزن (mg)" },
          { name: "weight_max", loc: "query", type: "integer", desc: "حداکثر وزن (mg)" },
          { name: "sort", loc: "query", type: "enum", desc: "featured | newest | price_asc | price_desc | weight — پیش‌فرض featured" },
          { name: "page", loc: "query", type: "integer", desc: "پیش‌فرض ۱" },
          { name: "per_page", loc: "query", type: "integer", desc: "پیش‌فرض ۱۵، حداکثر ۶۰" },
        ],
        res: `{
  "data": [
    {
      "id": 1, "sku": "BR-18-221", "slug": "rope-bracelet-18k",
      "name": "دستبند طنابی ۱۸ عیار", "type": "jewelry", "karat": 18,
      "weight_mg": 4200, "making_charge_type": "flat", "making_charge_irr": 8500000,
      "status": "active", "images": ["https://cdn.zarvan.gold/p/BR-18-221-1.webp"],
      "has_360": true, "quote_irr": 23284000, "stock_on_hand": 6
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 10, "last_page": 1 },
  "links": { "next": null, "prev": null }
}`,
        tables: ["products", "categories", "inventories"], ui: ["CatalogPage", "HomePage (۴ کارت)", "AdminProductsPage (نسخه admin)"],
      },
      {
        id: "product-detail", method: "GET", path: "/catalog/products/{slug}", name: "جزئیات محصول",
        desc: "همه اطلاعات صفحه محصول: گالری، اجرت، Bid/Ask برای شمش و سکه، موجودی، مشخصات و نقل‌قول زنده.",
        auth: "public",
        params: [{ name: "slug", loc: "path", type: "string", req: true, desc: "slug یکتای محصول" }],
        res: `{
  "data": {
    "id": 1, "sku": "BR-18-221", "slug": "rope-bracelet-18k",
    "name": "دستبند طنابی ۱۸ عیار", "type": "jewelry", "category_id": 12,
    "karat": 18, "weight_mg": 4200,
    "making_charge_type": "flat", "making_charge_irr": 8500000,
    "occasion": "هدیه", "status": "active",
    "description": "دستبند طنابی کلاسیک...",
    "attributes": { "عیار": "۱۸ (۷۵۰)", "قفل": "خرچنگی", "گارانتی عیار": true },
    "images": ["...1.webp", "...2.webp"], "has_360": true,
    "quote_irr": 23284000, "bid_irr": null, "ask_irr": null,
    "stock_on_hand": 6, "published_at": "2026-06-21T00:00:00Z"
  }
}`,
        errors: [{ status: 404, code: "NOT_FOUND", desc: "slug نامعتبر یا محصول غیرفعال" }],
        tables: ["products", "product_images", "inventories"], ui: ["ProductDetailPage"],
      },
      {
        id: "product-360", method: "GET", path: "/catalog/products/{id}/media/360", name: "فریم‌های نمای ۳۶۰",
        desc: "فریم‌های ترتیبی نمای چرخان برای ProductGallery360 (درگ برای چرخش).",
        auth: "public",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه محصول" }],
        res: `{
  "data": {
    "frames": ["https://cdn.zarvan.gold/360/BR-18-221/f01.webp", "..."],
    "count": 24, "fps_hint": 12
  }
}`,
        tables: ["product_360_frames"], ui: ["ProductDetailPage — گالری ۳۶۰", "ImageLightbox"],
      },
      {
        id: "categories-list", method: "GET", path: "/catalog/categories", name: "درخت دسته‌بندی",
        desc: "دسته‌های فعال به‌صورت درختی (children تو در تو) برای فیلتر کاتالوگ.",
        auth: "public",
        res: `{
  "data": [
    { "id": 1, "parent_id": null, "name": "جواهرات", "slug": "jewelry", "type": "jewelry", "sort_order": 1,
      "children": [ { "id": 11, "parent_id": 1, "name": "انگشتر", "slug": "rings", "type": "jewelry", "sort_order": 1, "children": [] } ] }
  ]
}`,
        tables: ["categories"], ui: ["CatalogPage — فیلتر دسته", "AdminCategoriesPage"],
      },
      {
        id: "wishlist-toggle", method: "POST", path: "/catalog/products/{id}/wishlist", name: "علاقه‌مندی (Toggle)",
        desc: "افزودن/حذف از علاقه‌مندی‌ها؛ وضعیت در ProductCard و ProductDetailPage نمایش داده می‌شود (آیکون قلب).",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه محصول" }],
        res: `{ "data": { "wishlisted": true } }`,
        tables: ["wishlists"], ui: ["ProductDetailPage — دکمه علاقه‌مندی"],
      },
      {
        id: "wishlist-list", method: "GET", path: "/catalog/wishlist", name: "فهرست علاقه‌مندی‌ها",
        desc: "لیست محصولات نشان‌شده برای نمایش نشانگر روی کارت‌ها.",
        auth: "customer",
        res: `{ "data": [ { "product_id": 2, "created_at": "2026-08-01T10:00:00Z" } ] }`,
        tables: ["wishlists"], ui: ["CatalogPage", "ProductDetailPage"],
      },
      {
        id: "restock-notify", method: "POST", path: "/catalog/products/{id}/restock-notify", name: "اطلاع‌رسانی موجودی",
        desc: "برای محصول out_of_stock: «به من خبر بده» — هنگام شارژ موجودی نوتیفیکیشن ارسال می‌شود.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه محصول" }],
        res: `{ "data": { "ok": true } }`,
        errors: [{ status: 409, code: "ALREADY_SUBSCRIBED", desc: "قبلاً ثبت شده" }],
        tables: ["restock_notifies", "notifications"], ui: ["ProductDetailPage — حالت ناموجود"],
      },
    ],
  },
  {
    id: "profile", code: "B", name: "پروفایل و ترجیحات", role: "customer",
    intro: "ویرایش پروفایل، CRUD نشانی‌ها (استفاده در Checkout)، ترجیحات نوتیفیکیشن، کد معرف، سایز ذخیره‌شده و فرم تماس.",
    endpoints: [
      {
        id: "profile-get", method: "GET", path: "/profile", name: "پروفایل من",
        desc: "اطلاعات کامل پروفایل برای ProfilePage.",
        auth: "customer",
        res: `{
  "data": {
    "id": 1, "name": "سارا کریمی", "mobile": "09121234567",
    "email": "sara@example.com", "role": "customer", "kyc_status": "approved",
    "referral_code": "ZARV-9K2P", "created_at": "2025-12-02T10:12:00Z"
  }
}`,
        tables: ["users"], ui: ["ProfilePage"],
      },
      {
        id: "profile-update", method: "PATCH", path: "/profile", name: "ویرایش پروفایل",
        desc: "نام و ایمیل قابل ویرایش؛ موبایل فقط با جریان OTP تغییر می‌کند.",
        auth: "customer",
        body: `{ "name": "سارا کریمی", "email": "sara@example.com" }`,
        res: `{ "data": { "id": 1, "name": "سارا کریمی", "email": "sara@example.com" } }`,
        rules: ["name: max 60", "email: nullable, email format"],
        errors: [{ status: 409, code: "EMAIL_TAKEN", desc: "ایمیل تکراری" }],
        tables: ["users"], ui: ["ProfilePage — ذخیره"],
      },
      {
        id: "addresses-list", method: "GET", path: "/profile/addresses", name: "فهرست نشانی‌ها",
        auth: "customer",
        desc: "نشانی‌های کاربر با نشان is_default.",
        res: `{
  "data": [
    { "id": 1, "title": "منزل", "province": "تهران", "city": "تهران",
      "line1": "زعفرانیه، خیابان مقدسی، پلاک ۱۲، واحد ۳", "postal_code": "1938614557", "is_default": true }
  ]
}`,
        tables: ["addresses"], ui: ["ProfilePage", "CheckoutPage"],
      },
      {
        id: "address-create", method: "POST", path: "/profile/addresses", name: "افزودن نشانی",
        desc: "اگر اولین نشانی باشد یا is_default=true، به‌صورت پیش‌فرض تنظیم می‌شود (بقیه false).",
        auth: "customer",
        body: `{ "title": "محل کار", "province": "تهران", "city": "تهران", "line1": "جردن، بلوار نلسون ماندلا، برج سایه، طبقه ۷", "postal_code": "1967834221", "is_default": false }`,
        res: `{ "data": { "id": 3, "title": "محل کار", "is_default": false } }`,
        rules: ["title,province,city,line1: required", "postal_code: required, 10 رقم"],
        tables: ["addresses"], ui: ["AddressModal (Checkout/Profile)"],
      },
      {
        id: "address-update", method: "PUT", path: "/profile/addresses/{id}", name: "ویرایش نشانی",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه نشانی" }],
        body: `{ "title": "منزل", "line1": "...", "is_default": true }`,
        res: `{ "data": { "id": 1, "title": "منزل", "is_default": true } }`,
        rules: ["is_default=true → بقیه نشانی‌ها false می‌شوند"],
        tables: ["addresses"], ui: ["AddressModal — حالت ویرایش"],
      },
      {
        id: "address-delete", method: "DELETE", path: "/profile/addresses/{id}", name: "حذف نشانی",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه نشانی" }],
        res: `{ "data": { "ok": true } }`,
        errors: [{ status: 409, code: "ADDRESS_IN_USE", desc: "نشانی به سفارش در جریان متصل است" }],
        tables: ["addresses"], ui: ["ProfilePage — حذف نشانی"],
      },
      {
        id: "prefs-get", method: "GET", path: "/profile/notification-preferences", name: "ترجیحات نوتیفیکیشن",
        auth: "customer",
        desc: "کانال‌های دریافت پیام برای کاربر.",
        res: `{ "data": { "sms": true, "email": true, "in_app": true, "price_alerts": true } }`,
        tables: ["notification_preferences"], ui: ["ProfilePage — Switchها"],
      },
      {
        id: "prefs-update", method: "PUT", path: "/profile/notification-preferences", name: "ذخیره ترجیحات",
        auth: "customer",
        body: `{ "sms": true, "email": false, "in_app": true, "price_alerts": true }`,
        res: `{ "data": { "sms": true, "email": false, "in_app": true, "price_alerts": true } }`,
        tables: ["notification_preferences"], ui: ["ProfilePage — ذخیره"],
      },
      {
        id: "referrals-me", method: "GET", path: "/profile/referrals", name: "آمار معرفی دوستان",
        desc: "کد معرف، تعداد دعوت‌شده‌ها، طلای کسب‌شده و فهرست معرف‌شده‌ها با موبایل ماسک‌شده.",
        auth: "customer",
        res: `{
  "data": {
    "code": "ZARV-9K2P", "invited_count": 4, "gold_earned_mg": 4800,
    "referees": [
      { "mobile_masked": "0912•••5000", "joined_at": "2026-07-28T13:00:00Z", "reward_status": "paid" }
    ]
  }
}`,
        tables: ["referrals", "referral_rewards"], ui: ["ReferralsPage", "HomePage (teaser)"],
      },
      {
        id: "size-save", method: "PUT", path: "/profile/size", name: "ذخیره سایز",
        desc: "ذخیره سایز انگشتر/دستبند از SizeGuidePage برای پیش‌نمایش در صفحه محصول.",
        auth: "customer",
        body: `{ "kind": "ring", "value_mm": 52 }`,
        res: `{ "data": { "kind": "ring", "value_mm": 52, "us_size": "6", "saved_at": "2026-08-13T12:00:00Z" } }`,
        rules: ["value_mm: ring بین ۴۰ تا ۷۰؛ bracelet بین ۱۴۰ تا ۲۲۰"],
        tables: ["user_sizes"], ui: ["SizeGuidePage — «ذخیره سایز من»"],
      },
      {
        id: "contact", method: "POST", path: "/contact", name: "فرم تماس",
        desc: "پیام مهمان → ساخت Ticket با type=general و تگ «وب‌سایت».",
        auth: "public",
        body: `{ "name": "مهدی رهایی", "mobile": "09351112233", "message": "..." }`,
        res: `{ "data": { "ticket_id": 1047, "ok": true } }`,
        rules: ["message: required, min 10", "mobile regex ^09\\d{9}$"],
        tables: ["tickets", "ticket_messages"], ui: ["ContactPage — دکمه ارسال"],
      },
    ],
  },
  {
    id: "kyc", code: "C", name: "احراز هویت (KYC)", role: "customer",
    intro: "ارسال مدارک سه‌مرحله‌ای (کارت ملی، تصویر کارت، سلفی)، وضعیت و تاریخچه. تأیید/رد سمت Staff انجام می‌شود.",
    endpoints: [
      {
        id: "kyc-status", method: "GET", path: "/kyc/status", name: "وضعیت احراز هویت",
        desc: "وضعیت جاری + timeline رویدادها برای KycPage (unverified→pending→approved/rejected).",
        auth: "customer",
        res: `{
  "data": {
    "status": "pending",
    "submitted_at": "2026-08-12T09:10:00Z",
    "reject_reason": null,
    "timeline": [
      { "at": "2026-08-12T09:10:00Z", "label": "مدارک ارسال شد" },
      { "at": "2026-08-12T09:10:05Z", "label": "در صف بررسی" }
    ],
    "documents": [
      { "id": 31, "kind": "national_id_front", "file_url": "https://cdn.zarvan.gold/kyc/u1/id-f.jpg", "status": "pending" }
    ]
  }
}`,
        tables: ["kyc_submissions", "kyc_documents"], ui: ["KycPage", "KYC pill در Topbar"],
      },
      {
        id: "kyc-submit", method: "POST", path: "/kyc/submit", name: "ارسال مدارک",
        desc: "ثبت نهایی مرحله‌ی جاری؛ وضعیت کاربر به pending می‌رود و در صف StaffKyc قرار می‌گیرد.",
        auth: "customer",
        body: `{ "document_ids": [31, 32, 33], "step": "selfie" }`,
        res: `{ "data": { "status": "pending", "queue_position": 3 } }`,
        rules: ["حداقل سه سند (front, back, selfie) بارگذاری شده باشد", "در وضعیت rejected امکان ارسال مجدد هست"],
        errors: [{ status: 422, code: "KYC_DOCS_MISSING", desc: "مدارک ناقص است" }],
        tables: ["kyc_submissions", "kyc_documents", "notifications"], ui: ["KycPage — «ارسال مدارک»"],
      },
      {
        id: "kyc-upload", method: "POST", path: "/kyc/documents", name: "بارگذاری مدرک",
        desc: "آپلود فایل برای FileDropzone؛ اعتبارسنجی نوع و حجم؛ URL موقت برای پیش‌نمایش.",
        auth: "customer",
        body: `Content-Type: multipart/form-data
file: <binary>
kind: "national_id_front | national_id_back | selfie | buyback_photo"`,
        res: `{ "data": { "id": 31, "kind": "national_id_front", "file_url": "https://cdn.zarvan.gold/kyc/u1/id-f.jpg", "size_kb": 412 } }`,
        rules: ["MIME: image/jpeg, image/png, image/webp", "حداکثر ۵MB", "حداکثر ۲۰ سند per user"],
        errors: [{ status: 415, code: "UNSUPPORTED_MEDIA", desc: "نوع فایل مجاز نیست" }, { status: 413, code: "FILE_TOO_LARGE", desc: "حجم بیش از حد" }],
        tables: ["kyc_documents"], ui: ["KycPage — FileDropzone", "BuybackPage (عکس فیزیکی)"],
      },
      {
        id: "kyc-doc-delete", method: "DELETE", path: "/kyc/documents/{id}", name: "حذف مدرک",
        desc: "حذف سند بارگذاری‌شده تا زمانی که در وضعیت pending نباشد.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سند" }],
        res: `{ "data": { "ok": true } }`,
        errors: [{ status: 409, code: "KYC_LOCKED", desc: "در حال بررسی است؛ قابل حذف نیست" }],
        tables: ["kyc_documents"], ui: ["KycPage — حذف فایل"],
      },
    ],
  },
  {
    id: "wallets", code: "F", name: "کیف پول و تراکنش‌ها", role: "customer",
    intro: "دو کیف پول (ریال و طلای mg) برای هر کاربر، گردش حساب (Ledger) غیرقابل‌تغییر، واریز از PSP و برداشت با OTP.",
    endpoints: [
      {
        id: "wallets-list", method: "GET", path: "/wallets", name: "موجودی کیف پول‌ها",
        desc: "موجودی ریال و طلا — برای WalletCardها و chipهای Topbar.",
        auth: "customer",
        res: `{
  "data": [
    { "id": 1, "currency": "irr", "balance": 25000000, "updated_at": "2026-08-13T09:40:00Z" },
    { "id": 2, "currency": "gold_mg", "balance": 12450, "updated_at": "2026-08-13T09:41:00Z" }
  ]
}`,
        tables: ["wallets"], ui: ["WalletPage", "DashboardPage", "AppTopbar", "TradePage"],
      },
      {
        id: "ledger-list", method: "GET", path: "/wallets/ledger", name: "گردش حساب",
        desc: "تراکنش‌های هر دو کیف پول با فیلتر جهت/نوع و صفحه‌بندی.",
        auth: "customer",
        params: [
          { name: "currency", loc: "query", type: "enum", desc: "irr | gold_mg — پیش‌فرض همه" },
          { name: "direction", loc: "query", type: "enum", desc: "credit | debit" },
          { name: "reference_type", loc: "query", type: "string", desc: "trade | deposit | withdrawal | order | gift | auto_invest | referral | adjustment" },
          { name: "from", loc: "query", type: "date", desc: "از تاریخ ISO" },
          { name: "to", loc: "query", type: "date", desc: "تا تاریخ ISO" },
          { name: "page", loc: "query", type: "integer", desc: "پیش‌فرض ۱" },
        ],
        res: `{
  "data": [
    { "id": 2, "direction": "debit", "amount": 3520000, "reason": "خرید طلای آب‌شده — ۱ گرم",
      "balance_after": 25000000, "reference_type": "trade", "reference_id": 1042,
      "created_at": "2026-08-12T17:22:00Z" }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 6, "last_page": 1 }
}`,
        tables: ["wallet_ledgers"], ui: ["WalletPage", "DashboardPage (۵ ردیف اخیر)"],
      },
      {
        id: "balance-history", method: "GET", path: "/wallets/balance-history", name: "تاریخچه موجودی ۹۰ روزه",
        desc: "سری روزانه موجودی ریال برای AreaChart در WalletPage.",
        auth: "customer",
        res: `{ "data": [ { "t": "2026-08-12T00:00:00Z", "value": 25000000 } ] }`,
        tables: ["wallet_ledgers"], ui: ["WalletPage — نمودار"],
      },
      {
        id: "deposit-create", method: "POST", path: "/wallets/deposits", name: "درخواست واریز",
        desc: "ساخت رکورد واریز و دریافت URL درگاه PSP (redirect). وب‌هوک PSP بعد از پرداخت، موجودی را شارژ می‌کند.",
        auth: "customer",
        body: `{ "amount_irr": 50000000 }`,
        res: `{ "data": { "id": 552, "status": "pending", "redirect_url": "https://pg.example.com/pay?token=..." } }`,
        rules: ["amount_irr: min 100000, max 500000000 per تراکنش"],
        tables: ["deposits", "wallets", "wallet_ledgers"], ui: ["WalletPage — مودال واریز"],
      },
      {
        id: "withdraw-create", method: "POST", path: "/wallets/withdrawals", name: "برداشت وجه (با OTP)",
        desc: "برداشت به شبا؛ نیازمند challenge_token حاصل از step-up. سقف روزانه برای کاربران بدون KYC اعمال می‌شود.",
        auth: "customer",
        body: `{ "amount_irr": 10000000, "iban": "IR820540102680020817909002", "challenge_id": "ch_8842", "otp_code": "482913" }`,
        res: `{ "data": { "id": 208, "status": "pending", "eta_hours": 24 } }`,
        rules: ["iban: required, قالب IR+24 رقم", "amount ≤ موجودی", "کاربر unverified: سقف unverified_daily_cap_irr در روز"],
        errors: [
          { status: 422, code: "INSUFFICIENT_BALANCE", desc: "موجودی کافی نیست" },
          { status: 403, code: "OTP_REQUIRED", desc: "challenge/OTP لازم است" },
          { status: 422, code: "DAILY_CAP_EXCEEDED", desc: "سقف روزانه عبور کرده" },
        ],
        tables: ["withdrawals", "wallets", "wallet_ledgers", "otp_codes"], ui: ["WalletPage — مودال برداشت", "OtpStepUpModal"],
      },
    ],
  },
  {
    id: "trades", code: "G", name: "معامله طلای آب‌شده", role: "customer",
    intro: "خرید/فروش میلی‌گرمی با Quote محدود به TTL، اسلیپیج، OTP برای فروش، و ثبت خودکار در Ledger و Trade. بازخرید فیزیکی جداست.",
    endpoints: [
      {
        id: "quote-create", method: "POST", path: "/trades/quotes", name: "دریافت نقل‌قول",
        desc: "محاسبه قیمت با spread سمت (ask برای خرید، bid برای فروش) و انقضا quote_ttl_sec (پیش‌فرض ۱۸ ثانیه).",
        auth: "customer",
        body: `{ "side": "buy", "weight_mg": 1000 }`,
        res: `{
  "data": {
    "id": 5001, "side": "buy", "weight_mg": 1000,
    "spot_irr": 3520000, "spread_bps": 45,
    "irr_amount": 3535840, "expires_at": "2026-08-13T12:00:18Z"
  }
}`,
        rules: ["weight_mg ≥ min_trade_mg (تنظیمات)", "در trading_halt → 503 TRADING_HALTED"],
        errors: [
          { status: 503, code: "TRADING_HALTED", desc: "معاملات موقتاً متوقف است" },
          { status: 422, code: "MIN_TRADE", desc: "وزن کمتر از حداقل مجاز" },
        ],
        tables: ["trade_quotes", "price_settings", "spot_prices"], ui: ["TradePage — «دریافت قیمت»", "PriceQuoteBox + شمارش معکوس TTL"],
      },
      {
        id: "trade-confirm", method: "POST", path: "/trades/quotes/{id}/confirm", name: "تأیید معامله",
        desc: "اجرای Quote قبل از انقضا. خرید: کسر ریال + افزودن طلا؛ فروش: کسر طلا + افزودن ریال (نیازمند OTP). پاسخ شامل Trade و فاکتور خرید است.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه Quote" }],
        body: `{ "otp_code": "482913" }`,
        res: `{
  "data": {
    "trade": { "id": 2001, "quote_id": 5001, "side": "buy", "status": "filled",
      "weight_mg": 1000, "irr_amount": 3535840, "spot_irr": 3520000,
      "slippage_bps": 0, "filled_at": "2026-08-13T12:00:10Z" },
    "invoice_id": 13
  }
}`,
        rules: ["اگر Quote منقضی باشد → 409 و UI مودال «دریافت مجدد» نشان می‌دهد", "اسلیپیج بیش از slippage_bps تنظیمات → رد و پیشنهاد قیمت تازه"],
        errors: [
          { status: 409, code: "QUOTE_EXPIRED", desc: "قیمت منقضی شد — QuoteExpiredModal" },
          { status: 422, code: "INSUFFICIENT_BALANCE", desc: "موجودی ریال/طلا کافی نیست" },
          { status: 403, code: "OTP_REQUIRED", desc: "برای فروش، OTP لازم است" },
        ],
        tables: ["trades", "trade_quotes", "wallets", "wallet_ledgers", "invoices", "notifications"], ui: ["TradePage — «تأیید معامله»", "مودال موفقیت + فاکتور"],
      },
      {
        id: "trades-list", method: "GET", path: "/trades", name: "تاریخچه معاملات",
        auth: "customer",
        desc: "فهرست معامله‌های کاربر با فیلتر side و بازه زمانی.",
        params: [
          { name: "side", loc: "query", type: "enum", desc: "buy | sell" },
          { name: "from", loc: "query", type: "date", desc: "از تاریخ" },
          { name: "to", loc: "query", type: "date", desc: "تا تاریخ" },
          { name: "page", loc: "query", type: "integer", desc: "صفحه" },
        ],
        res: `{
  "data": [
    { "id": 1042, "side": "buy", "status": "filled", "weight_mg": 1000,
      "irr_amount": 3520000, "spot_irr": 3520000, "slippage_bps": 0,
      "filled_at": "2026-08-12T17:22:00Z" }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 2, "last_page": 1 }
}`,
        tables: ["trades"], ui: ["TradePage — تاریخچه", "DashboardPage «آخرین معامله»"],
      },
      {
        id: "buyback-create", method: "POST", path: "/trades/buyback", name: "درخواست بازخرید",
        desc: "بازخرید از کیف پول (تسویه آنی با Bid) یا طلای فیزیکی (ارسال/مراجعه + عکس). فیزیکی نیازمند KYC approved.",
        auth: "customer",
        body: `{
  "source": "physical",
  "weight_mg": 4200,
  "notes": "دستبند طنابی، فاکتور ZRV-2026-00012",
  "photo_url": "https://cdn.zarvan.gold/kyc/u1/buyback-1.jpg"
}`,
        res: `{ "data": { "id": 96, "status": "pending", "estimated_irr": 14695296 } }`,
        rules: ["weight_mg ≥ 500", "source=wallet → تسویه فوری با bid_irr جاری", "source=physical → photo_url الزامی"],
        errors: [{ status: 403, code: "KYC_REQUIRED", desc: "برای بازخرید فیزیکی احراز هویت لازم است" }],
        tables: ["buyback_requests", "wallets", "wallet_ledgers"], ui: ["BuybackPage — «درخواست بازخرید»"],
      },
    ],
  },
  {
    id: "orders", code: "H", name: "سبد خرید و سفارش", role: "customer",
    intro: "Cart تک‌کاربره با قفل قیمت، کوپن، Checkout سه‌مرحله‌ای (سبد→ارسال→پرداخت)، ثبت سفارش با fulfillment خزانه/تحویل و لغو سفارش پرداخت‌نشده.",
    endpoints: [
      {
        id: "cart-get", method: "GET", path: "/cart", name: "سبد خرید فعلی",
        desc: "سبد فعال کاربر با خطوط، جمع‌ها و انقضای قفل قیمت.",
        auth: "customer",
        res: `{
  "data": {
    "id": 1, "status": "active",
    "lines": [
      { "id": 1, "product_id": 1, "qty": 1, "packaging": "luxury", "unit_quote_irr": 23284000,
        "product": { "id": 1, "sku": "BR-18-221", "name": "دستبند طنابی ۱۸ عیار", "weight_mg": 4200, "karat": 18, "images": ["..."] } }
    ],
    "coupon_code": null, "subtotal_irr": 23284000, "discount_irr": 0,
    "total_irr": 23284000, "quote_expires_at": null
  }
}`,
        tables: ["carts", "cart_lines"], ui: ["CartPage", "CartDrawer", "CheckoutPage", "StorefrontHeader badge"],
      },
      {
        id: "cart-add", method: "POST", path: "/cart/lines", name: "افزودن به سبد",
        desc: "اگر محصول از قبل در سبد باشد، qty جمع می‌شود. قیمت لحظه‌ای محصول به‌عنوان unit_quote ثبت می‌شود.",
        auth: "customer",
        body: `{ "product_id": 2, "qty": 1, "packaging": "standard" }`,
        res: `{ "data": { "cart": { "id": 1, "total_irr": 40388000 }, "added_line_id": 2 } }`,
        rules: ["qty: 1..10", "محصول باید active و موجود باشد (stock_on_hand ≥ qty)"],
        errors: [{ status: 409, code: "OUT_OF_STOCK", desc: "موجودی کافی نیست" }],
        tables: ["carts", "cart_lines", "inventories"], ui: ["ProductCard — «افزودن به سبد»", "ProductDetailPage"],
      },
      {
        id: "cart-qty", method: "PATCH", path: "/cart/lines/{id}", name: "تغییر تعداد / بسته‌بندی",
        desc: "ویرایش qty یا packaging یک خط؛ جمع‌ها باز计算 می‌شوند.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه خط" }],
        body: `{ "qty": 2, "packaging": "luxury" }`,
        res: `{ "data": { "cart": { "id": 1, "total_irr": 46568000 } } }`,
        tables: ["cart_lines"], ui: ["CartPage — +/- و PackagingPicker"],
      },
      {
        id: "cart-remove", method: "DELETE", path: "/cart/lines/{id}", name: "حذف خط سبد",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه خط" }],
        res: `{ "data": { "cart": { "id": 1, "total_irr": 0 } } }`,
        tables: ["cart_lines"], ui: ["CartPage — حذف", "CartDrawer"],
      },
      {
        id: "cart-coupon", method: "POST", path: "/cart/coupon", name: "اعمال کوپن",
        desc: "اعتبارسنجی کد (فعال، سقف مصرف، حداقل سفارش، تاریخ) و محاسبه تخفیف درصدی یا ثابت.",
        auth: "customer",
        body: `{ "code": "GOLD-NOWRUZ" }`,
        res: `{ "data": { "cart": { "coupon_code": "GOLD-NOWRUZ", "discount_irr": 1164200, "total_irr": 22119800 } } }`,
        errors: [{ status: 422, code: "COUPON_INVALID", desc: "کد تخفیف نامعتبر یا منقضی" }, { status: 422, code: "COUPON_MIN_ORDER", desc: "جمع سبد کمتر از حداقل کوپن" }],
        tables: ["coupons", "carts"], ui: ["CouponApplyModal"],
      },
      {
        id: "cart-coupon-remove", method: "DELETE", path: "/cart/coupon", name: "حذف کوپن",
        auth: "customer",
        res: `{ "data": { "cart": { "coupon_code": null, "discount_irr": 0 } } }`,
        tables: ["carts"], ui: ["CartPage — حذف کد"],
      },
      {
        id: "checkout-validate", method: "POST", path: "/checkout/validate", name: "اعتبارسنجی Checkout",
        desc: "قبل از پرداخت: بررسی موجودی، قفل قیمت، KYC برای تحویل فیزیکی و نشانی پیش‌فرض. خطاها به‌صورت فیلد‌به‌فیلد برمی‌گردند.",
        auth: "customer",
        body: `{ "fulfillment": "delivery", "address_id": 1 }`,
        res: `{ "data": { "ok": true, "locked_total_irr": 23284000, "quote_expires_at": "2026-08-13T12:05:00Z" } }`,
        errors: [
          { status: 409, code: "STOCK_CHANGED", desc: "موجودی تغییر کرده — سبد به‌روزرسانی شد" },
          { status: 403, code: "KYC_REQUIRED", desc: "تحویل فیزیکی نیازمند احراز هویت است" },
        ],
        tables: ["carts", "inventories", "users", "addresses"], ui: ["CheckoutPage — ورود به مرحله پرداخت"],
      },
      {
        id: "order-create", method: "POST", path: "/orders", name: "ثبت سفارش",
        desc: "تبدیل سبد به سفارش؛ کسر موجودی، صدور فاکتور، شارژ/کسر کیف پول در fulfillment=vault (طلای آب‌شده)، یا ایجاد Payment برای پرداخت درگاهی.",
        auth: "customer",
        body: `{ "fulfillment": "delivery", "address_id": 1, "payment": { "driver": "wallet" } }`,
        res: `{
  "data": {
    "order": { "id": 5, "number": "ZRVORD-2026-0932", "status": "paid",
      "fulfillment": "delivery", "subtotal_irr": 23284000, "making_irr": 8500000,
      "discount_irr": 0, "tax_irr": 0, "total_irr": 23284000, "gold_mg": 4200,
      "created_at": "2026-08-13T12:05:10Z" },
    "payment": { "id": 553, "status": "paid", "driver": "wallet" },
    "invoice_id": 14
  }
}`,
        errors: [{ status: 409, code: "QUOTE_EXPIRED", desc: "قفل قیمت منقضی شد — بازگشت به مرحله سبد" }, { status: 422, code: "CART_EMPTY", desc: "سبد خرید خالی است" }],
        tables: ["orders", "order_items", "carts", "payments", "invoices", "inventories", "wallets"], ui: ["CheckoutPage — «پرداخت و ثبت سفارش»"],
      },
      {
        id: "orders-list", method: "GET", path: "/orders", name: "فهرست سفارش‌های من",
        desc: "با فیلتر وضعیت و مرتب‌سازی تاریخ.",
        auth: "customer",
        params: [
          { name: "status", loc: "query", type: "enum", desc: "یکی از وضعیت‌های سفارش" },
          { name: "sort", loc: "query", type: "enum", desc: "newest | oldest — پیش‌فرض newest" },
          { name: "page", loc: "query", type: "integer", desc: "صفحه" },
        ],
        res: `{
  "data": [
    { "id": 1, "number": "ZRVORD-2026-0901", "status": "shipped", "fulfillment": "delivery",
      "total_irr": 23284000, "gold_mg": 4200, "created_at": "2026-08-10T10:30:00Z" }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 4, "last_page": 1 }
}`,
        tables: ["orders"], ui: ["OrdersPage"],
      },
      {
        id: "order-detail", method: "GET", path: "/orders/{id}", name: "جزئیات سفارش",
        desc: "اقلام، timeline وضعیت، اطلاعات ارسال/رهگیری و فاکتور مرتبط.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه یا number سفارش" }],
        res: `{
  "data": {
    "id": 1, "number": "ZRVORD-2026-0901", "status": "shipped", "fulfillment": "delivery",
    "subtotal_irr": 23284000, "making_irr": 8500000, "discount_irr": 0, "tax_irr": 0,
    "total_irr": 23284000, "gold_mg": 4200, "paid_at": "2026-08-10T11:02:00Z",
    "items": [ { "id": 1, "product_id": 1, "qty": 1, "packaging": "luxury", "unit_quote_irr": 23284000 } ],
    "shipment": {
      "carrier": "پست جمهوری اسلامی", "tracking_code": "IRPOST-883421", "status": "shipped",
      "timeline": [ { "at": "2026-08-12T09:00:00Z", "label": "تحویل به پست" } ]
    },
    "invoice_id": 1
  }
}`,
        tables: ["orders", "order_items", "shipments", "invoices"], ui: ["OrderDetailPage"],
      },
      {
        id: "order-cancel", method: "POST", path: "/orders/{id}/cancel", name: "لغو سفارش",
        desc: "فقط برای سفارش‌های پرداخت‌نشده (awaiting_payment).",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سفارش" }],
        res: `{ "data": { "id": 4, "status": "cancelled" } }`,
        errors: [{ status: 422, code: "ORDER_PAID", desc: "سفارش پرداخت‌شده قابل لغو نیست — مسیر بازپرداخت" }],
        tables: ["orders", "inventories"], ui: ["OrderDetailPage — «لغو سفارش»"],
      },
      {
        id: "order-reserve", method: "POST", path: "/orders/{id}/reserve", name: "پرداخت بیعانه (رزرو)",
        desc: "رزرو محصول کمیاب با بیعانه ۲۰٪؛ بقیه تا ۷۲ ساعت. محصول در inventories به reserved می‌رود.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سفارش draft" }],
        body: `{ "deposit_pct": 20 }`,
        res: `{ "data": { "order_id": 6, "status": "reserved", "deposit_irr": 4656800, "reserve_expires_at": "2026-08-16T12:00:00Z" } }`,
        errors: [{ status: 409, code: "RESERVE_UNAVAILABLE", desc: "محصول دیگر قابل رزرو نیست" }],
        tables: ["orders", "payments", "inventories"], ui: ["ReserveProductModal"],
      },
      {
        id: "order-pay", method: "POST", path: "/orders/{id}/payments", name: "پرداخت سفارش (درگاه)",
        desc: "ایجاد Payment و دریافت redirect_url درگاه؛ بعد از بازگشت، وضعیت از callback به‌روز می‌شود.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سفارش" }],
        body: `{ "driver": "behpardakht" }`,
        res: `{ "data": { "payment_id": 554, "redirect_url": "https://pg.example.com/pay?token=..." } }`,
        tables: ["payments", "orders"], ui: ["OrderDetailPage — پرداخت سفارش معوق"],
      },
      {
        id: "payment-callback", method: "POST", path: "/payments/webhook/{driver}", name: "وب‌هوک PSP",
        desc: "اعلان سرور-به-سرور درگاه: پرداخت موفق → order.status=paid/vaulted + صدور فاکتور؛ ناموفق → failed. با امضای HMAC اعتبارسنجی و idempotency.",
        auth: "public",
        params: [{ name: "driver", loc: "path", type: "string", req: true, desc: "behpardakht | zarinpal" }],
        body: `{ "ref_id": "A1B2C3", "authority": "...", "status": "paid", "signature": "hmac-sha256" }`,
        res: `{ "data": { "ok": true } }`,
        rules: ["امضای نامعتبر → 401", "پرداخت تکراری → 200 بدون تغییر (idempotent)"],
        tables: ["payments", "orders", "invoices", "notifications"], ui: ["(سروری) — OrdersPage نتیجه را نشان می‌دهد"],
      },
      {
        id: "order-shipment", method: "GET", path: "/orders/{id}/shipments", name: "وضعیت مرسوله",
        desc: "جزئیات carrier، کد رهگیری و timeline رویدادها.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه سفارش" }],
        res: `{
  "data": {
    "carrier": "پست جمهوری اسلامی", "tracking_code": "IRPOST-883421", "status": "shipped",
    "shipped_at": "2026-08-12T09:00:00Z", "delivered_at": null,
    "timeline": [ { "at": "2026-08-10T10:30:00Z", "label": "ثبت سفارش" } ]
  }
}`,
        tables: ["shipments", "shipment_events"], ui: ["OrderDetailPage — Timeline", "DeliveryPage"],
      },
    ],
  },
  {
    id: "invoices", code: "I", name: "فاکتورها", role: "customer",
    intro: "فاکتور رسمی برای هر خرید (سفارش و معامله)، با PDF حقوقی بر اساس تنظیمات invoice_legal.",
    endpoints: [
      {
        id: "invoices-list", method: "GET", path: "/invoices", name: "فهرست فاکتورها",
        auth: "customer",
        params: [{ name: "page", loc: "query", type: "integer", desc: "صفحه" }],
        res: `{
  "data": [
    { "id": 1, "number": "ZRV-2026-00012", "issued_at": "2026-08-10T11:02:00Z",
      "total_irr": 23284000, "gold_mg": 4200, "pdf_url": "/invoices/1.pdf" }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 3, "last_page": 1 }
}`,
        tables: ["invoices"], ui: ["InvoicesPage", "TradePage (مودال فاکتور)"],
      },
      {
        id: "invoice-detail", method: "GET", path: "/invoices/{id}", name: "جزئیات فاکتور",
        desc: "اقلام، اجرت، مالیات و اطلاعات حقوقی فروشنده برای پیش‌نمایش InvoiceDetailPage.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه فاکتور" }],
        res: `{
  "data": {
    "id": 1, "number": "ZRV-2026-00012", "issued_at": "2026-08-10T11:02:00Z",
    "total_irr": 23284000, "gold_mg": 4200,
    "seller": { "legal_name": "شرکت طلای زرون (سهامی خاص)", "reg_no": "۵۴۸۹۳۲" },
    "lines": [ { "description": "دستبند طنابی ۱۸ عیار", "qty": 1, "weight_mg": 4200, "making_irr": 8500000, "total_irr": 23284000 } ]
  }
}`,
        tables: ["invoices", "orders"], ui: ["InvoiceDetailPage"],
      },
      {
        id: "invoice-pdf", method: "GET", path: "/invoices/{id}.pdf", name: "دانلود PDF فاکتور",
        desc: "PDF حقوقی با سربرگ، امضا و مهر دیجیتال؛ کش‌شده در CDN.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه فاکتور" }],
        res: `HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="ZRV-2026-00012.pdf"`,
        tables: ["invoices"], ui: ["InvoicesPage — PDF", "InvoiceDetailPage — چاپ"],
      },
    ],
  },
  {
    id: "delivery", code: "J", name: "تحویل فیزیکی از خزانه", role: "customer",
    intro: "درخواست تبدیل طلای کیف پول به شمش فیزیکی (5/10/50 گرمی) و ارسال به نشانی؛ نیازمند KYC approved.",
    endpoints: [
      {
        id: "delivery-list", method: "GET", path: "/delivery/requests", name: "درخواست‌های تحویل",
        auth: "customer",
        res: `{
  "data": [
    { "id": 4, "weight_mg": 50000, "bar_size": "50g", "status": "processing",
      "address": "تهران، زعفرانیه...", "created_at": "2026-08-05T10:00:00Z", "tracking_code": null }
  ]
}`,
        tables: ["delivery_requests"], ui: ["DeliveryPage"],
      },
      {
        id: "delivery-create", method: "POST", path: "/delivery/requests", name: "ثبت درخواست تحویل",
        desc: "کسر طلا از کیف پول (رزرو)، انتخاب قالب شمش و نشانی. کارمزد ضرب+ارسال در quote پاسخ می‌آید.",
        auth: "customer",
        body: `{ "weight_mg": 50000, "bar_size": "50g", "address_id": 1 }`,
        res: `{ "data": { "id": 5, "status": "pending", "fee_irr": 1200000, "eta_days": 5 } }`,
        rules: ["weight_mg باید مضربی از قالب انتخابی باشد", "موجودی gold_mg ≥ weight + ذخیره حداقلی"],
        errors: [{ status: 403, code: "KYC_REQUIRED", desc: "تحویل فیزیکی نیازمند احراز هویت" }, { status: 422, code: "INSUFFICIENT_GOLD", desc: "طلای کافی نیست" }],
        tables: ["delivery_requests", "wallets", "wallet_ledgers"], ui: ["DeliveryPage — فرم vault→physical"],
      },
    ],
  },
  {
    id: "invest", code: "K", name: "سبد، خرید خودکار و اقساط", role: "customer",
    intro: "خلاصه سود و زیان پرتفوی، لات‌های خرید، خرید پله‌ای ماهانه و قراردادهای اقساطی با پرداخت قسط.",
    endpoints: [
      {
        id: "portfolio-summary", method: "GET", path: "/portfolio/summary", name: "خلاصه پرتفوی",
        desc: "بهای تمام‌شده، ارزش روز، سود/زیان و وزن کل.",
        auth: "customer",
        res: `{
  "data": { "cost_irr": 41300000, "market_irr": 43824000, "pnl_irr": 2524000, "pnl_pct": 6.1, "gold_mg": 12450 }
}`,
        tables: ["wallets", "trades", "portfolio_lots"], ui: ["PortfolioPage", "DashboardPage"],
      },
      {
        id: "portfolio-lots", method: "GET", path: "/portfolio/lots", name: "لات‌های خرید",
        auth: "customer",
        desc: "هر خرید به‌صورت لات با بهای تمام‌شده و ارزش روز (FIFO هنگام فروش).",
        res: `{
  "data": [
    { "id": 1, "acquired_at": "2026-08-12T17:22:00Z", "weight_mg": 1000, "cost_irr": 3520000, "market_irr": 3520000 },
    { "id": 2, "acquired_at": "2026-07-20T12:15:00Z", "weight_mg": 10000, "cost_irr": 33900000, "market_irr": 35200000 }
  ]
}`,
        tables: ["portfolio_lots"], ui: ["PortfolioPage — جدول لات‌ها"],
      },
      {
        id: "portfolio-pnl", method: "GET", path: "/portfolio/pnl", name: "سری سود/زیان ۹۰ روزه",
        auth: "customer",
        res: `{ "data": [ { "t": "2026-08-12T00:00:00Z", "value": 2524000 } ] }`,
        tables: ["portfolio_lots", "price_snapshots"], ui: ["PortfolioPage — نمودار PnL"],
      },
      {
        id: "plans-list", method: "GET", path: "/auto-invest/plans", name: "برنامه‌های خرید خودکار",
        auth: "customer",
        res: `{ "data": [ { "id": 1, "amount_irr": 10000000, "day_of_month": 5, "is_active": true } ] }`,
        tables: ["auto_invest_plans"], ui: ["AutoInvestPage"],
      },
      {
        id: "plan-create", method: "POST", path: "/auto-invest/plans", name: "ساخت برنامه",
        desc: "در روز مشخص ماه، به‌اندازه مبلغ با Ask روز خرید انجام و در Ledger ثبت می‌شود (Job زمان‌بند).",
        auth: "customer",
        body: `{ "amount_irr": 5000000, "day_of_month": 20 }`,
        res: `{ "data": { "id": 3, "amount_irr": 5000000, "day_of_month": 20, "is_active": true } }`,
        rules: ["amount_irr ≥ 1000000", "day_of_month: 1..28"],
        tables: ["auto_invest_plans"], ui: ["AutoInvestPage — فرم ساخت"],
      },
      {
        id: "plan-toggle", method: "PATCH", path: "/auto-invest/plans/{id}", name: "توقف/ادامه برنامه",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه برنامه" }],
        body: `{ "is_active": false }`,
        res: `{ "data": { "id": 1, "is_active": false } }`,
        tables: ["auto_invest_plans"], ui: ["AutoInvestPage — Switch"],
      },
      {
        id: "plan-delete", method: "DELETE", path: "/auto-invest/plans/{id}", name: "حذف برنامه",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه برنامه" }],
        res: `{ "data": { "ok": true } }`,
        tables: ["auto_invest_plans"], ui: ["AutoInvestPage — حذف"],
      },
      {
        id: "contracts-list", method: "GET", path: "/installments/contracts", name: "قراردادهای اقساطی",
        auth: "customer",
        res: `{
  "data": [
    { "id": 1, "months": 12, "down_irr": 12000000, "principal_irr": 60000000,
      "paid_irr": 24000000, "remaining_irr": 36000000, "status": "active",
      "next_due_at": "2026-09-05T00:00:00Z", "next_amount_irr": 6000000 }
  ]
}`,
        tables: ["installment_contracts"], ui: ["InstallmentsPage"],
      },
      {
        id: "installment-pay", method: "POST", path: "/installments/contracts/{id}/payments", name: "پرداخت قسط",
        desc: "پرداخت قسط از کیف پول ریال یا درگاه؛ Progress قرارداد به‌روز می‌شود.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه قرارداد" }],
        body: `{ "amount_irr": 6000000, "method": "wallet" }`,
        res: `{ "data": { "paid_irr": 30000000, "remaining_irr": 30000000 } }`,
        errors: [{ status: 422, code: "INSUFFICIENT_BALANCE", desc: "موجودی کافی نیست" }],
        tables: ["installment_contracts", "installment_payments", "wallets", "wallet_ledgers"], ui: ["InstallmentsPage — مودال «پرداخت قسط»"],
      },
    ],
  },
  {
    id: "gifts", code: "L", name: "هدیه و معرفی", role: "customer",
    intro: "کارت هدیه طلا با کد یکتا برای موبایل گیرنده، و آمار برنامه معرفی دوستان.",
    endpoints: [
      {
        id: "gifts-list", method: "GET", path: "/gifts", name: "هدیه‌های ارسالی",
        auth: "customer",
        res: `{
  "data": [
    { "id": 77, "code": "ZGIFT-88KQ2", "recipient_mobile": "09125550000", "gold_mg": 5000,
      "status": "sent", "packaging": "luxury", "message": "تولدت مبارک!", "created_at": "2026-07-28T13:00:00Z" }
  ]
}`,
        tables: ["gift_cards"], ui: ["GiftsPage"],
      },
      {
        id: "gift-create", method: "POST", path: "/gifts", name: "خرید هدیه",
        desc: "کسر طلا/ریال از کیف پول، تولید کد ZGIFT و SMS به گیرنده. packaging=luxury هزینه بسته‌بندی دارد.",
        auth: "customer",
        body: `{ "recipient_mobile": "09125550000", "gold_mg": 5000, "packaging": "luxury", "message": "تولدت مبارک!" }`,
        res: `{ "data": { "id": 78, "code": "ZGIFT-41MN7", "status": "sent" } }`,
        rules: ["gold_mg ≥ 100", "recipient ≠ موبایل خود کاربر", "message: max 200"],
        tables: ["gift_cards", "wallets", "wallet_ledgers"], ui: ["GiftsPage — فرم خرید هدیه"],
      },
      {
        id: "gift-claim", method: "POST", path: "/gifts/{code}/claim", name: "دریافت هدیه",
        desc: "گیرنده (با OTP موبایل خودش) کد را فعال و طلا به کیف پولش منتقل می‌شود.",
        auth: "customer",
        params: [{ name: "code", loc: "path", type: "string", req: true, desc: "کد هدیه" }],
        res: `{ "data": { "ok": true, "gold_mg": 5000 } }`,
        errors: [{ status: 409, code: "GIFT_REDEEMED", desc: "کد قبلاً استفاده شده" }, { status: 404, code: "GIFT_NOT_FOUND", desc: "کد نامعتبر" }],
        tables: ["gift_cards", "wallets", "wallet_ledgers", "notifications"], ui: ["(صفحه فرود هدیه)"],
      },
    ],
  },
  {
    id: "support", code: "M", name: "پشتیبانی و تیکت", role: "customer",
    intro: "تیکت‌های کاربر با موضوع/نوع/اولویت، گفتگوی دوطرفه و بستن تیکت.",
    endpoints: [
      {
        id: "tickets-list", method: "GET", path: "/tickets", name: "تیکت‌های من",
        auth: "customer",
        params: [{ name: "status", loc: "query", type: "enum", desc: "open | pending | closed" }],
        res: `{
  "data": [
    { "id": 1042, "subject": "پیگیری مرسوله ZRVORD-2026-0901", "type": "delivery",
      "status": "pending", "priority": "high", "updated_at": "2026-08-12T10:15:00Z" }
  ]
}`,
        tables: ["tickets"], ui: ["TicketsPage"],
      },
      {
        id: "ticket-create", method: "POST", path: "/tickets", name: "ثبت تیکت",
        desc: "اولین پیام همراه تیکت ساخته می‌شود؛ اولویت پیش‌فرض normal.",
        auth: "customer",
        body: `{ "subject": "مغایرت قیمت سکه", "type": "price_match", "body": "قیمت سکه..." }`,
        res: `{ "data": { "id": 1043, "status": "open", "priority": "normal" } }`,
        rules: ["subject: 5..120", "type: general | price_match | delivery | kyc", "body: min 10"],
        tables: ["tickets", "ticket_messages"], ui: ["TicketsPage — فرم ثبت"],
      },
      {
        id: "ticket-messages", method: "GET", path: "/tickets/{id}/messages", name: "گفتگوی تیکت",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه تیکت" }],
        res: `{
  "data": [
    { "id": 1, "body": "سلام، سفارش دستبند را...", "is_staff": false, "created_at": "2026-08-12T09:50:00Z" },
    { "id": 2, "body": "سلام سارا عزیز، مرسوله شما...", "is_staff": true, "created_at": "2026-08-12T10:15:00Z" }
  ]
}`,
        tables: ["ticket_messages"], ui: ["TicketDetailPage — حباب‌ها"],
      },
      {
        id: "ticket-reply", method: "POST", path: "/tickets/{id}/messages", name: "پاسخ به تیکت",
        desc: "پاسخ کاربر → status=open؛ پاسخ کارمند → status=pending و نوتیفیکیشن برای طرف مقابل.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه تیکت" }],
        body: `{ "body": "ممنون، منتظر می‌مانم." }`,
        res: `{ "data": { "id": 3, "body": "...", "is_staff": false, "created_at": "2026-08-13T12:00:00Z" } }`,
        errors: [{ status: 409, code: "TICKET_CLOSED", desc: "تیکت بسته شده است" }],
        tables: ["ticket_messages", "tickets", "notifications"], ui: ["TicketDetailPage — «پاسخ»"],
      },
      {
        id: "ticket-close", method: "POST", path: "/tickets/{id}/close", name: "بستن تیکت",
        desc: "توسط مالک تیکت یا کارمند.",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه تیکت" }],
        res: `{ "data": { "id": 1042, "status": "closed" } }`,
        tables: ["tickets"], ui: ["TicketDetailPage", "StaffTicketsPage"],
      },
    ],
  },
  {
    id: "notifications", code: "N", name: "اعلان‌ها", role: "customer",
    intro: "اعلان‌های درون‌برنامه با شمارنده نخوانده، علامت‌گذاری تکی/همگانی و Broadcastهای ادمین.",
    endpoints: [
      {
        id: "notif-list", method: "GET", path: "/notifications", name: "فهرست اعلان‌ها",
        auth: "customer",
        params: [
          { name: "type", loc: "query", type: "string", desc: "trade | price | order | promo | system | kyc" },
          { name: "unreadOnly", loc: "query", type: "boolean", desc: "فقط نخوانده‌ها" },
          { name: "page", loc: "query", type: "integer", desc: "صفحه" },
        ],
        res: `{
  "data": [
    { "id": 1, "type": "trade", "title": "معامله انجام شد",
      "body": "خرید ۱ گرم طلای ۱۸ عیار با موفقیت ثبت شد.",
      "data": { "trade_id": 1042 }, "read_at": null, "created_at": "2026-08-12T17:22:00Z" }
  ],
  "meta": { "current_page": 1, "per_page": 15, "total": 5, "last_page": 1 }
}`,
        tables: ["notifications"], ui: ["NotificationsPage", "AppTopbar bell"],
      },
      {
        id: "notif-unread", method: "GET", path: "/notifications/unread-count", name: "شمارنده نخوانده",
        auth: "customer",
        res: `{ "data": { "count": 4 } }`,
        tables: ["notifications"], ui: ["AppTopbar — badge ۴"],
      },
      {
        id: "notif-read", method: "POST", path: "/notifications/{id}/read", name: "خوانده‌شدن اعلان",
        auth: "customer",
        params: [{ name: "id", loc: "path", type: "integer", req: true, desc: "شناسه اعلان" }],
        res: `{ "data": { "ok": true } }`,
        tables: ["notifications"], ui: ["NotificationsPage — کلیک روی ردیف"],
      },
      {
        id: "notif-read-all", method: "POST", path: "/notifications/read-all", name: "خواندن همه",
        auth: "customer",
        res: `{ "data": { "marked": 4 } }`,
        tables: ["notifications"], ui: ["NotificationsPage — «خواندن همه»"],
      },
    ],
  },
  {
    id: "dealer", code: "Q", name: "نمایندگی (عمده‌فروشی)", role: "dealer",
    intro: "بخش ویژه dealer: آمار اسپرد عمده، سفارش‌های عمده و زمان‌بندی تحویل.",
    endpoints: [
      {
        id: "dealer-stats", method: "GET", path: "/dealer/stats", name: "داشبورد نمایندگی",
        desc: "اسپرد عمده، حجم ۳۰ روز و سفارش‌های عمده اخیر.",
        auth: "dealer",
        res: `{
  "data": {
    "spread_bps": 25, "volume_30d_mg": 1240000, "orders_count": 9,
    "orders": [
      { "id": 1, "number": "ZRVWHL-2026-114", "qty_mg": 500000, "total_irr": 1755000000, "status": "processing", "date": "2026-08-11T10:00:00Z" }
    ]
  }
}`,
        tables: ["wholesale_orders", "wallets"], ui: ["DealerDashboardPage"],
      },
      {
        id: "dealer-order", method: "POST", path: "/dealer/orders", name: "سفارش عمده",
        desc: "ثبت سفارش عمده با Quote اسپرد نمایندگی و زمان‌بندی تحویل پلکانی.",
        auth: "dealer",
        body: `{ "qty_mg": 250000, "delivery_schedule": ["2026-09-01", "2026-09-15"], "notes": "..." }`,
        res: `{ "data": { "id": 4, "number": "ZRVWHL-2026-118", "total_irr": 880000000, "status": "pending" } }`,
        rules: ["qty_mg ≥ 100000", "حداکثر ۴ قسط تحویل"],
        tables: ["wholesale_orders", "wallets", "wallet_ledgers"], ui: ["DealerDashboardPage — «سفارش عمده»", "DealerBulkPage"],
      },
      {
        id: "dealer-orders", method: "GET", path: "/dealer/orders", name: "سفارش‌های عمده",
        auth: "dealer",
        params: [{ name: "status", loc: "query", type: "enum", desc: "pending | processing | delivered" }],
        res: `{ "data": [ { "id": 1, "number": "ZRVWHL-2026-114", "qty_mg": 500000, "status": "processing" } ] }`,
        tables: ["wholesale_orders"], ui: ["DealerBulkPage"],
      },
    ],
  },
];
