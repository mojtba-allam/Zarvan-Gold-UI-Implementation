/* ================= Zarvan Gold — shared domain types (§4) ================= */

/* ---- 4.1 API envelope ---- */
export type ApiSuccess<T> = { data: T };
export type ApiListMeta = { current_page: number; per_page: number; total: number; last_page: number };
export type ApiList<T> = { data: T[]; meta: ApiListMeta; links?: { first?: string; last?: string; prev?: string | null; next?: string | null } };
export type ApiError = { message: string; errors?: Record<string, string[]> };
export type IsoDateString = string;
export type Id = number | string;

/* ---- 4.2 Auth ---- */
export type UserRole = "customer" | "dealer" | "staff" | "admin";
export type KycStatus = "unverified" | "pending" | "approved" | "rejected";

export interface User {
  id: Id;
  name: string | null;
  mobile: string;
  email: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  referral_code?: string;
  created_at: IsoDateString;
}
export interface AuthMeResponse { user: User }
export interface OtpSendPayload { mobile: string; purpose?: "login" | "withdraw" | "trade" }
export interface OtpVerifyPayload { mobile: string; code: string; referral_code?: string }
export interface PasswordLoginPayload { mobile: string; password: string }
export interface Address {
  id: Id;
  title: string;
  province: string;
  city: string;
  line1: string;
  postal_code: string;
  is_default: boolean;
}

/* ---- 4.3 Catalog ---- */
export type ProductType = "jewelry" | "bar" | "coin" | "melted";
export type ProductStatus = "draft" | "active" | "inactive" | "out_of_stock";
export type MakingChargeType = "flat" | "per_gram";
export type CategoryType = "jewelry" | "bullion" | "melted";
export type Karat = 18 | 24;

export interface Category {
  id: Id;
  parent_id: Id | null;
  name: string;
  slug: string;
  type: CategoryType;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

export interface Product {
  id: Id;
  sku: string;
  slug: string;
  name: string;
  type: ProductType;
  category_id: Id;
  karat: Karat;
  weight_mg: number;
  making_charge_type: MakingChargeType;
  making_charge_irr: number;
  occasion?: string | null;
  status: ProductStatus;
  description?: string;
  attributes?: Record<string, string | number | boolean>;
  images: string[];
  has_360?: boolean;
  quote_irr?: number;
  bid_irr?: number | null;
  ask_irr?: number | null;
  stock_on_hand?: number;
  published_at?: IsoDateString | null;
}

/* ---- 4.4 Pricing ---- */
export interface SpotPrice {
  karat: Karat;
  price_irr_per_gram: number;
  bid_irr?: number;
  ask_irr?: number;
  change_pct_24h?: number;
  observed_at: IsoDateString;
  stale_seconds?: number;
  trading_halt?: boolean;
}
export interface PriceHistoryPoint { t: IsoDateString; price_irr: number }
export type PriceRange = "1D" | "1W" | "1M" | "1Y" | "90D";
export interface SpreadSettings { bid_bps: number; ask_bps: number }
export interface PriceAlert {
  id: Id;
  karat: Karat;
  direction: "above" | "below";
  threshold_irr: number;
  is_active: boolean;
}

/* ---- 4.5 Wallet ---- */
export type WalletCurrency = "irr" | "gold_mg";
export type LedgerDirection = "credit" | "debit";

export interface Wallet {
  id: Id;
  currency: WalletCurrency;
  balance: number;
  updated_at: IsoDateString;
}
export interface LedgerEntry {
  id: Id;
  direction: LedgerDirection;
  amount: number;
  reason: string;
  balance_after: number;
  reference_type?: string;
  reference_id?: Id;
  created_at: IsoDateString;
}
export interface DepositPayload { amount_irr: number }
export interface WithdrawPayload { amount_irr: number; iban: string; otp_code?: string }

/* ---- 4.6 Order / cart / payment / invoice ---- */
export type CartStatus = "active" | "converted" | "abandoned";
export type OrderStatus =
  | "draft" | "awaiting_payment" | "paid" | "reserved" | "processing"
  | "vaulted" | "shipped" | "delivered" | "cancelled" | "refunded";
export type Fulfillment = "vault" | "delivery";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";
export type PackagingType = "standard" | "luxury";

export interface CartLine {
  id: Id;
  product_id: Id;
  product?: Product;
  qty: number;
  packaging?: PackagingType;
  unit_quote_irr: number;
}
export interface Cart {
  id: Id;
  status: CartStatus;
  lines: CartLine[];
  coupon_code?: string | null;
  subtotal_irr: number;
  discount_irr: number;
  total_irr: number;
  quote_expires_at?: IsoDateString | null;
}
export interface Order {
  id: Id;
  number: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  subtotal_irr: number;
  making_irr: number;
  discount_irr: number;
  tax_irr: number;
  total_irr: number;
  gold_mg: number;
  paid_at?: IsoDateString | null;
  created_at: IsoDateString;
  items?: CartLine[];
  shipment?: Shipment;
  customer?: Pick<User, "id" | "name" | "mobile">;
}
export interface Shipment {
  carrier: string;
  tracking_code: string;
  status: string;
  timeline: { at: IsoDateString; label: string }[];
  shipped_at?: IsoDateString | null;
  delivered_at?: IsoDateString | null;
}
export interface Payment {
  id: Id;
  amount_irr: number;
  driver: string;
  status: PaymentStatus;
  authority?: string | null;
  ref_id?: string | null;
  paid_at?: IsoDateString | null;
}
export interface Invoice {
  id: Id;
  number: string;
  issued_at: IsoDateString;
  total_irr: number;
  gold_mg: number;
  pdf_url?: string;
}

/* ---- 4.7 Trade ---- */
export type TradeSide = "buy" | "sell";
export type TradeStatus = "filled" | "rejected";
export interface TradeQuote {
  id: Id;
  side: TradeSide;
  weight_mg: number;
  spot_irr: number;
  spread_bps: number;
  irr_amount: number;
  expires_at: IsoDateString;
}
export interface Trade {
  id: Id;
  quote_id?: Id;
  side: TradeSide;
  status: TradeStatus;
  weight_mg: number;
  irr_amount: number;
  spot_irr: number;
  slippage_bps?: number;
  filled_at?: IsoDateString | null;
}

/* ---- 4.8 Investment ---- */
export interface PortfolioSummary {
  cost_irr: number;
  market_irr: number;
  pnl_irr: number;
  pnl_pct: number;
  gold_mg: number;
}
export interface PortfolioLot {
  id: Id;
  acquired_at: IsoDateString;
  weight_mg: number;
  cost_irr: number;
  market_irr: number;
}
export interface AutoInvestPlan {
  id: Id;
  amount_irr: number;
  day_of_month: number;
  is_active: boolean;
}
export interface InstallmentContract {
  id: Id;
  months: number;
  down_irr: number;
  principal_irr: number;
  paid_irr: number;
  remaining_irr: number;
  status: string;
}
export interface BuybackRequest {
  source: "wallet" | "physical";
  weight_mg: number;
  notes?: string;
  photo_url?: string;
}

/* ---- 4.9 Promotion ---- */
export type CouponType = "percent" | "fixed_irr";
export type GiftCardStatus = "created" | "sent" | "redeemed";
export type ReferralRewardStatus = "pending" | "paid";
export interface Coupon {
  id: Id;
  code: string;
  type: CouponType;
  value: number;
  max_uses?: number;
  uses_count: number;
  min_order_irr?: number;
  expires_at?: IsoDateString | null;
  is_active: boolean;
}
export interface GiftCard {
  id: Id;
  code: string;
  recipient_mobile: string;
  gold_mg: number;
  status: GiftCardStatus;
  packaging?: PackagingType;
  message?: string;
}
export interface ReferralStats {
  code: string;
  invited_count: number;
  gold_earned_mg: number;
  referees: { mobile_masked: string; joined_at: IsoDateString }[];
}

/* ---- 4.10 Support / notification ---- */
export type TicketType = "general" | "price_match" | "delivery" | "kyc";
export type TicketStatus = "open" | "pending" | "closed";
export type TicketPriority = "low" | "normal" | "high";
export interface Ticket {
  id: Id;
  subject: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  updated_at: IsoDateString;
  user?: Pick<User, "id" | "name" | "mobile">;
}
export interface TicketMessage {
  id: Id;
  body: string;
  is_staff: boolean;
  created_at: IsoDateString;
}
export interface AppNotification {
  id: Id;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read_at: IsoDateString | null;
  created_at: IsoDateString;
}
export interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  in_app: boolean;
  price_alerts: boolean;
}

/* ---- 4.11 Reports / admin ---- */
export interface KpiValue { label: string; value: number | string; delta?: number; sparkline?: number[] }
export interface SeriesPoint { t: IsoDateString; value: number }
export interface FunnelStep { key: string; label: string; count: number }
export interface InventoryHealthRow { sku: string; level: "low" | "ok" | "over"; qty: number }
export interface SolvencyGauge { vault_mg: number; liabilities_mg: number; ratio_pct: number }
export interface AdminDashboardData {
  kpis: KpiValue[];
  sales_irr_30d: SeriesPoint[];
  gold_volume_mg_30d: SeriesPoint[];
  spot_90d: SeriesPoint[];
  orders_funnel: FunnelStep[];
  inventory_health: InventoryHealthRow[];
  kyc_funnel: FunnelStep[];
  solvency: SolvencyGauge;
  new_customers_30d: number[];
}

/* ---- 4.12 UI helpers ---- */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "sell";
export type ButtonSize = "sm" | "md" | "lg";
export type BadgeStatus =
  | "paid" | "pending" | "shipped" | "vaulted" | "halted"
  | "success" | "danger" | "warning" | "info" | "neutral" | "gold";
export type ModalSize = "sm" | "md" | "lg";
