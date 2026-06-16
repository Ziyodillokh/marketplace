import { api } from '../api';
import type {
  AppliedPromo,
  BannerView,
  CartSummary,
  CartView,
  CategoryDto,
  CursorPage,
  MeDto,
  OrderDetail,
  OrderListItem,
  OrderStatus,
  PaymentMethod,
  ProductCard,
  ProductDetail,
  PromoView,
  PublicSettings,
} from './types';

// ───── Auth / Users ──────
export const apiAuthVerify = (initData: string) =>
  api<{ ok: true; user: MeDto }>('/auth/telegram', {
    method: 'POST',
    body: { initData },
    skipAuth: true,
  });

export const apiGetMe = () => api<MeDto>('/users/me');
export const apiUpdateMe = (data: Partial<Pick<MeDto, 'phone' | 'firstName' | 'language'>>) =>
  api<MeDto>('/users/me', { method: 'PATCH', body: data });

// ───── Catalog ─────
export const apiListCategories = (params: { onlyRoot?: boolean; parentId?: string } = {}) =>
  api<CategoryDto[]>('/categories', { query: params });

export const apiGetCategoryBySlug = (slug: string) =>
  api<CategoryDto & { children: CategoryDto[] }>(`/categories/by-slug/${encodeURIComponent(slug)}`);

export interface ListProductsQuery {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'bestsellers' | 'discount';
  cursor?: string;
  limit?: number;
  featuredOnly?: boolean;
}

export const apiListProducts = (params: ListProductsQuery = {}) =>
  api<CursorPage<ProductCard>>('/products', { query: params as Record<string, unknown> });

export const apiGetProduct = (id: string) => api<ProductDetail>(`/products/${id}`);
export const apiGetRelated = (id: string) => api<ProductCard[]>(`/products/${id}/related`);

// ───── Banners ─────
export const apiListBanners = (placement = 'home') =>
  api<BannerView[]>('/banners', { query: { placement }, skipAuth: true });

// ───── Cart ─────
export const apiGetCart = () => api<CartView>('/cart');
export const apiGetCartSummary = () => api<CartSummary>('/cart/summary');
export const apiAddToCart = (input: { productId: string; variantId?: string; quantity?: number }) =>
  api('/cart/items', { method: 'POST', body: input });
export const apiUpdateCartQty = (itemId: string, quantity: number) =>
  api(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });
export const apiRemoveCartItem = (itemId: string) =>
  api(`/cart/items/${itemId}`, { method: 'DELETE' });
export const apiClearCart = () => api('/cart', { method: 'DELETE' });

// ───── Favorites ─────
export const apiListFavorites = () => api<ProductCard[]>('/favorites');
export const apiFavoritesSummary = () => api<{ count: number }>('/favorites/summary');
export const apiToggleFavorite = (productId: string) =>
  api<{ isFavorite: boolean }>('/favorites/toggle', { method: 'POST', body: { productId } });
export const apiRemoveFavorite = (productId: string) =>
  api(`/favorites/${productId}`, { method: 'DELETE' });

// ───── Orders ─────
export interface CreateOrderBody {
  receiverName: string;
  receiverPhone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  paymentMethod?: PaymentMethod;
  note?: string;
  promoCode?: string;
}

export const apiCreateOrder = (body: CreateOrderBody) =>
  api<OrderDetail>('/orders', { method: 'POST', body });
export const apiListOrders = (params: { status?: OrderStatus; cursor?: string; limit?: number } = {}) =>
  api<CursorPage<OrderListItem>>('/orders', { query: params });
export const apiOrdersSummary = () => api<{ count: number; activeCount: number }>('/orders/summary');
export const apiGetOrder = (id: string) => api<OrderDetail>(`/orders/${id}`);
export const apiCancelOrder = (id: string) =>
  api<OrderDetail>(`/orders/${id}/cancel`, { method: 'POST' });

// ───── Promo ─────
export const apiPublicPromos = () => api<PromoView[]>('/promo-codes/public');
export const apiApplyPromo = (code: string) =>
  api<AppliedPromo>('/promo-codes/apply', { method: 'POST', body: { code } });

// ───── Support ─────
export const apiCreateTicket = (body: { subject: string; message: string }) =>
  api('/support/tickets', { method: 'POST', body });
export const apiListMyTickets = () => api('/support/tickets/my');

// ───── Settings ─────
export const apiPublicSettings = () => api<PublicSettings>('/settings/public', { skipAuth: true });

// ───── Payments (Payme / Click) ─────
export const apiPaymentCheckout = (orderId: string, provider: 'payme' | 'click') =>
  api<{ url: string }>('/payments/checkout', { query: { orderId, provider } });
