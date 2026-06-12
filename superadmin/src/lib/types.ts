export type PlatformRole = 'OWNER' | 'DEVOPS' | 'FINANCE' | 'SALES' | 'SUPPORT';

export interface PlatformAdminDto {
  id: string;
  email: string;
  fullName: string;
  role: PlatformRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

export type TariffPlan = 'FREE' | 'STANDARD' | 'PRO' | 'PREMIUM';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING_PAYMENT';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type AIOperation =
  | 'AUTO_FILL_TEXT'
  | 'IMAGE_GENERATE'
  | 'IMAGE_ENHANCE'
  | 'IMAGE_BG_REMOVE'
  | 'TRANSLATE'
  | 'CHAT';

export interface TenantDto {
  id: string;
  slug: string;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  tariffPlan: TariffPlan;
  tariffStartedAt: string;
  tariffExpiresAt: string | null;
  isOnTrial: boolean;
  trialEndsAt: string | null;
  status: TenantStatus;
  suspendedReason: string | null;
  logoUrl: string | null;
  customDomain: string | null;
  isWhiteLabel: boolean;
  botUsername: string | null;
  lastActivityAt: string;
  totalRevenue: string;
  totalOrders: number;
  productsCount: number;
  storageMb: number;
  createdAt: string;
}

export interface TenantListResponse {
  items: TenantDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PlatformKpi {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  mrr: number;
  arr: number;
  newThisMonth: number;
  churnRate: number;
  aiSpendUsd: number;
  aiSpendUzs: number;
  storageGb: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface TariffDistribution {
  plan: TariffPlan;
  count: number;
  mrr: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  newSubs: number;
}

export interface ActivityEvent {
  id: string;
  type:
    | 'tenant_signup'
    | 'tariff_upgrade'
    | 'payment_success'
    | 'payment_failed'
    | 'tenant_suspended'
    | 'support_ticket';
  tenantName: string | null;
  tenantId: string | null;
  description: string;
  amount?: number;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: PlatformAdminDto;
  requires2FA?: boolean;
  tempToken?: string;
}

// ─── Audit ────────────────────────────────────────────────
export interface AuditLogDto {
  id: string;
  adminId: string;
  admin: { id: string; fullName: string; email: string; role: PlatformRole };
  action: string;
  targetType: string | null;
  targetId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditLogDto[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Tariff Config ────────────────────────────────────────
export interface TariffConfigDto {
  id: string;
  plan: TariffPlan;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyDiscount: number;
  maxCategories: number;
  maxProducts: number;
  maxBanners: number;
  maxImagesPerProduct: number;
  maxOptionsPerProduct: number;
  aiImagesPerMonth: number;
  aiAutoFillPerMonth: number;
  features: Record<string, unknown>;
  badge: string | null;
  description: string | null;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Subscriptions ────────────────────────────────────────
export interface SubscriptionDto {
  id: string;
  tenantId: string;
  tenant: {
    id: string;
    shopName: string;
    ownerEmail: string;
    status: TenantStatus;
    logoUrl: string | null;
  };
  plan: TariffPlan;
  amount: string;
  currency: string;
  startsAt: string;
  endsAt: string;
  status: SubscriptionStatus;
  paymentMethod: string | null;
  cancelledAt: string | null;
  autoRenew: boolean;
  createdAt: string;
}

export interface SubscriptionsSummary {
  active: number;
  expiringSoon: number;
  pastDue: number;
  totalMrr: number;
}

export interface SubscriptionListResponse {
  items: SubscriptionDto[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Billing / Invoices ───────────────────────────────────
export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenant: {
    id: string;
    shopName: string;
    ownerEmail: string;
    logoUrl: string | null;
  };
  amount: string;
  currency: string;
  status: InvoiceStatus;
  paymentProvider: string | null;
  providerTxId: string | null;
  paidAt: string | null;
  dueDate: string;
  description: string | null;
  createdAt: string;
}

export interface BillingSummary {
  paid: number;
  pending: number;
  failed: number;
  totalPaidMtd: number;
  totalPending: number;
}

export interface InvoiceListResponse {
  items: InvoiceDto[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── AI ───────────────────────────────────────────────────
export interface AIOverview {
  mtd: {
    costUsd: number;
    costUzs: number;
    totalCalls: number;
    totalImages: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  };
  today: {
    costUsd: number;
    costUzs: number;
    totalCalls: number;
  };
  byOperation: Array<{ operation: AIOperation; costUsd: number; calls: number }>;
  byModel: Array<{ model: string; costUsd: number; calls: number }>;
}

export interface AITopConsumer {
  tenant: { id: string; shopName: string; tariffPlan: TariffPlan; logoUrl: string | null } | null;
  tenantId: string;
  costUsd: number;
  costUzs: number;
  calls: number;
}

export interface AIDailyPoint {
  date: string;
  costUsd: number;
  costUzs: number;
  calls: number;
}

export interface AIUsageItem {
  id: string;
  tenantId: string;
  tenant: { id: string; shopName: string; logoUrl: string | null } | null;
  operation: AIOperation;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  imagesCount: number | null;
  costUsd: string;
  costUzs: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface AIUsageListResponse {
  items: AIUsageItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Settings ─────────────────────────────────────────────
export interface PlatformSetting {
  key: string;
  value: unknown;
  category: string;
  updatedBy: string | null;
  updatedAt: string;
}

// ─── Analytics ────────────────────────────────────────────
export interface FunnelStep {
  step: string;
  label: string;
  count: number;
}

export interface CohortBucket {
  month: string;
  total: number;
  active: number;
  paying: number;
  revenue: number;
}

export interface GeoPoint {
  region: string;
  count: number;
  revenue: number;
}

// ─── Infrastructure ───────────────────────────────────────
export interface ServerHealth {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: { os: number; process: number };
  memory: {
    totalGb: number;
    freeGb: number;
    usedGb: number;
    usedPct: number;
    processRssMb: number;
    processHeapMb: number;
  };
  cpu: {
    cores: number;
    model: string;
    speed: number;
    loadAvg: number[];
    userMs: number;
    systemMs: number;
  };
}

export interface DbStats {
  tables: Array<{ table: string; count: number }>;
  totalSize: string;
  totalBytes: number;
  sizeMb: number;
}

export interface JobsStats {
  recommendations: { pending: number; sent: number; failed: number };
  broadcasts: Array<{
    id: string;
    status: string;
    totalCount: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
  }>;
}

// ─── Support ──────────────────────────────────────────────
export interface SupportTicketDto {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null;
  };
  responses: Array<{ id: string }>;
}

export interface SupportTicketListResponse {
  items: SupportTicketDto[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Broadcasts ───────────────────────────────────────────
export interface BroadcastDto {
  id: string;
  messageUz: string;
  messageRu: string | null;
  filters: unknown;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdById: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface BroadcastListResponse {
  items: BroadcastDto[];
  total: number;
  page: number;
  pageSize: number;
}
