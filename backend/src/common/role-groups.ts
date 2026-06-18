import { AdminRole } from '@prisma/client';

/**
 * Rol guruhlari — controllerlardagi @Roles(...) uchun.
 *
 * - BOSS    = do'kon egasi (+ platforma superadmini): hamma narsa, sozlamalar, jamoa, to'lov.
 * - CATALOG = katalog boshqaruvi (mahsulot/kategoriya/banner/promo/kanal e'lon) — Creator ham.
 * - ORDERS  = buyurtmalarni ko'rish/holatini o'zgartirish — barcha xodimlar.
 * - VIEW    = ko'rish (dashboard, statistika, ro'yxatlar) — barcha xodimlar.
 */
export const BOSS_ROLES = [AdminRole.SUPERADMIN, AdminRole.ADMIN] as const;

export const CATALOG_ROLES = [
  AdminRole.SUPERADMIN,
  AdminRole.ADMIN,
  AdminRole.CREATOR,
] as const;

export const ORDERS_ROLES = [
  AdminRole.SUPERADMIN,
  AdminRole.ADMIN,
  AdminRole.MANAGER,
  AdminRole.MODERATOR,
  AdminRole.CREATOR,
] as const;

export const VIEW_ROLES = [
  AdminRole.SUPERADMIN,
  AdminRole.ADMIN,
  AdminRole.CREATOR,
  AdminRole.MANAGER,
  AdminRole.MODERATOR,
] as const;
