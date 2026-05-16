import { api } from './api';
import type {
  AdminCategoryNode,
  AdminDto,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProductDetail,
  AdminProductListItem,
  AdminUserDetail,
  AdminUserListItem,
  BannerView,
  CursorPage,
  FunnelData,
  InterestsResponse,
  OrderStatus,
  PromoCodeView,
  RelatedRule,
  StatsOverview,
  SupportTicketListItem,
  TimeseriesPoint,
  TopProduct,
  UserEventItem,
} from './types';

// Auth
export const apiLogin = (email: string, password: string) =>
  api<{ admin: AdminDto; accessToken: string }>('/admin/auth/login', {
    method: 'POST',
    body: { email, password },
  });
export const apiMe = () => api<AdminDto>('/admin/auth/me');
export const apiLogout = () => api<{ ok: boolean }>('/admin/auth/logout', { method: 'POST' });

// Products
export const apiListAdminProducts = (params: { q?: string; categoryId?: string; status?: string; cursor?: string; limit?: number }) =>
  api<CursorPage<AdminProductListItem>>('/admin/products', { query: params });
export const apiGetAdminProduct = (id: string) => api<AdminProductDetail>(`/admin/products/${id}`);
export const apiCreateAdminProduct = (body: unknown) => api<AdminProductDetail>('/admin/products', { method: 'POST', body });
export const apiUpdateAdminProduct = (id: string, body: unknown) =>
  api<AdminProductDetail>(`/admin/products/${id}`, { method: 'PATCH', body });
export const apiDeleteAdminProduct = (id: string) => api(`/admin/products/${id}`, { method: 'DELETE' });

// Categories
export const apiAdminCategoriesTree = () => api<AdminCategoryNode[]>('/admin/categories');
export const apiCreateCategory = (body: unknown) => api('/admin/categories', { method: 'POST', body });
export const apiUpdateCategory = (id: string, body: unknown) =>
  api(`/admin/categories/${id}`, { method: 'PATCH', body });
export const apiDeleteCategory = (id: string) => api(`/admin/categories/${id}`, { method: 'DELETE' });

// Orders
export const apiListAdminOrders = (params: { status?: OrderStatus; q?: string; from?: string; to?: string; cursor?: string; limit?: number }) =>
  api<CursorPage<AdminOrderListItem>>('/admin/orders', { query: params });
export const apiGetAdminOrder = (id: string) => api<AdminOrderDetail>(`/admin/orders/${id}`);
export const apiUpdateOrderStatus = (id: string, status: OrderStatus, comment?: string) =>
  api<AdminOrderDetail>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status, comment } });
export const apiSendOrderMessage = (id: string, text: string) =>
  api(`/admin/orders/${id}/message`, { method: 'POST', body: { text } });

// Users
export const apiListAdminUsers = (params: { q?: string; isBlocked?: boolean; cursor?: string; limit?: number }) =>
  api<CursorPage<AdminUserListItem>>('/admin/users', { query: params });
export const apiGetAdminUser = (id: string) => api<AdminUserDetail>(`/admin/users/${id}`);
export const apiUpdateUser = (id: string, body: { isBlocked?: boolean }) =>
  api(`/admin/users/${id}`, { method: 'PATCH', body });
export const apiUserTimeline = (id: string, params: { cursor?: string; limit?: number; type?: string; from?: string; to?: string }) =>
  api<CursorPage<UserEventItem>>(`/admin/users/${id}/timeline`, { query: params });
export const apiUserInterests = (id: string) => api<InterestsResponse>(`/admin/users/${id}/interests`);
export const apiUserOrders = (id: string, params: { cursor?: string; limit?: number }) =>
  api<CursorPage<{ id: string; orderNumber: string; status: OrderStatus; total: number; itemsCount: number; createdAt: string }>>(
    `/admin/users/${id}/orders`,
    { query: params },
  );

// Stats
export const apiStatsOverview = () => api<StatsOverview>('/admin/stats/overview');
export const apiStatsTimeseries = (from?: string, to?: string) =>
  api<TimeseriesPoint[]>('/admin/stats/timeseries', { query: { from, to } });
export const apiStatsTopProducts = (metric: 'views' | 'sales', from?: string, to?: string, limit = 10) =>
  api<TopProduct[]>('/admin/stats/top-products', { query: { metric, from, to, limit } });
export const apiStatsFunnel = (from?: string, to?: string) =>
  api<FunnelData>('/admin/stats/funnel', { query: { from, to } });
export const apiStatsTopCategories = (from?: string, to?: string) =>
  api<Array<{ categoryId: string; titleUz: string; interactions: number; revenue: number }>>(
    '/admin/stats/top-categories',
    { query: { from, to } },
  );
export const apiStatsCartAbandonment = (from?: string, to?: string) =>
  api<Array<{ productId: string; titleUz: string; abandonedCount: number; imageUrl: string | null }>>(
    '/admin/stats/cart-abandonment',
    { query: { from, to } },
  );

// Promo
export const apiListPromos = (params: { q?: string; cursor?: string; limit?: number }) =>
  api<CursorPage<PromoCodeView>>('/admin/promo-codes', { query: params });
export const apiCreatePromo = (body: unknown) => api<PromoCodeView>('/admin/promo-codes', { method: 'POST', body });
export const apiUpdatePromo = (id: string, body: unknown) =>
  api<PromoCodeView>(`/admin/promo-codes/${id}`, { method: 'PATCH', body });
export const apiDeletePromo = (id: string) => api(`/admin/promo-codes/${id}`, { method: 'DELETE' });

// Support
export const apiListTickets = (params: { status?: string; cursor?: string; limit?: number }) =>
  api<CursorPage<SupportTicketListItem>>('/admin/support/tickets', { query: params });
export const apiGetTicket = (id: string) => api<SupportTicketListItem & { responses: Array<{ id: string; fromAdmin: boolean; message: string; createdAt: string }> }>(`/admin/support/tickets/${id}`);
export const apiRespondTicket = (id: string, message: string) =>
  api(`/admin/support/tickets/${id}/responses`, { method: 'POST', body: { message } });
export const apiUpdateTicketStatus = (id: string, status: string) =>
  api(`/admin/support/tickets/${id}`, { method: 'PATCH', body: { status } });

// Banners
export const apiListBanners = (placement?: string) =>
  api<BannerView[]>('/admin/banners', { query: { placement } });
export const apiCreateBanner = (body: unknown) => api<BannerView>('/admin/banners', { method: 'POST', body });
export const apiUpdateBanner = (id: string, body: unknown) =>
  api<BannerView>(`/admin/banners/${id}`, { method: 'PATCH', body });
export const apiDeleteBanner = (id: string) => api(`/admin/banners/${id}`, { method: 'DELETE' });

// Related rules
export const apiListRelatedRules = (params: { sourceProductId?: string; sourceCategoryId?: string }) =>
  api<RelatedRule[]>('/admin/related-rules', { query: params });
export const apiCreateRelatedRule = (body: unknown) => api<RelatedRule>('/admin/related-rules', { method: 'POST', body });
export const apiDeleteRelatedRule = (id: string) => api(`/admin/related-rules/${id}`, { method: 'DELETE' });

// Settings
export const apiListSettings = () => api<Array<{ key: string; value: Record<string, unknown> }>>('/admin/settings');
export const apiUpsertSetting = (key: string, value: Record<string, unknown>) =>
  api('/admin/settings', { method: 'PATCH', body: { key, value } });

// Admins (superadmin)
export const apiListAdmins = () => api<AdminDto[]>('/admin/admins');
export const apiCreateAdmin = (body: { email: string; password: string; fullName: string; role: string }) =>
  api<AdminDto>('/admin/admins', { method: 'POST', body });
export const apiUpdateAdmin = (id: string, body: unknown) =>
  api<AdminDto>(`/admin/admins/${id}`, { method: 'PATCH', body });
export const apiDeleteAdmin = (id: string) => api(`/admin/admins/${id}`, { method: 'DELETE' });

// Uploads
export async function apiUploadImage(file: File): Promise<{ url: string; thumbUrl: string; mediumUrl: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return api('/admin/uploads/image', { method: 'POST', formData: fd });
}
