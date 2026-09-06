export interface ProductImage {
  url: string;
  altText?: string | null;
}

export interface ActiveFlashSaleInfo {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  endsAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  flashSale: ActiveFlashSaleInfo | null;
  currency: string;
  image: ProductImage | null;
  store: { name: string; slug: string };
  category: { name: string; slug: string };
  rating: number | null;
  reviewCount: number;
  inStock: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  attributes: Record<string, string> | null;
  available: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  flashSale: ActiveFlashSaleInfo | null;
  currency: string;
  category: { id: string; name: string; slug: string };
  store: { id: string; name: string; slug: string; logoUrl: string | null };
  images: ProductImage[];
  variants: ProductVariant[];
  rating: number | null;
  reviewCount: number;
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    isVerifiedPurchase: boolean;
    createdAt: string;
    user: { name: string };
  }[];
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export type ReviewReportReason = "SPAM" | "ABUSIVE" | "OFFENSIVE" | "FAKE" | "OTHER";

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: { id: string; name: string; slug: string; imageUrl: string | null }[];
}

export interface CartItemView {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  onSale: boolean;
  product: { id: string; name: string; slug: string; image: string | null };
  variant: { id: string; name: string };
  available: number;
  exceedsStock: boolean;
}

export interface CartView {
  id: string;
  items: CartItemView[];
  subtotal: number;
  itemCount: number;
}

export interface WishlistItemView {
  id: string;
  addedAt: string;
  product: { id: string; name: string; slug: string; price: number; currency: string; image: string | null };
}

export interface Address {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export interface VendorStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  vendorStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
}

export interface VendorDashboard {
  store: { id: string; name: string; slug: string; isActive: boolean };
  vendorStatus: string;
  productCount: number;
  activeProductCount: number;
  draftProductCount: number;
  totalStockUnits: number;
  lowStockVariants: number;
  storeRating: number | null;
  storeReviewCount: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface VendorProductVariant {
  id: string;
  name: string;
  sku: string;
  priceDelta: number;
  attributes: Record<string, string> | null;
  inventory: { quantity: number; reservedQuantity: number; lowStockThreshold: number } | null;
}

export interface VendorProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  images: { id: string; url: string; altText: string | null; position: number }[];
  variants: VendorProductVariant[];
  category: { id: string; name: string; slug: string };
}

export interface OrderItemView {
  id: string;
  productId: string;
  productVariantId: string;
  storeId: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  order?: { orderNumber: string; createdAt: string; paymentMethod: string; paymentStatus: string };
}

export interface OrderTimelineEntry {
  orderItemId: string;
  productName: string;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  timeline: { status: string; note: string | null; at: string }[];
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  placedAt: string;
  createdAt: string;
  items: OrderItemView[];
  address?: Address;
}

export interface TransactionView {
  id: string;
  provider: "COD" | "MOCK";
  type: "PAYMENT" | "REFUND";
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  amount: number;
  currency: string;
  providerRef: string | null;
  failureReason: string | null;
  createdAt: string;
}

// ---- ADMIN --------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  vendorProfile?: { status: string } | null;
}

export interface AdminVendor {
  id: string;
  businessName: string;
  businessEmail: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  approvedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; isActive: boolean };
  store: { id: string; name: string; slug: string; isActive: boolean } | null;
}

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  vendorProfile: { id: string; status: string; businessName: string };
  _count: { products: number };
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  store: { id: string; name: string; slug: string };
  category: { name: string; slug: string };
  images: { url: string }[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  parent: { id: string; name: string; slug: string } | null;
  _count: { products: number; children: number };
}

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  currency: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  items: { id: string; storeId: string; productNameSnapshot: string; status: string }[];
}

export interface AdminReviewForModeration {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; slug: string };
}

export interface AdminReviewReport {
  id: string;
  reason: string;
  details: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter: { id: string; name: string; email: string };
  review: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    status: string;
    user: { name: string };
    product: { id: string; name: string; slug: string };
  };
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminFlashSale {
  id: string;
  name: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  products: { product: { id: string; name: string; slug: string } }[];
}

export interface AdminBanner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  placement: "HOMEPAGE_HERO" | "HOMEPAGE_SECONDARY" | "CATEGORY_TOP";
  displayOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AdminFeaturedProduct {
  id: string;
  productId: string;
  displayOrder: number;
  product: { id: string; name: string; slug: string; basePrice: number; currency: string; status: string; images: { url: string }[] };
}

export interface HomepageFlashSale {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  endsAt: string;
  products: {
    product: {
      id: string;
      name: string;
      slug: string;
      basePrice: number;
      currency: string;
      images: { url: string }[];
    };
  }[];
}

export interface HomepageData {
  banners: AdminBanner[];
  flashSale: HomepageFlashSale | null;
  featured: AdminFeaturedProduct[];
  newArrivals: ProductListItem[];
}

export interface PlatformOverview {
  users: { total: number; customers: number; vendors: number; admins: number };
  vendors: { pendingApproval: number };
  stores: { total: number; active: number };
  products: { total: number; active: number };
  orders: { total: number };
  reviews: { total: number; pendingModeration: number };
  reports: { pendingTriage: number };
  promotions: { active: number };
}

export interface RevenueOverview {
  grossRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  windowDays: number;
  series: { date: string; revenue: number }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type NotificationType = "ORDER" | "ACCOUNT" | "VENDOR" | "ADMIN" | "STOCK" | "PROMOTION";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}


/** Formats an integer amount in the smallest currency unit (e.g. paisa) as
 * a human-readable price string, e.g. 250000 -> "৳2,500.00" for BDT. */
export function formatPrice(amount: number, currency: string): string {
  const major = amount / 100;
  const symbol = currency === "BDT" ? "৳" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
