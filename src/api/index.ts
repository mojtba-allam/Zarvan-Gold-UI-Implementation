/**
 * Zarvan Gold — typed API layer.
 * Talks to VITE_API_URL when present; otherwise a typed in-memory mock
 * (same envelopes/shapes as the Laravel REST API) so every screen is fully wired.
 */
import type {
  Address, AdminDashboardData, AppNotification, AutoInvestPlan, BuybackRequest, Cart, Category,
  Coupon, GiftCard, InstallmentContract, Invoice, LedgerEntry, Order, OrderStatus, Payment,
  PriceAlert, PriceHistoryPoint, PriceRange, Product, ReferralStats, SeriesPoint, Shipment,
  SpotPrice, Ticket, TicketMessage, Trade, TradeQuote, User, Wallet,
} from "../types";
import { seeded } from "../lib";

export class ApiError extends Error {
  code?: number;
  errors?: Record<string, string[]>;
  constructor(message: string, code?: number, errors?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.errors = errors;
  }
}

const BASE_URL = (import.meta.env?.VITE_API_URL as string | undefined) ?? "";
const delay = (ms = 380) => new Promise<void>((r) => setTimeout(r, ms + Math.random() * 220));

/* ================================ images ================================ */
export const IMG = {
  hero: "https://image.qwenlm.ai/generated-images/133288d9-81c6-4cf3-af57-da0ba935621f/_result.png",
  ring: "https://image.qwenlm.ai/generated-images/2566ffe4-8802-438a-9294-d1e34df482a7/_result.png",
  necklace: "https://image.qwenlm.ai/generated-images/f07f55b6-87fa-487a-9465-6b5ed45e3f86/_result.png",
  bangle: "https://image.qwenlm.ai/generated-images/5f81c346-ce61-4bec-99cf-e472ed0a50e9/_result.png",
  bullion: "https://image.qwenlm.ai/generated-images/f2e180ca-2789-427f-ab67-5aa79661ebf8/_result.png",
  coin: "https://image.qwenlm.ai/generated-images/a00b98ea-21ae-4c51-a001-4c5b4c2642f5/_result.png",
  vault: "https://image.qwenlm.ai/generated-images/664f967b-6ce4-4bcc-a782-37ac8e3f849b/_result.png",
};

/* ================================ seed db ================================ */
const SPOT18 = 3_520_000;
const SPOT24 = 4_690_000;

const users: (User & { password?: string })[] = [
  { id: 1, name: "سارا کریمی", mobile: "09121234567", email: "sara@example.com", role: "customer", kyc_status: "approved", referral_code: "ZARV-9K2P", created_at: "2025-12-02T10:12:00Z" },
  { id: 2, name: "رضا محمدی", mobile: "09127654321", email: "reza@example.com", role: "dealer", kyc_status: "approved", referral_code: "ZARV-4T7Q", created_at: "2026-01-19T09:00:00Z" },
  { id: 3, name: "نازنین احمدی", mobile: "09123456789", email: null, role: "customer", kyc_status: "pending", created_at: "2026-03-02T14:30:00Z" },
  { id: 4, name: "الهام رضایی", mobile: "09120001122", email: "elham@zarvan.gold", role: "staff", kyc_status: "approved", created_at: "2025-11-10T08:00:00Z" },
  { id: 5, name: "مجتبی علام", mobile: "09120009988", email: "mojtaba@zarvan.gold", role: "admin", kyc_status: "approved", created_at: "2025-10-01T08:00:00Z" },
  { id: 6, name: "امیر توکلی", mobile: "09125550000", email: null, role: "customer", kyc_status: "unverified", created_at: "2026-06-21T16:45:00Z" },
];

export const categories: Category[] = [
  { id: 1, parent_id: null, name: "جواهرات", slug: "jewelry", type: "jewelry", sort_order: 1, is_active: true,
    children: [
      { id: 11, parent_id: 1, name: "انگشتر", slug: "rings", type: "jewelry", sort_order: 1, is_active: true },
      { id: 12, parent_id: 1, name: "دستبند", slug: "bracelets", type: "jewelry", sort_order: 2, is_active: true },
      { id: 13, parent_id: 1, name: "گردنبند", slug: "necklaces", type: "jewelry", sort_order: 3, is_active: true },
    ] },
  { id: 2, parent_id: null, name: "شمش و سکه", slug: "bullion", type: "bullion", sort_order: 2, is_active: true,
    children: [
      { id: 21, parent_id: 2, name: "شمش", slug: "bars", type: "bullion", sort_order: 1, is_active: true },
      { id: 22, parent_id: 2, name: "سکه", slug: "coins", type: "bullion", sort_order: 2, is_active: true },
    ] },
  { id: 3, parent_id: null, name: "طلای آب‌شده", slug: "melted", type: "melted", sort_order: 3, is_active: true },
];

function quote18(mg: number, making: number): number {
  return Math.round((mg / 1000) * SPOT18 + making);
}

const products: Product[] = [
  { id: 1, sku: "BR-18-221", slug: "rope-bracelet-18k", name: "دستبند طنابی ۱۸ عیار", type: "jewelry", category_id: 12, karat: 18, weight_mg: 4200, making_charge_type: "flat", making_charge_irr: 8_500_000, occasion: "هدیه", status: "active", has_360: true, stock_on_hand: 6, published_at: "2026-06-21T00:00:00Z",
    description: "دستبند طنابی کلاسیک با بافتی نرم و درخشش یکدست؛ مناسب استفاده روزانه و هدیه. ساخت کارگاه زرون با عیار استاندارد ۷۵۰.",
    attributes: { "عیار": "۱۸ (۷۵۰)", "رنگ": "زرد", "قفل": "خرچنگی", "گارانتی عیار": true },
    images: [IMG.hero], quote_irr: quote18(4200, 8_500_000) },
  { id: 2, sku: "RING-18-105", slug: "solitaire-ring-18k", name: "انگشتر سولیتر ۱۸ عیار", type: "jewelry", category_id: 11, karat: 18, weight_mg: 3100, making_charge_type: "flat", making_charge_irr: 6_200_000, occasion: "نامزدی", status: "active", has_360: true, stock_on_hand: 9, published_at: "2026-05-16T00:00:00Z",
    description: "انگشتر سولیتر با رکاب ظریف و نگین اتمی درخشان؛ انتخابی ماندگار برای نامزدی.",
    attributes: { "عیار": "۱۸ (۷۵۰)", "سایزهای موجود": "۵۰ تا ۶۲", "نگین": "اتمی سوئیسی" },
    images: [IMG.ring], quote_irr: quote18(3100, 6_200_000) },
  { id: 3, sku: "NK-18-412", slug: "van-cleef-necklace-18k", name: "گردنبند ونکلیف ۱۸ عیار", type: "jewelry", category_id: 13, karat: 18, weight_mg: 6800, making_charge_type: "flat", making_charge_irr: 11_400_000, occasion: "هدیه", status: "active", stock_on_hand: 3, published_at: "2026-06-01T00:00:00Z",
    description: "زنجیر ظریف با پلاک شبدر ونکلیف؛ سبک، درخشان و همیشه محبوب.",
    attributes: { "عیار": "۱۸ (۷۵۰)", "طول زنجیر": "۴۵ سانتی‌متر" },
    images: [IMG.necklace], quote_irr: quote18(6800, 11_400_000) },
  { id: 4, sku: "BG-18-230", slug: "carved-bangle-18k", name: "النگوی تراش ۱۸ عیار", type: "jewelry", category_id: 12, karat: 18, weight_mg: 12500, making_charge_type: "per_gram", making_charge_irr: 900_000, occasion: "جهیزیه", status: "active", stock_on_hand: 4, published_at: "2026-03-02T00:00:00Z",
    description: "النگوی تراش‌خورده با انعکاس نور چشمگیر؛ از مجموعه جهیزیه زرون.",
    attributes: { "عیار": "۱۸ (۷۵۰)", "قطر": "۶۰ میلی‌متر" },
    images: [IMG.bangle], quote_irr: quote18(12500, 12500 / 1000 * 900_000) },
  { id: 5, sku: "COIN-24-BAHAR", slug: "bahar-coin-24k", name: "سکه بهار آزادی", type: "coin", category_id: 22, karat: 24, weight_mg: 8130, making_charge_type: "flat", making_charge_irr: 0, status: "active", stock_on_hand: 24, published_at: "2026-01-19T00:00:00Z",
    description: "سکه تمام بهار آزادی طرح امامی؛ نقدشونده‌ترین دارایی طلای بازار ایران.",
    attributes: { "عیار": "۲۴ (۹۹۵)", "وزن رسمی": "۸٫۱۳ گرم" },
    images: [IMG.coin], bid_irr: 38_140_000, ask_irr: 38_620_000, quote_irr: 38_620_000 },
  { id: 6, sku: "COIN-24-NIM", slug: "nim-coin-24k", name: "نیم سکه بهار آزادی", type: "coin", category_id: 22, karat: 24, weight_mg: 4060, making_charge_type: "flat", making_charge_irr: 0, status: "active", stock_on_hand: 31, published_at: "2026-01-19T00:00:00Z",
    description: "نیم سکه بهار آزادی؛ گزینه محبوب هدیه و پس‌انداز خرد.",
    attributes: { "عیار": "۲۴ (۹۹۵)", "وزن رسمی": "۴٫۰۶ گرم" },
    images: [IMG.coin], bid_irr: 21_480_000, ask_irr: 21_860_000, quote_irr: 21_860_000 },
  { id: 7, sku: "BAR-24-50", slug: "bar-24k-50g", name: "شمش ۵۰ گرمی ۲۴ عیار", type: "bar", category_id: 21, karat: 24, weight_mg: 50000, making_charge_type: "flat", making_charge_irr: 1_200_000, status: "active", stock_on_hand: 12, published_at: "2026-03-02T00:00:00Z",
    description: "شمش ریخته‌گری با خلوص ۹۹۹ و سریال یکتا؛ قابل استعلام اصالت.",
    attributes: { "عیار": "۲۴ (۹۹۹)", "سریال": "دارد", "بسته‌بندی": "پلمپ ضدتقلب" },
    images: [IMG.bullion], bid_irr: 234_900_000, ask_irr: 236_400_000, quote_irr: 236_400_000 },
  { id: 8, sku: "BAR-24-100", slug: "bar-24k-100g", name: "شمش ۱۰۰ گرمی ۲۴ عیار", type: "bar", category_id: 21, karat: 24, weight_mg: 100000, making_charge_type: "flat", making_charge_irr: 1_900_000, status: "active", stock_on_hand: 5, published_at: "2026-03-02T00:00:00Z",
    description: "شمش ۱۰۰ گرمی با کمترین کارمزد نسبت به وزن؛ مناسب سرمایه‌گذاری کلان.",
    attributes: { "عیار": "۲۴ (۹۹۹)", "سریال": "دارد" },
    images: [IMG.bullion], bid_irr: 469_200_000, ask_irr: 471_500_000, quote_irr: 471_500_000 },
  { id: 9, sku: "MELT-18-001", slug: "melted-18k-wallet", name: "طلای آب‌شده ۱۸ عیار (کیف پول)", type: "melted", category_id: 3, karat: 18, weight_mg: 1000, making_charge_type: "flat", making_charge_irr: 0, status: "active", stock_on_hand: 99999, published_at: "2025-12-02T00:00:00Z",
    description: "خرید و فروش میلی‌گرمی طلای ۱۸ عیار، ۲۴ ساعته و بدون اجرت ساخت؛ نگهداری در خزانه بیمه‌شده زرون.",
    attributes: { "عیار": "۱۸ (۷۵۰)", "حداقل معامله": "۱۰۰ میلی‌گرم" },
    images: [IMG.bullion], quote_irr: SPOT18 },
  { id: 10, sku: "RING-18-118", slug: "wedding-band-18k", name: "حلقه ازدواج ۱۸ عیار", type: "jewelry", category_id: 11, karat: 18, weight_mg: 4800, making_charge_type: "flat", making_charge_irr: 7_800_000, occasion: "ازدواج", status: "active", stock_on_hand: 0, published_at: "2026-06-21T00:00:00Z",
    description: "حلقه کلاسیک نیم‌گرد با سطح آینه‌ای؛ قابل سفارش با حکاکی نام.",
    attributes: { "عیار": "۱۸ (۷۵۰)", "حکاکی": "رایگان" },
    images: [IMG.ring], quote_irr: quote18(4800, 7_800_000) },
];
products[9].status = "out_of_stock";

const addressesDb: Address[] = [
  { id: 1, title: "منزل", province: "تهران", city: "تهران", line1: "زعفرانیه، خیابان مقدسی، پلاک ۱۲، واحد ۳", postal_code: "1938614557", is_default: true },
  { id: 2, title: "محل کار", province: "تهران", city: "تهران", line1: "جردن، بلوار نلسون ماندلا، برج سایه، طبقه ۷", postal_code: "1967834221", is_default: false },
];

const walletsDb: Record<string, Wallet[]> = {
  1: [
    { id: 1, currency: "irr", balance: 25_000_000, updated_at: "2026-08-13T09:40:00Z" },
    { id: 2, currency: "gold_mg", balance: 12_450, updated_at: "2026-08-13T09:41:00Z" },
  ],
  2: [
    { id: 3, currency: "irr", balance: 480_000_000, updated_at: "2026-08-12T18:00:00Z" },
    { id: 4, currency: "gold_mg", balance: 260_000, updated_at: "2026-08-12T18:01:00Z" },
  ],
};

const ledgerDb: Record<string, LedgerEntry[]> = {
  1: [
    { id: 1, direction: "credit", amount: 1200, reason: "پاداش معرفی دوست", balance_after: 12450, reference_type: "referral", reference_id: 1, created_at: "2026-08-13T09:41:00Z" },
    { id: 2, direction: "debit", amount: 3_520_000, reason: "خرید طلای آب‌شده — ۱ گرم", balance_after: 25_000_000, reference_type: "trade", reference_id: 1042, created_at: "2026-08-12T17:22:00Z" },
    { id: 3, direction: "credit", amount: 50_000_000, reason: "واریز از درگاه بانکی", balance_after: 28_520_000, reference_type: "deposit", reference_id: 551, created_at: "2026-08-10T11:05:00Z" },
    { id: 4, direction: "credit", amount: 3_520_000, reason: "فروش طلای آب‌شده — ۱ گرم", balance_after: 28_520_000, reference_type: "trade", reference_id: 1039, created_at: "2026-08-06T20:14:00Z" },
    { id: 5, direction: "debit", amount: 5_000, reason: "انتقال هدیه به ۰۹۱۲•••۰۰۰۰", balance_after: 11_250, reference_type: "gift", reference_id: 77, created_at: "2026-07-28T13:00:00Z" },
    { id: 6, direction: "credit", amount: 8_200, reason: "خرید پله‌ای — برنامه ماهانه", balance_after: 16_250, reference_type: "auto_invest", reference_id: 2, created_at: "2026-07-05T09:00:00Z" },
  ],
};

function makeShipment(): Shipment {
  return {
    carrier: "پست جمهوری اسلامی",
    tracking_code: "IRPOST-883421",
    status: "shipped",
    shipped_at: "2026-08-12T09:00:00Z",
    timeline: [
      { at: "2026-08-10T10:30:00Z", label: "ثبت سفارش" },
      { at: "2026-08-10T11:02:00Z", label: "پرداخت موفق" },
      { at: "2026-08-11T15:40:00Z", label: "بسته‌بندی لوکس و پلمب" },
      { at: "2026-08-12T09:00:00Z", label: "تحویل به پست — کد رهگیری IRPOST-883421" },
    ],
  };
}

const ordersDb: Record<string, Order[]> = {
  1: [
    { id: 1, number: "ZRVORD-2026-0901", status: "shipped", fulfillment: "delivery", subtotal_irr: 23_284_000, making_irr: 8_500_000, discount_irr: 0, tax_irr: 0, total_irr: 23_284_000, gold_mg: 4200, paid_at: "2026-08-10T11:02:00Z", created_at: "2026-08-10T10:30:00Z",
      items: [{ id: 1, product_id: 1, product: products[0], qty: 1, packaging: "luxury", unit_quote_irr: 23_284_000 }], shipment: makeShipment() },
    { id: 2, number: "ZRVORD-2026-0817", status: "vaulted", fulfillment: "vault", subtotal_irr: 35_200_000, making_irr: 0, discount_irr: 0, tax_irr: 0, total_irr: 35_200_000, gold_mg: 10000, paid_at: "2026-07-20T12:15:00Z", created_at: "2026-07-20T12:12:00Z" },
    { id: 3, number: "ZRVORD-2026-0744", status: "delivered", fulfillment: "delivery", subtotal_irr: 17_104_000, making_irr: 6_200_000, discount_irr: 800_000, tax_irr: 0, total_irr: 16_304_000, gold_mg: 3100, paid_at: "2026-06-21T18:40:00Z", created_at: "2026-06-21T18:31:00Z",
      items: [{ id: 2, product_id: 2, product: products[1], qty: 1, unit_quote_irr: 17_104_000 }],
      shipment: { carrier: "تیپاکس", tracking_code: "TPX-552187", status: "delivered", shipped_at: "2026-06-22T10:00:00Z", delivered_at: "2026-06-24T13:20:00Z", timeline: [
        { at: "2026-06-21T18:40:00Z", label: "پرداخت موفق" }, { at: "2026-06-22T10:00:00Z", label: "ارسال با تیپاکس" }, { at: "2026-06-24T13:20:00Z", label: "تحویل به گیرنده" } ] } },
    { id: 4, number: "ZRVORD-2026-0931", status: "awaiting_payment", fulfillment: "vault", subtotal_irr: 7_040_000, making_irr: 0, discount_irr: 0, tax_irr: 0, total_irr: 7_040_000, gold_mg: 2000, created_at: "2026-08-13T08:55:00Z" },
  ],
};

const invoicesDb: Record<string, Invoice[]> = {
  1: [
    { id: 1, number: "ZRV-2026-00012", issued_at: "2026-08-10T11:02:00Z", total_irr: 23_284_000, gold_mg: 4200, pdf_url: "#" },
    { id: 2, number: "ZRV-2026-00011", issued_at: "2026-07-20T12:15:00Z", total_irr: 35_200_000, gold_mg: 10000, pdf_url: "#" },
    { id: 3, number: "ZRV-2026-00009", issued_at: "2026-06-21T18:40:00Z", total_irr: 16_304_000, gold_mg: 3100, pdf_url: "#" },
  ],
};

const cartDb: Cart = { id: 1, status: "active", lines: [
  { id: 1, product_id: 1, product: products[0], qty: 1, packaging: "luxury", unit_quote_irr: 23_284_000 },
], coupon_code: null, subtotal_irr: 23_284_000, discount_irr: 0, total_irr: 23_284_000, quote_expires_at: null };

const ticketsDb: Ticket[] = [
  { id: 1042, subject: "پیگیری مرسوله ZRVORD-2026-0901", type: "delivery", status: "pending", priority: "high", updated_at: "2026-08-12T10:15:00Z", user: { id: 1, name: "سارا کریمی", mobile: "09121234567" } },
  { id: 1041, subject: "مغایرت قیمت سکه با بازار", type: "price_match", status: "open", priority: "normal", updated_at: "2026-08-11T16:42:00Z", user: { id: 2, name: "رضا محمدی", mobile: "09127654321" } },
  { id: 1038, subject: "مدارک هویتی رد شد؟", type: "kyc", status: "open", priority: "normal", updated_at: "2026-08-09T09:30:00Z", user: { id: 6, name: "امیر توکلی", mobile: "09125550000" } },
];
const ticketMessagesDb: Record<string, TicketMessage[]> = {
  1042: [
    { id: 1, body: "سلام، سفارش دستبند را ۱۰ مرداد ثبت کردم. مرسوله الان کجاست؟", is_staff: false, created_at: "2026-08-12T09:50:00Z" },
    { id: 2, body: "سلام سارا عزیز 🌸 مرسوله شما با کد IRPOST-883421 امروز تحویل پست شد و تا ۴۸ ساعت آینده به دستتان می‌رسد.", is_staff: true, created_at: "2026-08-12T10:15:00Z" },
  ],
};

const notificationsDb: Record<string, AppNotification[]> = {
  1: [
    { id: 1, type: "trade", title: "معامله انجام شد", body: "خرید ۱ گرم طلای ۱۸ عیار با موفقیت ثبت شد.", read_at: null, created_at: "2026-08-12T17:22:00Z" },
    { id: 2, type: "price", title: "هشدار قیمت", body: "قیمت طلای ۱۸ عیار از ۳٬۵۰۰٬۰۰۰ ریال عبور کرد.", read_at: null, created_at: "2026-08-12T08:10:00Z" },
    { id: 3, type: "order", title: "ارسال سفارش", body: "سفارش ZRVORD-2026-0901 تحویل پست شد.", read_at: null, created_at: "2026-08-12T09:00:00Z" },
    { id: 4, type: "promo", title: "جشنواره نوروزی", body: "کد GOLD-NOWRUZ تا ۲۹ اسفند فعال است.", read_at: null, created_at: "2026-08-08T12:00:00Z" },
    { id: 5, type: "system", title: "خوش آمدید", body: "حساب شما در زرون گلد فعال شد.", read_at: "2025-12-02T10:30:00Z", created_at: "2025-12-02T10:15:00Z" },
  ],
};

const alertsDb: PriceAlert[] = [
  { id: 1, karat: 18, direction: "above", threshold_irr: 3_600_000, is_active: true },
  { id: 2, karat: 18, direction: "below", threshold_irr: 3_400_000, is_active: false },
];
const plansDb: AutoInvestPlan[] = [
  { id: 1, amount_irr: 10_000_000, day_of_month: 5, is_active: true },
  { id: 2, amount_irr: 5_000_000, day_of_month: 20, is_active: false },
];
const contractsDb: InstallmentContract[] = [
  { id: 1, months: 12, down_irr: 12_000_000, principal_irr: 60_000_000, paid_irr: 24_000_000, remaining_irr: 36_000_000, status: "active" },
];
const couponsDb: Coupon[] = [
  { id: 1, code: "GOLD-NOWRUZ", type: "percent", value: 5, max_uses: 500, uses_count: 213, min_order_irr: 5_000_000, expires_at: "2026-03-20T23:59:00Z", is_active: true },
  { id: 2, code: "WELCOME-50", type: "fixed_irr", value: 500_000, uses_count: 89, is_active: true },
];
const giftsDb: GiftCard[] = [
  { id: 77, code: "ZGIFT-88KQ2", recipient_mobile: "09125550000", gold_mg: 5000, status: "sent", packaging: "luxury", message: "تولدت مبارک!" },
];
const referralsDb: Record<string, ReferralStats> = {
  1: { code: "ZARV-9K2P", invited_count: 4, gold_earned_mg: 4800, referees: [
    { mobile_masked: "0912•••5000", joined_at: "2026-07-28T13:00:00Z" },
    { mobile_masked: "0935•••1122", joined_at: "2026-06-21T16:45:00Z" },
    { mobile_masked: "0919•••7788", joined_at: "2026-05-02T10:20:00Z" },
  ] },
};

const tradesDb: Trade[] = [
  { id: 1042, side: "buy", status: "filled", weight_mg: 1000, irr_amount: 3_520_000, spot_irr: SPOT18, slippage_bps: 0, filled_at: "2026-08-12T17:22:00Z" },
  { id: 1039, side: "sell", status: "filled", weight_mg: 1000, irr_amount: 3_498_000, spot_irr: SPOT18, slippage_bps: 6, filled_at: "2026-08-06T20:14:00Z" },
];

let quoteSeq = 5000;
let tradeSeq = 2000;
let invoiceSeq = 13;
let ticketSeq = 1043;
let notifSeq = 100;

/* ---------------- price series generators ---------------- */
export function priceHistory(range: PriceRange, karat: 18 | 24 = 18): PriceHistoryPoint[] {
  const base = karat === 18 ? SPOT18 : SPOT24;
  const days = range === "1D" ? 1 : range === "1W" ? 7 : range === "1M" ? 30 : range === "90D" ? 90 : 365;
  const points = range === "1D" ? 24 : Math.min(days, 120);
  const rnd = seeded(base + days);
  const out: PriceHistoryPoint[] = [];
  let p = base * (0.94 + rnd() * 0.04);
  const end = new Date("2026-08-13T12:00:00Z").getTime();
  const step = (days * 86_400_000) / points;
  for (let i = 0; i <= points; i++) {
    const wave = Math.sin(i / (points / 6)) * base * 0.028 + Math.sin(i / (points / 17)) * base * 0.014;
    p = p + (rnd() - 0.48) * base * 0.012;
    const v = Math.min(base * 1.06, Math.max(base * 0.93, base + wave + (p - base) * 0.35));
    out.push({ t: new Date(end - (points - i) * step).toISOString(), price_irr: Math.round(v / 1000) * 1000 });
  }
  out[out.length - 1].price_irr = base;
  return out;
}

function series30d(base: number, vol: number, seed: number): SeriesPoint[] {
  const rnd = seeded(seed);
  const out: SeriesPoint[] = [];
  const end = new Date("2026-08-13T00:00:00Z").getTime();
  for (let i = 29; i >= 0; i--) {
    const v = base * (0.72 + rnd() * 0.56) * (1 + vol * Math.sin(i / 3));
    out.push({ t: new Date(end - i * 86_400_000).toISOString(), value: Math.round(v) });
  }
  return out;
}

/* ---------------- session ---------------- */
const LS_USER = "zarvan_uid";
let sessionUserId: number | null = Number(localStorage.getItem(LS_USER)) || null;

function currentUserId(): number | null {
  return sessionUserId;
}
function requireUser(): User {
  const u = users.find((x) => x.id === sessionUserId);
  if (!u) throw new ApiError("نشست منقضی شد", 401);
  return u;
}

export const settingsDb = {
  bid_bps: 60, ask_bps: 45, quote_ttl_sec: 18, slippage_bps: 10, min_trade_mg: 100,
  unverified_daily_cap_irr: 50_000_000, otp_enabled: true, vat_pct: 0,
  invoice_legal_name: "شرکت طلای زرون (سهامی خاص)", invoice_reg_no: "۵۴۸۹۳۲",
  psp: "به‌پرداخت ملت", sms_provider: "کاوه‌نگار",
  vault_address: "تهران، خیابان فردوسی، ساختمان خزانه زرون، طبقه ۳-",
  maintenance: false, trading_halt: false,
};

/* ================================ modules ================================ */

export const authApi = {
  async me(): Promise<User | null> {
    await delay(200);
    const id = currentUserId();
    if (!id) return null;
    return users.find((u) => u.id === id) ?? null;
  },
  async sendOtp(mobile: string): Promise<{ ok: true }> {
    await delay(500);
    if (!/^09\d{9}$/.test(mobile)) throw new ApiError("شماره موبایل معتبر نیست", 422, { mobile: ["شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد"] });
    return { ok: true };
  },
  async verifyOtp(mobile: string, code: string, _referral_code?: string): Promise<User> {
    await delay(600);
    if (!/^\d{6}$/.test(code)) throw new ApiError("کد باید ۶ رقم باشد", 422);
    if (code === "000000") throw new ApiError("کد واردشده نامعتبر است", 422);
    let u = users.find((x) => x.mobile === mobile);
    if (!u) {
      u = { id: users.length + 1, name: null, mobile, email: null, role: "customer", kyc_status: "unverified", created_at: new Date().toISOString() };
      users.push(u);
    }
    sessionUserId = Number(u.id);
    localStorage.setItem(LS_USER, String(u.id));
    return u;
  },
  async passwordLogin(mobile: string, password: string): Promise<User> {
    await delay(600);
    const u = users.find((x) => x.mobile === mobile);
    if (!u || password.length < 6) throw new ApiError("شماره موبایل یا رمز عبور نادرست است", 422);
    sessionUserId = Number(u.id);
    localStorage.setItem(LS_USER, String(u.id));
    return u;
  },
  async demoLogin(userId: number): Promise<User> {
    await delay(300);
    const u = users.find((x) => x.id === userId);
    if (!u) throw new ApiError("کاربر یافت نشد", 404);
    sessionUserId = Number(u.id);
    localStorage.setItem(LS_USER, String(u.id));
    return u;
  },
  async logout(): Promise<void> {
    await delay(150);
    sessionUserId = null;
    localStorage.removeItem(LS_USER);
  },
  listUsers(): (User & { password?: string })[] { return users; },
};

export const catalogApi = {
  async products(params?: { type?: string; karat?: number; q?: string; inStock?: boolean; sort?: string; page?: number; per_page?: number; occ?: string }) {
    await delay();
    let list = [...products];
    if (params?.type && params.type !== "all") list = list.filter((p) => p.type === params.type);
    if (params?.karat) list = list.filter((p) => p.karat === params.karat);
    if (params?.occ) list = list.filter((p) => p.occasion === params.occ);
    if (params?.q) list = list.filter((p) => p.name.includes(params.q!) || p.sku.toLowerCase().includes(params.q!.toLowerCase()));
    if (params?.inStock) list = list.filter((p) => (p.stock_on_hand ?? 0) > 0);
    if (params?.sort === "price_asc") list.sort((a, b) => (a.quote_irr ?? 0) - (b.quote_irr ?? 0));
    if (params?.sort === "price_desc") list.sort((a, b) => (b.quote_irr ?? 0) - (a.quote_irr ?? 0));
    if (params?.sort === "weight") list.sort((a, b) => b.weight_mg - a.weight_mg);
    return { data: list, meta: { current_page: 1, per_page: 15, total: list.length, last_page: 1 } };
  },
  async productBySlug(slug: string): Promise<Product> {
    await delay();
    const p = products.find((x) => x.slug === slug);
    if (!p) throw new ApiError("محصول پیدا نشد", 404);
    return p;
  },
  productById(id: number | string): Product | undefined { return products.find((p) => p.id === Number(id)); },
  async categories(): Promise<Category[]> { await delay(200); return categories; },
  all: products,
};

export const pricingApi = {
  async spot(): Promise<SpotPrice[]> {
    await delay(240);
    const stale = settingsDb.trading_halt ? 42 : 3;
    return [
      { karat: 18, price_irr_per_gram: SPOT18, bid_irr: Math.round(SPOT18 * (1 - settingsDb.bid_bps / 10000)), ask_irr: Math.round(SPOT18 * (1 + settingsDb.ask_bps / 10000)), change_pct_24h: 0.8, observed_at: new Date().toISOString(), stale_seconds: stale, trading_halt: settingsDb.trading_halt },
      { karat: 24, price_irr_per_gram: SPOT24, bid_irr: Math.round(SPOT24 * (1 - settingsDb.bid_bps / 10000)), ask_irr: Math.round(SPOT24 * (1 + settingsDb.ask_bps / 10000)), change_pct_24h: 0.6, observed_at: new Date().toISOString(), stale_seconds: stale, trading_halt: settingsDb.trading_halt },
    ];
  },
  async history(range: PriceRange, karat: 18 | 24 = 18): Promise<PriceHistoryPoint[]> {
    await delay();
    return priceHistory(range, karat);
  },
  async alerts(): Promise<PriceAlert[]> { await delay(250); return alertsDb; },
  async createAlert(a: Omit<PriceAlert, "id">): Promise<PriceAlert> {
    await delay();
    const na = { ...a, id: alertsDb.length + 10 };
    alertsDb.push(na);
    return na;
  },
  async deleteAlert(id: number): Promise<void> {
    await delay(200);
    const i = alertsDb.findIndex((x) => x.id === id);
    if (i >= 0) alertsDb.splice(i, 1);
  },
  async toggleAlert(id: number): Promise<void> {
    await delay(200);
    const a = alertsDb.find((x) => x.id === id);
    if (a) a.is_active = !a.is_active;
  },
};

export const walletApi = {
  async wallets(): Promise<Wallet[]> {
    await delay(300);
    const u = requireUser();
    return walletsDb[u.id] ?? (walletsDb[u.id] = [
      { id: Date.now(), currency: "irr", balance: 0, updated_at: new Date().toISOString() },
      { id: Date.now() + 1, currency: "gold_mg", balance: 0, updated_at: new Date().toISOString() },
    ]);
  },
  async ledger(): Promise<LedgerEntry[]> {
    await delay();
    const u = requireUser();
    return ledgerDb[u.id] ?? [];
  },
  async deposit(amount_irr: number): Promise<Wallet[]> {
    await delay(900);
    const u = requireUser();
    const ws = await this.wallets();
    const irr = ws.find((w) => w.currency === "irr")!;
    irr.balance += amount_irr;
    irr.updated_at = new Date().toISOString();
    pushLedger(u.id, { direction: "credit", amount: amount_irr, reason: "واریز از درگاه بانکی", balance_after: irr.balance, reference_type: "deposit" });
    return ws;
  },
  async withdraw(amount_irr: number, _iban: string, otp_code?: string): Promise<Wallet[]> {
    await delay(900);
    const u = requireUser();
    if (settingsDb.otp_enabled && !otp_code) throw new ApiError("کد تأیید erforderlich است", 403);
    const ws = walletsDb[u.id]!;
    const irr = ws.find((w) => w.currency === "irr")!;
    if (irr.balance < amount_irr) throw new ApiError("موجودی کافی نیست", 422);
    irr.balance -= amount_irr;
    pushLedger(u.id, { direction: "debit", amount: amount_irr, reason: "برداشت به شبا", balance_after: irr.balance, reference_type: "withdraw" });
    return ws;
  },
  async balance90d(): Promise<SeriesPoint[]> { await delay(); return series30d(25_000_000, 0.5, 77).concat(series30d(30_000_000, 0.4, 91)); },
};

function pushLedger(uid: number | string, e: Omit<LedgerEntry, "id" | "created_at" | "reference_id"> & { reference_id?: number | string }) {
  const list = ledgerDb[uid] ?? (ledgerDb[uid] = []);
  list.unshift({ ...e, id: Date.now(), reference_id: e.reference_id ?? Date.now(), created_at: new Date().toISOString() });
}

export const tradeApi = {
  async getQuote(side: "buy" | "sell", weight_mg: number): Promise<TradeQuote> {
    await delay(550);
    if (settingsDb.trading_halt) throw new ApiError("معاملات موقتاً متوقف است", 503);
    if (weight_mg < settingsDb.min_trade_mg) throw new ApiError(`حداقل وزن معامله ${settingsDb.min_trade_mg} میلی‌گرم است`, 422);
    const spread = side === "buy" ? settingsDb.ask_bps : settingsDb.bid_bps;
    const spot = SPOT18;
    const gross = (weight_mg / 1000) * spot;
    const irr_amount = Math.round(side === "buy" ? gross * (1 + spread / 10000) : gross * (1 - spread / 10000));
    return { id: ++quoteSeq, side, weight_mg, spot_irr: spot, spread_bps: spread, irr_amount, expires_at: new Date(Date.now() + settingsDb.quote_ttl_sec * 1000).toISOString() };
  },
  async confirm(quote: TradeQuote, otp_code?: string): Promise<Trade> {
    await delay(900);
    if (new Date(quote.expires_at).getTime() < Date.now()) throw new ApiError("قیمت منقضی شد", 409);
    const u = requireUser();
    if (quote.side === "sell" && settingsDb.otp_enabled && !otp_code) throw new ApiError("کد تأیید لازم است", 403);
    const ws = walletsDb[u.id] ?? (walletsDb[u.id] = [
      { id: 1, currency: "irr", balance: 0, updated_at: new Date().toISOString() },
      { id: 2, currency: "gold_mg", balance: 0, updated_at: new Date().toISOString() },
    ]);
    const irr = ws.find((w) => w.currency === "irr")!;
    const gold = ws.find((w) => w.currency === "gold_mg")!;
    if (quote.side === "buy") {
      if (irr.balance < quote.irr_amount) throw new ApiError("موجودی کافی نیست", 422);
      irr.balance -= quote.irr_amount;
      gold.balance += quote.weight_mg;
      pushLedger(u.id, { direction: "debit", amount: quote.irr_amount, reason: `خرید طلای آب‌شده — ${quote.weight_mg} mg`, balance_after: irr.balance, reference_type: "trade" });
    } else {
      if (gold.balance < quote.weight_mg) throw new ApiError("موجودی طلای کافی نیست", 422);
      gold.balance -= quote.weight_mg;
      irr.balance += quote.irr_amount;
      pushLedger(u.id, { direction: "credit", amount: quote.irr_amount, reason: `فروش طلای آب‌شده — ${quote.weight_mg} mg`, balance_after: irr.balance, reference_type: "trade" });
    }
    const trade: Trade = { id: ++tradeSeq, quote_id: quote.id, side: quote.side, status: "filled", weight_mg: quote.weight_mg, irr_amount: quote.irr_amount, spot_irr: quote.spot_irr, slippage_bps: 0, filled_at: new Date().toISOString() };
    tradesDb.unshift(trade);
    return trade;
  },
  async history(): Promise<Trade[]> { await delay(300); return tradesDb; },
  async buyback(req: BuybackRequest): Promise<{ id: number }> {
    await delay(800);
    if (req.weight_mg < 500) throw new ApiError("حداقل وزن بازخرید ۵۰۰ میلی‌گرم است", 422);
    return { id: Date.now() };
  },
};

export const orderApi = {
  async cart(): Promise<Cart> { await delay(300); return { ...cartDb, lines: [...cartDb.lines] }; },
  async addLine(productId: number, qty = 1): Promise<Cart> {
    await delay(350);
    const p = catalogApi.productById(productId);
    if (!p) throw new ApiError("محصول پیدا نشد", 404);
    const existing = cartDb.lines.find((l) => l.product_id === productId);
    if (existing) existing.qty += qty;
    else cartDb.lines.push({ id: Date.now(), product_id: p.id, product: p, qty, packaging: "standard", unit_quote_irr: p.quote_irr ?? 0 });
    recomputeCart();
    return this.cart();
  },
  async setQty(lineId: number, qty: number): Promise<Cart> {
    await delay(220);
    const l = cartDb.lines.find((x) => x.id === lineId);
    if (l) l.qty = Math.max(1, qty);
    recomputeCart();
    return this.cart();
  },
  async removeLine(lineId: number): Promise<Cart> {
    await delay(220);
    const i = cartDb.lines.findIndex((x) => x.id === lineId);
    if (i >= 0) cartDb.lines.splice(i, 1);
    recomputeCart();
    return this.cart();
  },
  async setPackaging(lineId: number, packaging: "standard" | "luxury"): Promise<Cart> {
    await delay(200);
    const l = cartDb.lines.find((x) => x.id === lineId);
    if (l) l.packaging = packaging;
    recomputeCart();
    return this.cart();
  },
  async applyCoupon(code: string): Promise<Cart> {
    await delay(600);
    const c = couponsDb.find((x) => x.code.toLowerCase() === code.trim().toLowerCase() && x.is_active);
    if (!c) throw new ApiError("کد تخفیف نامعتبر", 422);
    cartDb.coupon_code = c.code;
    recomputeCart();
    return this.cart();
  },
  async placeOrder(fulfillment: "vault" | "delivery"): Promise<Order> {
    await delay(1200);
    const u = requireUser();
    if (cartDb.lines.length === 0) throw new ApiError("سبد خرید خالی است", 422);
    const order: Order = {
      id: Date.now(), number: `ZRVORD-2026-${String(900 + ordersDb[1].length + 1).padStart(4, "0")}`,
      status: fulfillment === "vault" ? "vaulted" : "paid", fulfillment,
      subtotal_irr: cartDb.subtotal_irr, making_irr: 0, discount_irr: cartDb.discount_irr, tax_irr: 0,
      total_irr: cartDb.total_irr, gold_mg: cartDb.lines.reduce((s, l) => s + (l.product?.weight_mg ?? 0) * l.qty, 0),
      paid_at: new Date().toISOString(), created_at: new Date().toISOString(),
      items: cartDb.lines.map((l) => ({ ...l })),
      customer: { id: u.id, name: u.name, mobile: u.mobile },
    };
    (ordersDb[u.id] ??= []).unshift(order);
    (invoicesDb[u.id] ??= []).unshift({ id: invoiceSeq, number: `ZRV-2026-${String(invoiceSeq++).padStart(5, "0")}`, issued_at: order.paid_at!, total_irr: order.total_irr, gold_mg: order.gold_mg, pdf_url: "#" });
    cartDb.lines = [];
    cartDb.coupon_code = null;
    recomputeCart();
    return order;
  },
  async orders(): Promise<Order[]> {
    await delay();
    const u = requireUser();
    return ordersDb[u.id] ?? [];
  },
  async orderById(id: number | string): Promise<Order> {
    await delay();
    const u = requireUser();
    const o = (ordersDb[u.id] ?? []).find((x) => String(x.id) === String(id) || x.number === String(id));
    if (!o) throw new ApiError("سفارش پیدا نشد", 404);
    return o;
  },
  async cancelOrder(id: number): Promise<Order> {
    await delay(700);
    const u = requireUser();
    const o = (ordersDb[u.id] ?? []).find((x) => x.id === id);
    if (!o) throw new ApiError("سفارش پیدا نشد", 404);
    if (o.paid_at) throw new ApiError("سفارش پرداخت‌شده قابل لغو نیست", 422);
    o.status = "cancelled";
    return o;
  },
  async invoices(): Promise<Invoice[]> {
    await delay();
    const u = requireUser();
    return invoicesDb[u.id] ?? [];
  },
  async allOrders(): Promise<Order[]> {
    await delay();
    const all: Order[] = [];
    Object.entries(ordersDb).forEach(([uid, list]) => {
      const cu = users.find((x) => x.id === Number(uid));
      list.forEach((o) => all.push({ ...o, customer: cu ? { id: cu.id, name: cu.name, mobile: cu.mobile } : o.customer }));
    });
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async updateOrderStatus(id: number, status: OrderStatus, tracking?: string): Promise<void> {
    await delay(500);
    for (const list of Object.values(ordersDb)) {
      const o = list.find((x) => x.id === id);
      if (o) {
        o.status = status;
        if (tracking && o.shipment) o.shipment.tracking_code = tracking;
        if (tracking && !o.shipment) o.shipment = { ...makeShipment(), tracking_code: tracking, status: "shipped" };
        return;
      }
    }
  },
};

function recomputeCart() {
  cartDb.subtotal_irr = cartDb.lines.reduce((s, l) => s + l.unit_quote_irr * l.qty, 0);
  if (cartDb.coupon_code) {
    const c = couponsDb.find((x) => x.code === cartDb.coupon_code);
    if (c) cartDb.discount_irr = c.type === "percent" ? Math.round((cartDb.subtotal_irr * c.value) / 100) : Math.min(c.value, cartDb.subtotal_irr);
    else cartDb.discount_irr = 0;
  } else cartDb.discount_irr = 0;
  cartDb.total_irr = cartDb.subtotal_irr - cartDb.discount_irr;
}

export const investApi = {
  async summary() {
    await delay();
    return { cost_irr: 41_300_000, market_irr: 43_824_000, pnl_irr: 2_524_000, pnl_pct: 6.1, gold_mg: 12_450 };
  },
  async lots() {
    await delay(300);
    return [
      { id: 1, acquired_at: "2026-08-12T17:22:00Z", weight_mg: 1000, cost_irr: 3_520_000, market_irr: 3_520_000 },
      { id: 2, acquired_at: "2026-07-20T12:15:00Z", weight_mg: 10_000, cost_irr: 33_900_000, market_irr: 35_200_000 },
      { id: 3, acquired_at: "2026-07-05T09:00:00Z", weight_mg: 1450, cost_irr: 3_880_000, market_irr: 5_104_000 },
    ];
  },
  async pnl90d(): Promise<SeriesPoint[]> { await delay(); return series30d(2_500_000, 0.8, 42); },
  async plans(): Promise<AutoInvestPlan[]> { await delay(280); return plansDb; },
  async createPlan(amount_irr: number, day_of_month: number): Promise<AutoInvestPlan> {
    await delay(500);
    const p = { id: Date.now(), amount_irr, day_of_month, is_active: true };
    plansDb.push(p);
    return p;
  },
  async togglePlan(id: number): Promise<void> {
    await delay(200);
    const p = plansDb.find((x) => x.id === id);
    if (p) p.is_active = !p.is_active;
  },
  async contracts(): Promise<InstallmentContract[]> { await delay(300); return contractsDb; },
  async payInstallment(id: number, amount: number): Promise<void> {
    await delay(800);
    const c = contractsDb.find((x) => x.id === id);
    if (c) { c.paid_irr += amount; c.remaining_irr = Math.max(0, c.remaining_irr - amount); }
  },
  async portfolio30d(): Promise<SeriesPoint[]> { await delay(); return series30d(43_000_000, 0.2, 63); },
};

export const promoApi = {
  async coupons(): Promise<Coupon[]> { await delay(300); return couponsDb; },
  async createCoupon(c: Omit<Coupon, "id" | "uses_count">): Promise<Coupon> {
    await delay(500);
    const nc = { ...c, id: Date.now(), uses_count: 0 };
    couponsDb.unshift(nc);
    return nc;
  },
  async gifts(): Promise<GiftCard[]> { await delay(300); return giftsDb; },
  async sendGift(g: { recipient_mobile: string; gold_mg: number; packaging: "standard" | "luxury"; message?: string }): Promise<GiftCard> {
    await delay(800);
    const ng: GiftCard = { id: Date.now(), code: "ZGIFT-" + Math.random().toString(36).slice(2, 7).toUpperCase(), recipient_mobile: g.recipient_mobile, gold_mg: g.gold_mg, status: "sent", packaging: g.packaging, message: g.message };
    giftsDb.unshift(ng);
    return ng;
  },
  async referrals(): Promise<ReferralStats> {
    await delay(300);
    const u = requireUser();
    return referralsDb[u.id] ?? (referralsDb[u.id] = { code: u.referral_code ?? "ZARV-NEW1", invited_count: 0, gold_earned_mg: 0, referees: [] });
  },
};

export const supportApi = {
  async tickets(): Promise<Ticket[]> { await delay(); return ticketsDb; },
  async myTickets(): Promise<Ticket[]> {
    await delay();
    const u = requireUser();
    return ticketsDb.filter((t) => t.user?.id === u.id);
  },
  async createTicket(subject: string, type: Ticket["type"], body: string): Promise<Ticket> {
    await delay(700);
    const u = requireUser();
    const t: Ticket = { id: ticketSeq++, subject, type, status: "open", priority: "normal", updated_at: new Date().toISOString(), user: { id: u.id, name: u.name, mobile: u.mobile } };
    ticketsDb.unshift(t);
    const msgs: TicketMessage[] = [{ id: 1, body, is_staff: false, created_at: t.updated_at }];
    ticketMessagesDb[String(t.id)] = msgs;
    return t;
  },
  async messages(id: number): Promise<TicketMessage[]> {
    await delay(300);
    return ticketMessagesDb[id] ?? [];
  },
  async reply(id: number, body: string, is_staff: boolean): Promise<TicketMessage> {
    await delay(500);
    const m: TicketMessage = { id: Date.now(), body, is_staff, created_at: new Date().toISOString() };
    (ticketMessagesDb[id] ??= []).push(m);
    const t = ticketsDb.find((x) => x.id === id);
    if (t) { t.updated_at = m.created_at; t.status = is_staff ? "pending" : "open"; }
    return m;
  },
  async close(id: number): Promise<void> {
    await delay(300);
    const t = ticketsDb.find((x) => x.id === id);
    if (t) t.status = "closed";
  },
};

export const notifyApi = {
  async list(): Promise<AppNotification[]> {
    await delay(300);
    const u = requireUser();
    return notificationsDb[u.id] ?? [];
  },
  async markRead(id: number): Promise<void> {
    await delay(150);
    const u = requireUser();
    const n = (notificationsDb[u.id] ?? []).find((x) => x.id === id);
    if (n) n.read_at = new Date().toISOString();
  },
  async markAll(): Promise<void> {
    await delay(250);
    const u = requireUser();
    (notificationsDb[u.id] ?? []).forEach((n) => (n.read_at = new Date().toISOString()));
  },
  unread(): number {
    if (!sessionUserId) return 0;
    return (notificationsDb[sessionUserId] ?? []).filter((n) => !n.read_at).length;
  },
  async broadcast(title: string, body: string): Promise<void> {
    await delay(900);
    users.forEach((u) => {
      (notificationsDb[u.id] ??= []).unshift({ id: ++notifSeq, type: "system", title, body, read_at: null, created_at: new Date().toISOString() });
    });
  },
};

export const profileApi = {
  async addresses(): Promise<Address[]> { await delay(250); return addressesDb; },
  async saveAddress(a: Omit<Address, "id"> & { id?: number | string }): Promise<Address> {
    await delay(500);
    if (a.id) {
      const i = addressesDb.findIndex((x) => x.id === a.id);
      if (i >= 0) addressesDb[i] = { ...a, id: a.id } as Address;
      return addressesDb[i];
    }
    const na = { ...a, id: Date.now() } as Address;
    addressesDb.push(na);
    return na;
  },
  async deleteAddress(id: number | string): Promise<void> {
    await delay(300);
    const i = addressesDb.findIndex((x) => x.id === id);
    if (i >= 0) addressesDb.splice(i, 1);
  },
  async kycSubmit(): Promise<{ status: "pending" }> {
    await delay(1000);
    const u = requireUser();
    const real = users.find((x) => x.id === u.id);
    if (real) real.kyc_status = "pending";
    return { status: "pending" };
  },
  async saveProfile(_patch: Partial<User>): Promise<User> {
    await delay(600);
    return requireUser();
  },
};

/* ---------------- admin / staff data ---------------- */
const inventoryDb = [
  { sku: "BR-18-221", name: "دستبند طنابی", on_hand: 6, reserved: 1, reorder: 3, updated: "2026-08-12T09:00:00Z" },
  { sku: "RING-18-105", name: "انگشتر سولیتر", on_hand: 9, reserved: 0, reorder: 4, updated: "2026-08-11T14:30:00Z" },
  { sku: "NK-18-412", name: "گردنبند ونکلیف", on_hand: 3, reserved: 1, reorder: 4, updated: "2026-08-10T11:20:00Z" },
  { sku: "BG-18-230", name: "النگوی تراش", on_hand: 4, reserved: 0, reorder: 2, updated: "2026-08-09T16:00:00Z" },
  { sku: "RING-18-118", name: "حلقه ازدواج", on_hand: 0, reserved: 0, reorder: 5, updated: "2026-08-08T10:10:00Z" },
  { sku: "COIN-24-BAHAR", name: "سکه بهار", on_hand: 24, reserved: 2, reorder: 10, updated: "2026-08-13T08:00:00Z" },
  { sku: "BAR-24-50", name: "شمش ۵۰ گرمی", on_hand: 12, reserved: 0, reorder: 5, updated: "2026-08-12T18:30:00Z" },
];

export const adminApi = {
  async dashboard(): Promise<AdminDashboardData> {
    await delay(600);
    const rnd = seeded(9);
    return {
      kpis: [
        { label: "فروش ۳۰ روز", value: "۱٫۸۵ میلیارد ریال", delta: 12.4 },
        { label: "حجم طلا ۳۰ روز", value: "۵۲۰٬۰۰۰ mg", delta: 8.1 },
        { label: "سفارش‌های باز", value: 14, delta: -2 },
        { label: "KYC در انتظار", value: 6, delta: 1 },
        { label: "نرخ لحظه‌ای ۱۸ عیار", value: "۳٬۵۲۰٬۰۰۰", delta: 0.8 },
        { label: "مشتریان جدید ۳۰ روز", value: 118, delta: 15.2, sparkline: Array.from({ length: 20 }, () => Math.round(2 + rnd() * 7)) },
      ],
      sales_irr_30d: series30d(62_000_000, 0.35, 11),
      gold_volume_mg_30d: series30d(17_500, 0.5, 23),
      spot_90d: priceHistory("90D", 18).map((p) => ({ t: p.t, value: p.price_irr })),
      orders_funnel: [
        { key: "awaiting", label: "در انتظار پرداخت", count: 14 },
        { key: "paid", label: "پرداخت‌شده", count: 38 },
        { key: "processing", label: "در حال پردازش", count: 22 },
        { key: "shipped", label: "ارسال‌شده", count: 17 },
        { key: "delivered", label: "تحویل‌شده", count: 121 },
        { key: "cancelled", label: "لغوشده", count: 6 },
      ],
      inventory_health: [
        { sku: "RING-18-118", level: "low", qty: 0 },
        { sku: "NK-18-412", level: "low", qty: 3 },
        { sku: "BR-18-221", level: "ok", qty: 6 },
        { sku: "BAR-24-50", level: "ok", qty: 12 },
        { sku: "COIN-24-BAHAR", level: "over", qty: 24 },
      ],
      kyc_funnel: [
        { key: "unverified", label: "تأییدنشده", count: 214 },
        { key: "pending", label: "در انتظار", count: 6 },
        { key: "approved", label: "تأییدشده", count: 489 },
        { key: "rejected", label: "ردشده", count: 11 },
      ],
      solvency: { vault_mg: 18_420_000, liabilities_mg: 19_130_000, ratio_pct: 96.3 },
      new_customers_30d: Array.from({ length: 30 }, () => Math.round(1 + rnd() * 8)),
    };
  },
  async inventory() { await delay(); return inventoryDb; },
  async setStock(sku: string, qty: number): Promise<void> {
    await delay(400);
    const r = inventoryDb.find((x) => x.sku === sku);
    if (r) { r.on_hand = qty; r.updated = new Date().toISOString(); }
  },
  async payments(): Promise<(Payment & { customer?: string; order_no?: string })[]> {
    await delay();
    return [
      { id: 551, amount_irr: 23_284_000, driver: "به‌پرداخت ملت", status: "paid", ref_id: "A1B2C3", paid_at: "2026-08-10T11:02:00Z", customer: "سارا کریمی", order_no: "ZRVORD-2026-0901" },
      { id: 550, amount_irr: 35_200_000, driver: "به‌پرداخت ملت", status: "paid", ref_id: "X9Y8Z7", paid_at: "2026-07-20T12:15:00Z", customer: "سارا کریمی", order_no: "ZRVORD-2026-0817" },
      { id: 549, amount_irr: 7_040_000, driver: "زرین‌پال", status: "pending", paid_at: undefined, customer: "امیر توکلی", order_no: "ZRVORD-2026-0931" },
      { id: 548, amount_irr: 16_304_000, driver: "به‌پرداخت ملت", status: "paid", ref_id: "Q1W2E3", paid_at: "2026-06-21T18:40:00Z", customer: "نازنین احمدی", order_no: "ZRVORD-2026-0744" },
      { id: 547, amount_irr: 21_860_000, driver: "زرین‌پال", status: "failed", paid_at: undefined, customer: "رضا محمدی", order_no: "ZRVORD-2026-0739" },
    ];
  },
  async customers(): Promise<User[]> { await delay(); return users.filter((u) => u.role !== "admin"); },
  async setRole(id: number, role: User["role"]): Promise<void> {
    await delay(400);
    const u = users.find((x) => x.id === id);
    if (u) u.role = role;
  },
  async walletLedgers(query: string) {
    await delay(400);
    const q = query.trim();
    const target = q ? users.find((u) => u.mobile.includes(q) || (u.name ?? "").includes(q)) : users[0];
    const u = target ?? users[0];
    return { user: u, wallets: walletsDb[u.id] ?? [], ledger: ledgerDb[u.id] ?? [] };
  },
  async adjustWallet(uid: number, currency: "irr" | "gold_mg", amount: number, reason: string): Promise<void> {
    await delay(700);
    if (!reason.trim()) throw new ApiError("دلیل اصلاح الزامی است", 422);
    const ws = walletsDb[uid] ?? (walletsDb[uid] = []);
    const w = ws.find((x) => x.currency === currency);
    if (w) { w.balance += amount; pushLedger(uid, { direction: amount >= 0 ? "credit" : "debit", amount: Math.abs(amount), reason: "اصلاح دستی: " + reason, balance_after: w.balance, reference_type: "adjustment" }); }
  },
  async staff(): Promise<User[]> { await delay(300); return users.filter((u) => u.role === "staff" || u.role === "admin"); },
  async inviteStaff(_mobile: string, _role: "staff" | "admin"): Promise<{ ok: true }> { await delay(700); return { ok: true }; },
  async saveSettings(patch: Partial<typeof settingsDb>): Promise<void> {
    await delay(600);
    Object.assign(settingsDb, patch);
  },
  settings: settingsDb,
  inventoryAll: inventoryDb,
};

export const staffApi = {
  async kycQueue(): Promise<(User & { submitted_at: string })[]> {
    await delay();
    return users
      .filter((u) => u.role === "customer")
      .map((u) => ({ ...u, submitted_at: u.created_at }));
  },
  async approveKyc(id: number): Promise<void> {
    await delay(600);
    const u = users.find((x) => x.id === id);
    if (u) u.kyc_status = "approved";
  },
  async rejectKyc(id: number, _reason: string): Promise<void> {
    await delay(600);
    const u = users.find((x) => x.id === id);
    if (u) u.kyc_status = "rejected";
  },
};

export const dealerApi = {
  async stats() {
    await delay();
    return {
      spread_bps: 25,
      volume_30d_mg: 1_240_000,
      orders_count: 9,
      orders: [
        { id: 1, number: "ZRVWHL-2026-114", qty_mg: 500_000, total_irr: 1_755_000_000, status: "processing", date: "2026-08-11T10:00:00Z" },
        { id: 2, number: "ZRVWHL-2026-109", qty_mg: 250_000, total_irr: 878_000_000, status: "delivered", date: "2026-08-02T14:20:00Z" },
        { id: 3, number: "ZRVWHL-2026-101", qty_mg: 490_000, total_irr: 1_720_000_000, status: "delivered", date: "2026-07-18T09:45:00Z" },
      ],
    };
  },
};

export { BASE_URL };
