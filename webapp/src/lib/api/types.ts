export type Locale = 'uz' | 'ru';

export interface MeDto {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  phone: string | null;
  language: Locale;
  createdAt: string;
}

export interface CategoryDto {
  id: string;
  slug: string;
  title: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  parentId: string | null;
  position: number;
  childrenCount: number;
  children?: CategoryDto[];
}

export interface ProductCard {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  price: number;
  oldPrice: number | null;
  discountPct: number | null;
  imageUrl: string | null;
  isFavorite: boolean;
  outOfStock: boolean;
}

export interface ProductVariant {
  id: string;
  color: string | null;
  size: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  imageUrl: string | null;
  sku: string | null;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  images: Array<{ id: string; url: string; position: number }>;
  variants: ProductVariant[];
  specs: Array<{ label: string; value: string }>;
  category: { id: string; slug: string; title: string };
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface BannerView {
  id: string;
  imageUrl: string;
  targetType: 'product' | 'category' | 'url' | 'none' | string;
  targetValue: string | null;
  position: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  title: string;
  variantLabel: string | null;
  imageUrl: string | null;
  unitPrice: number;
  oldPrice: number | null;
  quantity: number;
  stock: number;
  lineTotal: number;
}

export interface CartView {
  items: CartItem[];
  summary: { count: number; subtotal: number };
}

export interface CartSummary {
  count: number;
  subtotal: number;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'CARD_ON_DELIVERY';

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  previewImages: string[];
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  receiverName: string;
  receiverPhone: string;
  address: string;
  note: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  promoSnapshot: string | null;
  items: Array<{
    id: string;
    productId: string;
    title: string;
    variantLabel: string | null;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  events: Array<{ status: OrderStatus; comment: string | null; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface PromoView {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  expiresAt: string | null;
  isPublic: boolean;
  descriptionUz: string | null;
  descriptionRu: string | null;
}

export interface AppliedPromo {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  discountAmount: number;
  subtotal: number;
}

export interface PublicSettings {
  store: { name?: string; phone?: string; address?: string; workingHours?: string; about?: string };
  business: { minOrderAmount: number; deliveryFee: number; freeDeliveryThreshold: number; currency: string };
}

export type EventType =
  | 'VIEW_HOME'
  | 'VIEW_CATALOG'
  | 'VIEW_CATEGORY'
  | 'VIEW_PRODUCT'
  | 'VIEW_CART'
  | 'VIEW_FAVORITES'
  | 'VIEW_ORDERS'
  | 'VIEW_ORDER_DETAIL'
  | 'SEARCH_QUERY'
  | 'APPLY_FILTER'
  | 'CART_ADD'
  | 'CART_UPDATE_QTY'
  | 'CART_REMOVE'
  | 'FAVORITE_ADD'
  | 'FAVORITE_REMOVE'
  | 'PROMO_APPLY'
  | 'PROMO_REMOVE'
  | 'CHECKOUT_START'
  | 'ORDER_PLACED'
  | 'ORDER_CANCEL'
  | 'PRODUCT_DURATION'
  | 'BANNER_CLICK';
