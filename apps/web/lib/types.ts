export interface ProductImage {
  url: string;
  altText?: string | null;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
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
  brand: string | null;
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
  createdAt: string;
  order?: { orderNumber: string; createdAt: string; paymentMethod: string; paymentStatus: string };
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

export interface SearchSuggestions {
  products: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Formats an integer amount in the smallest currency unit (e.g. paisa) as
 * a human-readable price string, e.g. 250000 -> "৳2,500.00" for BDT. */
export function formatPrice(amount: number, currency: string): string {
  const major = amount / 100;
  const symbol = currency === "BDT" ? "৳" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
