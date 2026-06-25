export type AdminRole = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'CREATOR' | 'MODERATOR';

export interface AdminDto {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'CARD_ON_DELIVERY';

export interface AdminProductListItem {
  id: string;
  slug: string;
  titleUz: string;
  titleRu: string;
  brand: string | null;
  basePrice: number;
  oldPrice: number | null;
  discountPct: number | null;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  categoryId: string;
  categoryTitle: string;
  totalStock: number;
  ordersCount: number;
  soldCount: number;
  viewCount: number;
  createdAt: string;
}

export interface AdminProductDetail extends AdminProductListItem {
  sku: string | null;
  descriptionUz: string | null;
  descriptionRu: string | null;
  images: Array<{ id: string; url: string; position: number }>;
  variants: Array<{
    id: string;
    color: string | null;
    size: string | null;
    price: number;
    oldPrice: number | null;
    stock: number;
    sku: string | null;
    imageUrl: string | null;
    isActive: boolean;
  }>;
  specs: Array<{
    id: string;
    labelUz: string;
    labelRu: string;
    valueUz: string;
    valueRu: string;
    position: number;
  }>;
  relatedProducts?: Array<{
    id: string;
    titleUz: string;
    titleRu: string;
    basePrice: number;
    imageUrl: string | null;
  }>;
}

export interface AdminCategoryNode {
  id: string;
  slug: string;
  titleUz: string;
  titleRu: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  parentId: string | null;
  position: number;
  isVisible: boolean;
  productsCount: number;
  children: AdminCategoryNode[];
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  receiverName: string;
  receiverPhone: string;
  address: string;
  paymentMethod: PaymentMethod;
  itemsCount: number;
  previewImages: string[];
  user: { id: string; username: string | null; firstName: string | null; telegramId: string };
  createdAt: string;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  receiverName: string;
  receiverPhone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  promoSnapshot: string | null;
  items: Array<{
    id: string;
    productId: string;
    titleUz: string;
    titleRu: string;
    variantLabel: string | null;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  events: Array<{ id: string; status: OrderStatus; comment: string | null; changedBy: string | null; createdAt: string }>;
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListItem {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  phone: string | null;
  language: 'uz' | 'ru';
  isBlocked: boolean;
  ordersCount: number;
  cartCount: number;
  favoritesCount: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  stats: {
    ordersCount: number;
    revenue: number;
    avgOrderValue: number;
    cartCount: number;
    favoritesCount: number;
    eventsCount: number;
  };
}

export interface UserEventItem {
  id: string;
  type: string;
  productId: string | null;
  categoryId: string | null;
  payload: Record<string, unknown> | null;
  product: { id: string; title: string; imageUrl: string | null } | null;
  createdAt: string;
}

export interface InterestsResponse {
  topCategories: Array<{
    categoryId: string;
    titleUz: string;
    titleRu: string;
    score: number;
    views: number;
    cartAdds: number;
    favorites: number;
    orders: number;
  }>;
  topProducts: Array<{ id: string; title: string; imageUrl: string | null; viewCount: number }>;
  cartAbandonment: Array<{ productId: string; titleUz: string; addCount: number }>;
}

export interface StatsOverview {
  today: { orders: number; revenue: number; uniqueVisitors: number; conversion: number };
  delta: { orders: number; revenue: number; uniqueVisitors: number; conversion: number };
  totals: { users: number; activeProducts: number; ordersTotal: number };
}

export interface TimeseriesPoint {
  day: string;
  orders: number;
  revenue: number;
  visitors: number;
}

export interface TopProduct {
  productId: string;
  titleUz: string;
  imageUrl: string | null;
  quantity?: number;
  revenue?: number;
  views?: number;
}

export interface FunnelData {
  visits: number;
  productViews: number;
  cartAdds: number;
  checkouts: number;
  orders: number;
}

export interface PromoCodeView {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  usageCount: number;
  isPublic: boolean;
  isActive: boolean;
  descriptionUz: string | null;
  descriptionRu: string | null;
  createdAt: string;
}

export interface SupportTicketListItem {
  id: string;
  subject: string;
  message: string;
  status: string;
  user: { id: string; username: string | null; firstName: string | null; telegramId: string };
  createdAt: string;
}

export interface BannerView {
  id: string;
  placement: string;
  imageUrlUz: string;
  imageUrlRu: string | null;
  targetType: string;
  targetValue: string | null;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface BroadcastFilters {
  hasOrders?: boolean;
  noOrdersInDays?: number;
  activeInDays?: number;
  language?: 'uz' | 'ru';
  excludeBlocked?: boolean;
}

export interface BroadcastItem {
  id: string;
  messageUz: string;
  messageRu: string | null;
  mediaType?: 'text' | 'photo' | 'video';
  mediaUrl?: string | null;
  filters: BroadcastFilters;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdById: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface RelatedRule {
  id: string;
  sourceProductId: string | null;
  sourceCategoryId: string | null;
  targetProductId: string | null;
  targetCategoryId: string | null;
  position: number;
  isActive: boolean;
  sourceProduct?: { id: string; titleUz: string } | null;
  sourceCategory?: { id: string; titleUz: string } | null;
  targetProduct?: { id: string; titleUz: string } | null;
  targetCategory?: { id: string; titleUz: string } | null;
}
