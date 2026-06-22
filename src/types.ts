/**
 * AI-Powered Multi-Vendor E-Commerce Platform
 * Shared Types & Interfaces
 */

export type UserRole = "CUSTOMER" | "SELLER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatar: string;
  isVerified: boolean;
  walletBalance: number; // in INR (₹)
  createdAt: string;
}

export interface Seller {
  id: string;
  userId: string;
  shopName: string;
  description: string;
  logo: string;
  isApproved: boolean; // Managed by Admin approval workflow
  bankDetails: {
    accountNumber: string;
    bankName: string;
    ifsc: string;
  };
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  price: number; // if different from base price
  stock: number;
  imageUrl?: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName?: string; // Rich hydrated field
  title: string;
  description: string;
  category: string;
  brand: string;
  basePrice: number; // original price before discount
  discountPct: number; // e.g., 10 for 10%
  stock: number;
  sku: string;
  images: string[];
  videoUrl?: string;
  avgRating: number;
  reviewCount: number;
  meta: {
    deliveryTimeDays: number;
    warrantyInfo: string;
    returnPolicy: string;
    seoKeywords: string[];
  };
  variants?: ProductVariant[]; // Hydrated
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  imageUrl?: string;
}

export type OrderStatus = "Placed" | "Confirmed" | "Packed" | "Shipped" | "Delivered" | "Cancelled";

export interface Address {
  id: string;
  userId: string;
  label: string; // Home, Office, etc.
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userName?: string; // Hydrated
  totalAmount: number;
  discountAmount: number;
  walletDeducted: number;
  paymentMethod: "STRIPE" | "RAZORPAY" | "COD" | "WALLET";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  status: OrderStatus;
  address: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  variantId?: string;
  variantInfo?: string; // e.g., "Red / Large"
  quantity: number;
  price: number;
  sellerId: string;
}

export interface OrderTracking {
  id: string;
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  text: string;
  images?: string[];
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  savedForLater: boolean;
  product?: Product; // Hydrated
  variant?: ProductVariant; // Hydrated
}

export type CouponType = "FLAT" | "PERCENT" | "FREE_SHIPPING" | "BOGO" | "FESTIVAL";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // Rupee discount or % discount
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  sellerId?: string | null; // Null means platform-wide
}

export type NotificationType = "ORDER" | "PAYMENT" | "PRICE_DROP" | "OFFER" | "CHAT";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  meta?: any;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "DEPOSIT" | "REFUND" | "PURCHASE" | "CASHBACK" | "REWARD";
  amount: number;
  description: string;
  refId?: string;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product?: Product; // Hydrated
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  orderId?: string;
  text: string;
  createdAt: string;
}

export interface OTP {
  id: string;
  email: string;
  code: string;
  expiresAt: string;
  used: boolean;
}

// AI Service API Inputs and Outputs

export interface AIGenerateDescriptionInput {
  category: string;
  brand: string;
  imageContext?: string; // Opt base64 context or visual prompt
}

export interface AIGenerateDescriptionOutput {
  description: string;
  features: string[];
  seoTags: string[];
}

export interface AIRecommendPriceInput {
  costPrice: number;
  category: string;
  competitorsPrices: number[];
}

export interface AIRecommendPriceOutput {
  suggestedPrice: number;
  reasoning: string;
}

export interface AIDemandPredictionInput {
  productId: string;
  historicalSales: { month: string; quantity: number }[];
}

export interface AIDemandPredictionOutput {
  predictedUnitsNext30Days: number;
  confidenceScore: number;
  reasoning: string;
}

export interface AICheckFraudInput {
  orderAmount: number;
  paymentMethod: string;
  failedAttempts: number;
  addressChangeHour: boolean;
  userAgeDays: number;
}

export interface AICheckFraudOutput {
  isSuspicious: boolean;
  riskScore: number; // 0-100
  reasons: string[];
}
