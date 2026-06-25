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
export type LoginMode = 'owner' | 'creator' | 'moderator';
export const apiTelegramLogin = (initData: string, mode?: LoginMode) =>
  api<{ admin: AdminDto; accessToken: string }>('/admin/auth/telegram', {
    method: 'POST',
    body: mode ? { initData, mode } : { initData },
  });

// ───── Multi-store (bir egada bir nechta do'kon) ─────
export interface StoreBrief {
  id: string;
  shopName: string;
  slug: string;
  tariffPlan: string;
  logoUrl: string | null;
  isCurrent: boolean;
  /** Pulli tarif tugashiga necha kun qolgani (FREE da null). Manfiy = muddati o'tgan. */
  tariffDaysLeft?: number | null;
}
export interface MyStores {
  stores: StoreBrief[];
  current: string | null;
  canAdd: boolean;
  allowed: number;
}
export interface NewStoreInput {
  shopName: string;
  businessType?: string;
  logoUrl?: string;
  botToken?: string;
}
export const apiMyStores = () => api<MyStores>('/admin/store/my-stores');
export const apiCreateStore = (data: NewStoreInput) =>
  api<{ ok: boolean; tenantId: string }>('/admin/store/new', { method: 'POST', body: data });
export const apiSwitchStore = (tenantId: string) =>
  api<{ admin: AdminDto; accessToken: string }>('/admin/auth/switch-store', {
    method: 'POST',
    body: { tenantId },
  });

// ───── Jamoa (do'kon xodimlari) ─────
export type StoreRole = 'SUPERADMIN' | 'ADMIN' | 'CREATOR' | 'MODERATOR' | 'MANAGER';
export interface TeamMember {
  id: string;
  fullName: string;
  role: StoreRole;
  telegramId: string | null;
  photoUrl: string | null;
  isActive: boolean;
  isOwner: boolean;
  isSelf: boolean;
}
export interface MemberLookup {
  found: boolean;
  fullName: string | null;
  username: string | null;
  photoUrl: string | null;
}
export const apiTeam = () => api<TeamMember[]>('/admin/store/team');
export const apiLookupMember = (telegramId: string) =>
  api<MemberLookup>(`/admin/store/team/lookup/${telegramId}`);
export const apiAddMember = (data: {
  telegramId: string;
  fullName: string;
  role: 'CREATOR' | 'MODERATOR';
  photoUrl?: string | null;
}) => api<{ ok: boolean }>('/admin/store/team', { method: 'POST', body: data });
export const apiUpdateMemberRole = (id: string, role: 'CREATOR' | 'MODERATOR') =>
  api<{ ok: boolean }>(`/admin/store/team/${id}`, { method: 'PUT', body: { role } });
export const apiRemoveMember = (id: string) =>
  api<{ ok: boolean }>(`/admin/store/team/${id}`, { method: 'DELETE' });

// Seller onboarding (Telegram Mini App)
export interface BusinessTypeOption {
  value: string;
  label: string;
}
export interface SellerProfile {
  registered: boolean;
  tenant?: {
    id: string;
    slug: string;
    shopName: string;
    ownerName: string;
    ownerPhone: string | null;
    businessType: string | null;
    logoUrl: string | null;
  };
}
export interface TariffOption {
  value: string;
  label: string;
  priceMonthly: number;
  priceYearly: number;
  yearlyDiscount: number;
  tagline: string;
  popular?: boolean;
  trialDays: number;
  features: string[];
}
export interface BotCheckResult {
  ok: boolean;
  username?: string;
  firstName?: string;
  error?: string;
}
export interface PaymentInfo {
  cards: { type: string; number: string }[];
  holder: string;
  channelUrl: string;
  confirmNote: string;
}
export const apiSellerBusinessTypes = () =>
  api<BusinessTypeOption[]>('/public/seller/business-types');
export const apiSellerTariffs = () => api<TariffOption[]>('/public/seller/tariffs');
export const apiSellerPaymentInfo = () => api<PaymentInfo>('/public/seller/payment-info');
export const apiSellerValidateBot = (botToken: string) =>
  api<BotCheckResult>('/public/seller/validate-bot', { method: 'POST', body: { botToken } });
export const apiSellerMe = (initData: string) =>
  api<SellerProfile>('/public/seller/me', { method: 'POST', body: { initData } });
export const apiSellerOnboard = (body: {
  initData: string;
  shopName: string;
  ownerName: string;
  ownerPhone: string;
  businessType: string;
  tariffPlan: string;
  logoUrl?: string;
  botToken?: string;
  ref?: string;
}) => api<SellerProfile>('/public/seller/onboard', { method: 'POST', body });
export const apiSellerUploadLogo = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api<{ url: string; thumbUrl: string }>('/public/seller/logo', {
    method: 'POST',
    formData: fd,
  });
};
// Joriy admin do'koni (panel ichidan boshqarish)
export interface TariffLimits {
  maxCategories: number;
  maxProducts: number;
  maxBanners: number;
  maxImagesPerProduct: number;
  maxOptionsPerProduct: number;
  aiImageEnhance: number;
  aiAutofill: number;
  analytics: boolean;
  onlinePayment: boolean;
  branding: boolean;
  prioritySupport: boolean;
  maxStores: number;
  maxModerators: number;
  maxCreators: number;
}
export interface MyStore {
  tenant: null | {
    id: string;
    shopName: string;
    slug: string;
    businessType: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    backgroundColor: string | null;
    backgroundImageUrl: string | null;
    tariffPlan: string;
    pendingTariff: string | null;
    botUsername: string | null;
    botPhotoUrl: string | null;
    hasBotToken: boolean;
    phone: string | null;
    address: string | null;
    workingHours: string | null;
    about: string | null;
    customersCount: number;
    payme: { merchantId: string; hasKey: boolean };
    click: { serviceId: string; merchantId: string; merchantUserId: string; hasSecret: boolean };
    cardPayment: { cardNumber: string; cardHolder: string; channelId: string };
    delivery: { enabled: boolean; fee: number; freeFrom: number | null };
    prepayment: { enabled: boolean; percent: number };
  };
  limits?: TariffLimits;
  usage?: { products: number; categories: number; banners: number };
}
export const apiMyStore = () => api<MyStore>('/admin/store');
export interface PaymentsInput {
  paymeMerchantId?: string;
  paymeKey?: string;
  clickServiceId?: string;
  clickMerchantId?: string;
  clickMerchantUserId?: string;
  clickSecretKey?: string;
}
export const apiUpdateStorePayments = (data: PaymentsInput) =>
  api<{ ok: boolean }>('/admin/store/payments', { method: 'PUT', body: data });
export const apiUpdateStoreBranding = (data: {
  primaryColor?: string;
  logoUrl?: string;
  // Bo'sh string '' yuborilsa — o'sha maydon standartga qaytadi (null)
  backgroundColor?: string;
  backgroundImageUrl?: string;
}) => api<{ ok: boolean }>('/admin/store/branding', { method: 'PUT', body: data });
export const apiSendSupport = (message: string) =>
  api<{ ok: boolean; priority: boolean }>('/admin/store/support', { method: 'POST', body: { message } });
export interface CardPaymentInput {
  cardNumber?: string;
  cardHolder?: string;
  channelId?: string;
}
export const apiUpdateStoreCardPayment = (data: CardPaymentInput) =>
  api<{ ok: boolean }>('/admin/store/card-payment', { method: 'PUT', body: data });
export interface DeliveryInput {
  enabled?: boolean;
  fee?: number;
  freeFrom?: number | null;
}
export const apiUpdateStoreDelivery = (data: DeliveryInput) =>
  api<{ ok: boolean }>('/admin/store/delivery', { method: 'PUT', body: data });
export interface PrepaymentInput {
  enabled?: boolean;
  percent?: number;
}
export const apiUpdateStorePrepayment = (data: PrepaymentInput) =>
  api<{ ok: boolean }>('/admin/store/prepayment', { method: 'PUT', body: data });

// ───── Referal tizimi ─────
export interface ReferralEarning {
  id: string;
  shopName: string;
  plan: string;
  amount: number;
  percent: number;
  createdAt: string;
}
export interface ReferralWithdrawal {
  id: string;
  amount: number;
  status: string;
  cardNumber: string;
  createdAt: string;
  processedAt: string | null;
}
export interface ReferralSummary {
  code: string;
  link: string;
  balance: number;
  earnedTotal: number;
  referralsCount: number;
  commissionPercent: number;
  minWithdrawal: number;
  canWithdraw: boolean;
  hasPendingWithdrawal: boolean;
  earnings: ReferralEarning[];
  withdrawals: ReferralWithdrawal[];
}
export const apiReferral = () => api<ReferralSummary>('/admin/referral');
export const apiReferralWithdraw = (data: { cardNumber: string; cardHolder?: string }) =>
  api<{ ok: boolean; amount: number }>('/admin/referral/withdraw', { method: 'POST', body: data });

// ───── Kanal e'lonlari (channel posts) ─────
export interface ChannelConfig {
  channelId: string;
  botUsername: string | null;
  hasBot: boolean;
  maxScheduled: number;
}
export type ChannelPostStatus = 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
export interface ChannelPost {
  id: string;
  text: string;
  imageUrl: string | null;
  videoUrl: string | null;
  buyButton: boolean;
  buttonText: string | null;
  scheduledAt: string;
  status: ChannelPostStatus;
  publishedAt: string | null;
  error: string | null;
  createdAt: string;
}
export interface CreateChannelPostInput {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  buyButton?: boolean;
  buttonText?: string;
  scheduledAt: string;
}
export interface ChannelInfo {
  connected: boolean;
  reason?: string;
  id?: string;
  title?: string;
  username?: string | null;
  type?: string;
  description?: string | null;
  subscriberCount?: number | null;
  isAdmin?: boolean;
  photoDataUrl?: string | null;
}
export const apiChannelConfig = () => api<ChannelConfig>('/admin/channel-posts/config');
export const apiChannelInfo = () => api<ChannelInfo>('/admin/channel-posts/channel-info');
export const apiSetChannel = (channelId: string) =>
  api<{ ok: boolean }>('/admin/channel-posts/config', { method: 'PUT', body: { channelId } });
export const apiListChannelPosts = () => api<ChannelPost[]>('/admin/channel-posts');
export const apiCreateChannelPost = (data: CreateChannelPostInput) =>
  api<ChannelPost>('/admin/channel-posts', { method: 'POST', body: data });
export const apiDeleteChannelPost = (id: string) =>
  api<{ ok: boolean }>(`/admin/channel-posts/${id}`, { method: 'DELETE' });
export interface StoreInfoInput {
  name?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  about?: string;
}
export const apiUpdateStoreInfo = (data: StoreInfoInput) =>
  api<{ ok: boolean }>('/admin/store/info', { method: 'PUT', body: data });
export const apiUpgradeTariff = (tariffPlan: string, billingPeriod: 'monthly' | 'yearly' = 'monthly') =>
  api<{ ok: boolean; payment: PaymentInfo }>('/admin/store/upgrade', {
    method: 'POST',
    body: { tariffPlan, billingPeriod },
  });
export const apiUploadUpgradeReceipt = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api<{ ok: boolean }>('/admin/store/upgrade/receipt', { method: 'POST', formData: fd });
};
export const apiSetStoreBot = (botToken: string) =>
  api<{ ok: boolean; username?: string }>('/admin/store/bot', { method: 'PUT', body: { botToken } });
export const apiRemoveStoreBot = () =>
  api<{ ok: boolean }>('/admin/store/bot', { method: 'DELETE' });

export const apiSellerSubmitPayment = (initData: string, file: File) => {
  const fd = new FormData();
  fd.append('initData', initData);
  fd.append('file', file);
  return api<{ ok: boolean }>('/public/seller/payment-request', {
    method: 'POST',
    formData: fd,
  });
};

// AI (GPT)
export const apiAiAutofill = (body: { imageUrl?: string; hint?: string }) =>
  api<{ titleUz: string; titleRu: string; descriptionUz: string; descriptionRu: string }>(
    '/admin/ai/autofill',
    { method: 'POST', body },
  );
export const apiAiEnhanceImage = (imageUrl: string) =>
  api<{ url: string; thumbUrl: string }>('/admin/ai/enhance-image', {
    method: 'POST',
    body: { imageUrl },
  });

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
export const apiSupportOpenCount = () =>
  api<{ count: number }>('/admin/support/tickets/open-count');

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

// Broadcasts
import type { BroadcastFilters, BroadcastItem } from './types';

export const apiListBroadcasts = () => api<BroadcastItem[]>('/admin/broadcasts');
export const apiGetBroadcast = (id: string) => api<BroadcastItem>(`/admin/broadcasts/${id}`);
export const apiBroadcastPreviewCount = (filters: BroadcastFilters) =>
  api<{ count: number }>('/admin/broadcasts/preview-count', { query: filters as Record<string, unknown> });
export const apiCreateBroadcast = (body: {
  messageUz: string;
  messageRu?: string | null;
  filters: BroadcastFilters;
  mediaType?: 'text' | 'photo' | 'video';
  mediaUrl?: string | null;
  link?: string | null;
}) => api<{ id: string; totalCount: number }>('/admin/broadcasts', { method: 'POST', body });

// Uploads
export async function apiUploadImage(file: File): Promise<{ url: string; thumbUrl: string; mediumUrl: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return api('/admin/uploads/image', { method: 'POST', formData: fd });
}
export async function apiUploadVideo(file: File): Promise<{ url: string; size: number }> {
  const fd = new FormData();
  fd.append('file', file);
  return api('/admin/uploads/video', { method: 'POST', formData: fd });
}
