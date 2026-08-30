/* ================= Zarvan Gold — Docs Meta: standards, mapping, audit ================= */
import type { DocMethod } from "./spec-a";

export const ENVELOPE_OK = `{
  "data": {
    "id": 1042,
    "side": "buy",
    "status": "filled"
  }
}`;

export const ENVELOPE_LIST = `{
  "data": [ { "id": 1 }, { "id": 2 } ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 214,
    "last_page": 15
  },
  "links": {
    "first": "/api/v1/orders?page=1",
    "prev": null,
    "next": "/api/v1/orders?page=2",
    "last": "/api/v1/orders?page=15"
  }
}`;

export const ENVELOPE_ERR = `{
  "message": "موجودی کافی نیست",
  "code": "INSUFFICIENT_BALANCE",
  "errors": {
    "amount_irr": ["مبلغ از موجودی کیف پول بیشتر است"]
  }
}`;

export interface ErrCode { status: number; code: string; fa: string; desc: string }
export const ERROR_CODES: ErrCode[] = [
  { status: 400, code: "BAD_REQUEST", fa: "درخواست نامعتبر", desc: "بدنه یا پارامترهای ساختاری نادرست" },
  { status: 401, code: "UNAUTHENTICATED", fa: "نشست منقضی شد", desc: "توکن غایب/باطل — کلاینت به /login می‌رود" },
  { status: 401, code: "TOKEN_INVALID", fa: "توکن نامعتبر", desc: "رفرش باطل یا Replay" },
  { status: 403, code: "FORBIDDEN", fa: "دسترسی مجاز نیست", desc: "نقش ناکافی — Error403Page" },
  { status: 403, code: "OTP_REQUIRED", fa: "کد تأیید لازم است", desc: "عملیات حساس بدون step-up" },
  { status: 403, code: "KYC_REQUIRED", fa: "احراز هویت لازم است", desc: "تحویل فیزیکی/بازخرید بدون KYC" },
  { status: 404, code: "NOT_FOUND", fa: "پیدا نشد", desc: "منبع یا مسیر ناموجود — Error404Page" },
  { status: 409, code: "QUOTE_EXPIRED", fa: "قیمت منقضی شد", desc: "TTL گذشته — QuoteExpiredModal + «دریافت مجدد»" },
  { status: 409, code: "STOCK_CHANGED", fa: "موجودی تغییر کرد", desc: "تعارض موجودی هنگام Checkout" },
  { status: 409, code: "OTP_EXPIRED", fa: "کد منقضی شد", desc: "ارسال دوباره لازم است" },
  { status: 413, code: "FILE_TOO_LARGE", fa: "حجم فایل زیاد است", desc: "بیش از سقف آپلود" },
  { status: 415, code: "UNSUPPORTED_MEDIA", fa: "نوع فایل مجاز نیست", desc: "MIME خارج از فهرست" },
  { status: 422, code: "VALIDATION", fa: "خطای اعتبارسنجی", desc: "errors فیلد‌به‌فیلد — نمایش زیر Input" },
  { status: 422, code: "INSUFFICIENT_BALANCE", fa: "موجودی کافی نیست", desc: "کسر بیش از موجودی کیف پول" },
  { status: 422, code: "COUPON_INVALID", fa: "کد تخفیف نامعتبر", desc: "غیرفعال/منقضی/سقف مصرف" },
  { status: 422, code: "MIN_TRADE", fa: "کمتر از حداقل معامله", desc: "وزن کمتر از min_trade_mg" },
  { status: 422, code: "HALT_CONFIRMATION", fa: "عبارت تأیید نادرست", desc: "توقف معاملات بدون تایپ HALT" },
  { status: 429, code: "RATE_LIMITED", fa: "تلاش بیش از حد", desc: "Retry-After در هدر" },
  { status: 503, code: "TRADING_HALTED", fa: "معاملات متوقف است", desc: "بنر قرمز سراسری + دکمه‌های غیرفعال" },
  { status: 503, code: "MAINTENANCE", fa: "در حال به‌روزرسانی", desc: "MaintenancePage برای مهمان‌ها" },
  { status: 500, code: "SERVER_ERROR", fa: "خطای سرور", desc: "Error500Page + Sentry" },
];

export const ROLES_MATRIX = [
  { role: "مهمان (public)", fa: "بدون توکن", access: "کاتالوگ، قیمت‌ها، OTP، تماس" },
  { role: "customer", fa: "Bearer", access: "همه ماژول‌های شخصی؛ منابع فقط صاحب آن‌ها" },
  { role: "dealer", fa: "Bearer", access: "همه دسترسی customer + ماژول عمده‌فروشی" },
  { role: "staff", fa: "Bearer", access: "پنل عملیات؛ مشتریان فقط‌خواندنی؛ بدون تنظیمات" },
  { role: "admin", fa: "Bearer", access: "همه /admin/* + تنظیمات + اصلاح Ledger + توقف معاملات" },
];

export const RATE_LIMITS = [
  { route: "POST /auth/otp/send", limit: "۵ در ۱۰ دقیقه per mobile", note: "جلوگیری از بمباران SMS" },
  { route: "POST /auth/otp/verify", limit: "۵ تلاش per کد", note: "بلاک ۱۵ دقیقه‌ای پس از شکست" },
  { route: "POST /trades/quotes", limit: "۳۰ در دقیقه per user", note: "جلوگیری از اسپم Quote" },
  { route: "GET * (عمومی)", limit: "۱۲۰ در دقیقه per IP", note: "هدر X-RateLimit-Remaining" },
  { route: "آپلودها", limit: "۲۰ فایل در ساعت per user", note: "حجم کل ≤ ۵۰MB" },
];

export const UPLOADS = [
  { where: "KYC (FileDropzone)", ep: "POST /kyc/documents", mime: "jpeg, png, webp", size: "۵MB", store: "S3 خصوصی + URL امضاشده ۱۵ دقیقه‌ای" },
  { where: "عکس بازخرید", ep: "POST /kyc/documents (kind=buyback_photo)", mime: "jpeg, png, webp", size: "۵MB", store: "S3 خصوصی" },
  { where: "تصاویر محصول", ep: "POST /admin/uploads", mime: "jpeg, png, webp", size: "۸MB", store: "CDN عمومی + webp بهینه" },
  { where: "فریم‌های ۳۶۰", ep: "POST /admin/uploads (kind=product_360)", mime: "webp", size: "۲MB × ۲۴ فریم", store: "CDN عمومی" },
];

export const AUTH_FLOW = [
  { step: "۱", title: "ارسال کد", desc: "POST /auth/otp/send — کد ۶ رقمی، ۱۲۰ ثانیه" },
  { step: "۲", title: "تأیید", desc: "POST /auth/otp/verify — ساخت کاربر جدید + اتصال معرف" },
  { step: "۳", title: "توکن‌ها", desc: "access (۶۰ دقیقه) + refresh (۳۰ روز، چرخشی)" },
  { step: "۴", title: "تجدید", desc: "POST /auth/refresh در 401 — Replay = خروج کامل" },
  { step: "۵", title: "Step-up", desc: "برای برداشت/فروش: challenge یک‌بارمصرف ۵ دقیقه‌ای" },
];

export const BG_JOBS = [
  { name: "price:sync", cron: "هر ۳۰ ثانیه", desc: "دریافت فید بازار → spot_prices + snapshot؛ محاسبه stale_seconds" },
  { name: "alert:check", cron: "پس از هر sync", desc: "بررسی price_alerts فعال → notification + SMS" },
  { name: "quote:expire", cron: "هر دقیقه", desc: "باطل‌کردن trade_quotes منقضی (status=expired)" },
  { name: "auto-invest:run", cron: "روزانه ۰۹:۰۰", desc: "اجرای برنامه‌های day_of_month = امروز با Ask لحظه‌ای" },
  { name: "reserve:release", cron: "هر ساعت", desc: "آزادسازی رزرو بیعانه منقضی + برگشت موجودی" },
  { name: "invoice:pdf", cron: "صف", desc: "تولید PDF فاکتور پس از پرداخت (dompdf + فونت وزیر)" },
  { name: "withdraw:settle", cron: "دسته‌ای ۳×روز", desc: "ارسال فایل تسویه به بانک و به‌روزرسانی وضعیت" },
  { name: "broadcast:send", cron: "صف", desc: "ارسال انبوه SMS/ایمیل با throttle" },
];

export interface MapRow { page: string; comp: string; action: string; method: DocMethod; path: string; table: string }
export const MAPPING: MapRow[] = [
  { page: "StorefrontHeader", comp: "Ticker", action: "نرخ لحظه‌ای + stale/halt", method: "GET", path: "/prices/spot", table: "spot_prices" },
  { page: "StorefrontHeader", comp: "badge سبد", action: "شمارنده اقلام", method: "GET", path: "/cart", table: "cart_lines" },
  { page: "StorefrontHeader", comp: "ورود / ثبت‌نام", action: "شروع OTP", method: "POST", path: "/auth/otp/send", table: "otp_codes" },
  { page: "HomePage", comp: "کارت‌های اسپات + Sparkline", action: "نرخ + تغییر ۲۴h", method: "GET", path: "/prices/spot", table: "spot_prices" },
  { page: "HomePage", comp: "جدول Bid/Ask شمش", action: "قیمت خرید/فروش", method: "GET", path: "/catalog/products?type=bar", table: "products" },
  { page: "HomePage", comp: "کپی کد معرف", action: "نمایش teaser", method: "GET", path: "/profile/referrals", table: "referrals" },
  { page: "CatalogPage", comp: "FiltersDrawer + Chips", action: "فیلتر نوع/عیار/مناسبت", method: "GET", path: "/catalog/products", table: "products" },
  { page: "CatalogPage", comp: "Pagination", action: "صفحه‌بندی ۱۵تایی", method: "GET", path: "/catalog/products?page=", table: "products" },
  { page: "ProductDetailPage", comp: "گالری ۳۶۰", action: "درگ چرخش", method: "GET", path: "/catalog/products/{id}/media/360", table: "product_360_frames" },
  { page: "ProductDetailPage", comp: "افزودن به سبد", action: "افزودن", method: "POST", path: "/cart/lines", table: "cart_lines" },
  { page: "ProductDetailPage", comp: "دکمه رزرو", action: "پرداخت بیعانه", method: "POST", path: "/orders/{id}/reserve", table: "orders" },
  { page: "ProductDetailPage", comp: "علاقه‌مندی", action: "Toggle", method: "POST", path: "/catalog/products/{id}/wishlist", table: "wishlists" },
  { page: "ProductDetailPage", comp: "ناموجود → خبرم کن", action: "اشتراک", method: "POST", path: "/catalog/products/{id}/restock-notify", table: "restock_notifies" },
  { page: "LivePricesPage", comp: "AreaChart + تب‌های بازه", action: "تاریخچه", method: "GET", path: "/prices/history", table: "price_snapshots" },
  { page: "LivePricesPage", comp: "دکمه CSV", action: "دانلود", method: "GET", path: "/prices/export.csv", table: "price_snapshots" },
  { page: "SizeGuidePage", comp: "ذخیره سایز من", action: "ذخیره", method: "PUT", path: "/profile/size", table: "user_sizes" },
  { page: "ContactPage", comp: "فرم تماس → ارسال", action: "ساخت تیکت", method: "POST", path: "/contact", table: "tickets" },
  { page: "LoginPage / OtpPage", comp: "OtpInput", action: "ورود/ثبت‌نام", method: "POST", path: "/auth/otp/verify", table: "users, sessions" },
  { page: "PasswordLoginPage", comp: "فراموشی رمز", action: "بازیابی", method: "POST", path: "/auth/password/reset", table: "users" },
  { page: "DashboardPage", comp: "KPI + نمودارها", action: "موجودی/پرتفوی/اسپات", method: "GET", path: "/wallets, /portfolio/summary, /prices/history", table: "wallets, portfolio_lots" },
  { page: "TradePage", comp: "دریافت قیمت", action: "Quote + TTL", method: "POST", path: "/trades/quotes", table: "trade_quotes" },
  { page: "TradePage", comp: "شمارش معکوس 0:18", action: "انقضا → 409", method: "POST", path: "/trades/quotes/{id}/confirm", table: "trades" },
  { page: "TradePage", comp: "OtpStepUpModal (فروش)", action: "گام دوم", method: "POST", path: "/auth/otp/step-up", table: "otp_codes" },
  { page: "BuybackPage", comp: "درخواست بازخرید", action: "ثبت + عکس", method: "POST", path: "/trades/buyback", table: "buyback_requests" },
  { page: "WalletPage", comp: "مودال واریز", action: "درگاه", method: "POST", path: "/wallets/deposits", table: "deposits" },
  { page: "WalletPage", comp: "مودال برداشت", action: "شبا + OTP", method: "POST", path: "/wallets/withdrawals", table: "withdrawals" },
  { page: "WalletPage", comp: "فیلتر Ledger", action: "گردش", method: "GET", path: "/wallets/ledger", table: "wallet_ledgers" },
  { page: "PortfolioPage", comp: "جدول لات‌ها", action: "بهای تمام‌شده", method: "GET", path: "/portfolio/lots", table: "portfolio_lots" },
  { page: "AutoInvestPage", comp: "ساخت برنامه", action: "ثبت", method: "POST", path: "/auto-invest/plans", table: "auto_invest_plans" },
  { page: "InstallmentsPage", comp: "پرداخت قسط", action: "کسر از کیف پول", method: "POST", path: "/installments/contracts/{id}/payments", table: "installment_payments" },
  { page: "PriceAlertsPage", comp: "ساخت/حذف/Switch", action: "CRUD هشدار", method: "POST", path: "/prices/alerts", table: "price_alerts" },
  { page: "CartPage", comp: "تغییر تعداد", action: "به‌روزرسانی خط", method: "PATCH", path: "/cart/lines/{id}", table: "cart_lines" },
  { page: "CouponApplyModal", comp: "اعمال کد", action: "تخفیف", method: "POST", path: "/cart/coupon", table: "coupons" },
  { page: "CheckoutPage", comp: "Stepper سبد→ارسال→پرداخت", action: "اعتبارسنجی", method: "POST", path: "/checkout/validate", table: "carts" },
  { page: "AddressModal", comp: "ذخیره نشانی", action: "CRUD", method: "POST", path: "/profile/addresses", table: "addresses" },
  { page: "CheckoutPage", comp: "پرداخت و ثبت", action: "سفارش", method: "POST", path: "/orders", table: "orders, invoices" },
  { page: "OrdersPage", comp: "فیلتر وضعیت", action: "فهرست", method: "GET", path: "/orders", table: "orders" },
  { page: "OrderDetailPage", comp: "لغو سفارش", action: "فقط پرداخت‌نشده", method: "POST", path: "/orders/{id}/cancel", table: "orders" },
  { page: "OrderDetailPage", comp: "Timeline + رهگیری", action: "مرسوله", method: "GET", path: "/orders/{id}/shipments", table: "shipments" },
  { page: "InvoicesPage", comp: "دانلود PDF", action: "فاکتور", method: "GET", path: "/invoices/{id}.pdf", table: "invoices" },
  { page: "DeliveryPage", comp: "فرم vault→physical", action: "درخواست شمش", method: "POST", path: "/delivery/requests", table: "delivery_requests" },
  { page: "GiftsPage", comp: "خرید هدیه", action: "کسر + کد", method: "POST", path: "/gifts", table: "gift_cards" },
  { page: "ReferralsPage", comp: "کپی/اشتراک کد", action: "آمار", method: "GET", path: "/profile/referrals", table: "referrals" },
  { page: "TicketsPage", comp: "ثبت تیکت", action: "ساخت + اولین پیام", method: "POST", path: "/tickets", table: "tickets" },
  { page: "TicketDetailPage", comp: "پاسخ", action: "پیوست گفتگو", method: "POST", path: "/tickets/{id}/messages", table: "ticket_messages" },
  { page: "NotificationsPage", comp: "خواندن همه", action: "علامت‌گذاری", method: "POST", path: "/notifications/read-all", table: "notifications" },
  { page: "AppTopbar", comp: "bell badge ۴", action: "شمارنده", method: "GET", path: "/notifications/unread-count", table: "notifications" },
  { page: "KycPage", comp: "FileDropzone ۳ مرحله", action: "آپلود مدارک", method: "POST", path: "/kyc/documents", table: "kyc_documents" },
  { page: "KycPage", comp: "ارسال مدارک", action: "ورود به صف", method: "POST", path: "/kyc/submit", table: "kyc_submissions" },
  { page: "ProfilePage", comp: "Switchهای ترجیحات", action: "ذخیره", method: "PUT", path: "/profile/notification-preferences", table: "notification_preferences" },
  { page: "DealerDashboardPage", comp: "سفارش عمده", action: "ثبت", method: "POST", path: "/dealer/orders", table: "wholesale_orders" },
  { page: "StaffOrdersPage", comp: "dropdown وضعیت", action: "گذار وضعیت", method: "PATCH", path: "/staff/orders/{id}/status", table: "orders" },
  { page: "StaffOrdersPage", comp: "مودال ثبت رهگیری", action: "ارسال", method: "POST", path: "/staff/orders/{id}/shipments", table: "shipments" },
  { page: "StaffKycPage", comp: "تأیید / RejectKycModal", action: "بررسی مدارک", method: "POST", path: "/staff/kyc/{user_id}/approve|reject", table: "kyc_submissions" },
  { page: "StaffInventoryPage", comp: "ویرایش درون‌خطی", action: "تصحیح موجودی", method: "PATCH", path: "/staff/inventory/{sku}", table: "inventories" },
  { page: "AdminDashboardPage", comp: "۸ نمودار الزامی", action: "داده یکپارچه", method: "GET", path: "/admin/dashboard", table: "orders, trades, vault_lots…" },
  { page: "AdminDashboardPage", comp: "HaltTradingModal", action: "تایپ HALT", method: "POST", path: "/admin/pricing/halt", table: "price_settings" },
  { page: "AdminProductsPage", comp: "فرم ساخت/ویرایش", action: "CRUD محصول", method: "POST", path: "/admin/products", table: "products" },
  { page: "AdminProductsPage", comp: "DeleteProductModal", action: "حذف نرم", method: "DELETE", path: "/admin/products/{id}", table: "products" },
  { page: "AdminCategoriesPage", comp: "درخت + Drag", action: "مرتب‌سازی", method: "PATCH", path: "/admin/categories/reorder", table: "categories" },
  { page: "AdminInventoryPage", comp: "افزودن لات", action: "ورود خزانه", method: "POST", path: "/admin/inventory/lots", table: "vault_lots" },
  { page: "AdminPricingPage", comp: "ثبت نرخ دستی", action: "snapshot manual", method: "POST", path: "/admin/pricing/spot", table: "spot_prices" },
  { page: "AdminPricingPage", comp: "ذخیره اسپرد", action: "bid/ask bps", method: "PUT", path: "/admin/pricing/spread", table: "price_settings" },
  { page: "AdminOrdersPage", comp: "دکمه CSV", action: "خروجی", method: "GET", path: "/admin/orders/export.csv", table: "orders" },
  { page: "AdminPaymentsPage", comp: "RefundModal", action: "بازپرداخت", method: "POST", path: "/admin/payments/{id}/refund", table: "payment_refunds" },
  { page: "AdminCustomersPage", comp: "تغییر نقش", action: "role patch", method: "PATCH", path: "/admin/customers/{id}/role", table: "users" },
  { page: "AdminWalletsPage", comp: "مودال اصلاح (دلیل الزامی)", action: "adjust", method: "POST", path: "/admin/wallets/{user_id}/adjust", table: "wallet_ledgers" },
  { page: "AdminPromotionsPage", comp: "فرم کوپن", action: "ساخت", method: "POST", path: "/admin/promotions/coupons", table: "coupons" },
  { page: "AdminStaffPage", comp: "فرم دعوت", action: "دعوت کارمند", method: "POST", path: "/admin/staff/invites", table: "staff_invites" },
  { page: "AdminSettingsPage", comp: "فرم تنظیمات", action: "ذخیره + audit", method: "PUT", path: "/admin/settings", table: "settings" },
  { page: "AdminBroadcastPage", comp: "ارسال همگانی", action: "broadcast", method: "POST", path: "/admin/broadcasts", table: "broadcast_messages" },
  { page: "ReportsPage", comp: "خروجی‌های CSV", action: "گزارش", method: "GET", path: "/admin/reports/export.csv", table: "orders, trades" },
];

export const AUDIT = {
  stats: [
    { label: "Endpoint مستندشده", value: 96, note: "در ۱۷ ماژول" },
    { label: "جدول پایگاه داده", value: 48, note: "۹ گروه + pivotها" },
    { label: "ردیف نگاشت UI↔API", value: MAPPING.length, note: "تعامل‌های کلیدی" },
    { label: "عملیات صرفاً کلاینتی", value: 9, note: "بدون نیاز به بک‌اند" },
  ],
  clientOnly: [
    { item: "کپی لینک/کد (Share، کد هدیه، کد معرف)", why: "Clipboard API مرورگر — copyText در lib" },
    { item: "چاپ فاکتور و راهنمای سایز", why: "window.print() روی لایه‌بندی موجود" },
    { item: "CSV در TradePage/AdminOrders (نسخه فعلی UI)", why: "ساخت Blob سمت کلاینت؛ نسخه سروری مستند شده و جایگزین می‌شود" },
    { item: "چرخش ۳۶۰ و zoom گالری", why: "ترنسفورم CSS روی فریم‌های دریافتی" },
    { item: "تبدیل mm → سایز US/IR", why: "جدول ثابت در lib — بدون ذخیره تا «ذخیره سایز»" },
    { item: "فیلتر/مرتب‌سازی ستون‌ها (UI جدول‌ها)", why: "پارامترهای معادل سروری مستند شده‌اند" },
    { item: "اسکلتون و حالت‌های Empty/Error", why: "الگوی نمایشی؛ داده از همان endpointها" },
    { item: "شمارش معکوس TTL در UI", why: "از expires_at پاسخ محاسبه می‌شود — منبع حقیقت سرور" },
    { item: "تب EN|فا (LTR clone)", why: "ترجمه محلی؛ بدون endpoint" },
  ],
  gaps: [
    { item: "ReserveProductModal — جریان کامل بیعانه", status: "endpoint مستند شد (POST /orders/{id}/reserve)؛ ماشین وضعیت reserved→paid/expire و Job آزادسازی لازم است" },
    { item: "PSP redirect loop واقعی", status: "وب‌هوک HMAC مستند شد؛ صفحه بازگشت /payments/return باید اضافه شود" },
    { item: "تولید PDF فاکتور و لیبل", status: "Job صف + dompdf مستند؛ فایل فعلی placeholder «#» است" },
    { item: "Claim هدیه توسط گیرنده", status: "POST /gifts/{code}/claim مستند؛ صفحه فرود کد هدیه در v1 نیست" },
    { item: "اسلپیج واقعی در confirm", status: "فیلد slippage_bps مستند؛ منطق requote هنگام عبور از آستانه پیاده‌سازی شود" },
    { item: "CSV سمت سرور در مقیاس", status: "endpointهای export مستند؛ UI فعلی Blob می‌سازد — سوییچ پس از اتصال" },
    { item: "تسویه برداشت بانکی", status: "فایل تسویه + وضعیت settled مستند؛ اتصال PSP تسویه بعدی" },
    { item: "SSE/WebSocket برای Ticker زنده", status: "در v1 با polling ۳۰ ثانیه‌ای /prices/spot — کانال Realtime بعدی" },
  ],
  excluded: [
    "اپ‌های Native", "تم تاریک", "پرداخت رمزارز", "Impersonate کاربر",
    "اتصال PSP واقعی فراتر از sandbox/redirect", "چندزبانه کامل (فقط stub EN|فا)",
  ],
  checklist: [
    "همه فرم‌ها endpoint ثبت با Validation دارند",
    "همه جدول‌ها Pagination/Filter/Search سروری دارند",
    "همه مودال‌های حذف/تأیید به DELETE/POST با 409/422 متصل‌اند",
    "حالت‌های stale و halt از فیلدهای spot برمی‌آیند",
    "هر mutation حساس در audit_logs ثبت می‌شود",
    "Ledger فقط append-only است و balance با trigger/transaction محافظت می‌شود",
    "همه فایل‌ها MIME/حجم/مالکیت اعتبارسنجی می‌شوند",
    "نقش‌ها با middleware جدا شده‌اند و 403 → Error403Page",
    "خطاهای شبکه → toast «اتصال اینترنت» + Retry",
    "Envelope و نام فیلدها 1:1 با تایپ‌های TypeScript frontend است",
  ],
};
