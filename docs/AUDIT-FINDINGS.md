# Sellio — Audit Findings & Remediation Tracker

Point-in-time security/correctness audit (2026-06-24, 13-agent exploration). Full architecture context in [`ARCHITECTURE.md`](ARCHITECTURE.md) §10. This file tracks **status + the concrete fix** for each item.

Legend: ✅ fixed · 🔧 recommended fix below · ⚠️ needs a design decision before fixing.

---

## ✅ Fixed (2026-09-28)

Re-audit + remediation pass (2 agents, backend + frontends/deploy). Backend `tsc`, all three frontends `tsc` and `next build` clean.

| # | Item | Fix |
|---|---|---|
| **NEW-1 [CRITICAL]** | Super-admin `GET /super/tenants`, `/:id`, `/export`, create/suspend/resume/tariff/trial returned **full `Tenant` rows incl. `botToken`, `paymeKey`, `clickSecretKey`, `clickMerchantUserId`, `manualCardNumber`** to any platform admin. | `super-tenants.service.ts` `publicTenant()` strips those keys (adds `hasBotToken`) on every response path. |
| **F-orderpaid [HIGH]** | `order.paid` (Payme/Click) had no listener → paid orders stayed `PENDING`, no customer DM. | `telegram-orders.listener.ts` `@OnEvent('order.paid')`: `PENDING → CONFIRMED` + `OrderEvent`, `order.status_changed` + `user.order.status_changed`, customer DM via the store bot (mirrors the manual `paycfm:approve` path). Non-PENDING orders are left untouched. |
| **F6 [HIGH]** | `NotificationsGateway` (`/admin`) had one global room → every store admin saw every tenant's orders/events. Also `cors.origin: true`. | Per-tenant rooms `admin-live:<tenantId>` / `admin-live:platform`; admin re-read from DB on connect (inactive rejected); each event resolves its tenant (order/ticket lookup, `user.event.tenantId`). CORS from `common/helpers/cors-origins.ts`. |
| **WebApp `/user` socket [HIGH]** | `authenticate(initData)` used the **global** bot token → tenant-store customers never joined `user:<id>`. | Client sends `auth.shop`; gateway resolves via `TenantScopeService` and verifies with the store's bot token. `webapp/src/hooks/use-realtime.ts` also invalidates `*-summary` keys. |
| **Payme tenant binding [HIGH]** | `Perform/Cancel/CheckTransaction` looked up the tx globally → merchant A could act on merchant B's tx; Prisma errors (string `code`) were returned as JSON-RPC errors; `===` key compare. | `findTx(tenantId, id)` requires `tx.tenantId === tenantId`; only numeric `code` errors are forwarded; `timingSafeEqual`. |
| **admin-settings [HIGH]** | Any store ADMIN could `PATCH /admin/settings` and overwrite the **platform-wide** `business` row (min order / currency for every tenant). | Tenant admins get 404; only platform (`tenantId=null`) admins may write. |
| **enhance-image SSRF [HIGH]** | `fetch(dto.imageUrl)` with no allow-list, and before the quota check. | Quota first; URL must be our `/uploads/` (PUBLIC_UPLOADS_URL/APP_URL/WEBAPP_URL host) or `api.telegram.org/file/`; `redirect: 'error'`, 15 s timeout. |
| **Telegram order buttons [HIGH]** | `handleCallback` ignored `ctx.from` and had no status guard → double "cancel" restored stock twice. | Actor must be `Tenant.ownerTelegramId` for tenant orders; no-op on same/terminal status. |
| **Env validation [HIGH]** | Empty `JWT_*_SECRET`/`DATABASE_URL`/`TELEGRAM_WEBHOOK_SECRET` passed `@IsString()` → 500 on first login. | `@IsNotEmpty()` on those four. |
| **F3 (remaining) [MEDIUM]** | `replaceRelatedRules` accepted arbitrary product ids (cross-tenant read via related-products; FK 500 on bogus id); cross-tenant checks returned 403. | Targets filtered to `product.tenantId === tenantId`; 403 → 404 in `admin-related.module.ts`. |
| **Cart wipe [MEDIUM]** | Placing an order deleted the user's cart rows for **all** tenants. | Deletes only the ordered `cartItem.id`s. |
| **Promo refund [MEDIUM]** | Cancel (user or admin) never released the promo usage. | `PromoCodeUsage` row deleted + `usageCount` decremented inside the cancel transaction. |
| **Tenant suspend cache [MEDIUM]** | `TenantScopeService` cache never invalidated on suspend/resume/delete/bulk → suspended stores kept working until restart. | `invalidate(slug)` on every status change. |
| **Recommendation button [MEDIUM]** | Opened bare `WEBAPP_URL` (legacy null-tenant catalog). | Appends `?shop=<slug>`. |
| **Query-string booleans [MEDIUM]** | `@Type(() => Boolean)` → `'false'` became `true` (`hasOrders`, `excludeBlocked` broadcast preview; `featuredOnly`). | `@Transform` string→bool. |
| **`sendBeacon` analytics [MEDIUM]** | Beacon body carried `initData`, but the guard reads it only from the header → every page-hide flush 401'd. | `fetch(..., { keepalive: true })` with the same headers as `api()`. |
| **Admin/superadmin re-login on reload [MEDIUM]** | 401 on `/auth/me` skipped the refresh (`path.includes('/auth/')`). | Only `/auth/login|refresh|telegram|verify-2fa|logout` skip refresh. |
| **CORS / trust proxy [LOW]** | localhost/tunnel origins allowed in prod; no `trust proxy`; `allowedHeaders` lacked `Authorization`/`X-Tenant-Slug`. | `app.set('trust proxy', 1)`; dev origins only when `NODE_ENV !== 'production'`; headers added. |
| **HttpExceptionFilter [LOW]** | Unhandled errors returned `exception.message` (Prisma internals). | Generic message in production, logged server-side. |
| Misc [LOW] | `super-team` self-deactivate threw `Error` (500); tenant webhook swallowed errors silently; seeds shipped default passwords; landing referenced expired `lh3.googleusercontent.com` fallbacks; webapp dev had no `/socket.io` rewrite; obsolete `X-Frame-Options: ALLOW-FROM`. | `BadRequestException`; `logger.warn`; seeds throw in production without `*_SEED_PASSWORD`; fallbacks removed (local `slide*.jpg` are the real src); rewrite added; header removed. |

**Still open (deliberately not blind-patched):** F-throttle (needs load test), F1 `admin/admins` (product decision: remove or scope), static per-tenant webhook secret, `tenant-bot.service` boot-time null-tenant backfill, `Tenant.totalRevenue/totalOrders` never written (super-admin KPIs read 0), AI `costUsd` always 0, `viewCount` write on GET, `WeeklyStat`/`WEEKLY_AGGREGATION_CRON` dead but required, Click `sign_time` freshness, `clickServiceId` not unique.

---

## ✅ Fixed (2026-06-24)

### F2 — super-admin team privilege escalation `[CRITICAL]`
`super-admin/super-team.controller.ts`: `update` / `reset-password` / `deactivate` / `activate` had **no `@PlatformRoles`**, and `PlatformRolesGuard` returns `true` when `required.length === 0` — so *any* authenticated platform admin (SUPPORT, SALES, …) could promote themselves to `OWNER` or reset the owner's password. The existing `create` decorator (`@PlatformRoles()` with **no args**) was *also* allow-all for the same reason — its "OWNER only" comment was wrong.

**Fix applied:** all five mutations now carry `@PlatformRoles(PlatformRole.OWNER)`, and a comment documents the empty-args footgun. `list`/`get` remain readable by any authenticated platform admin (intentional). Backend type-checks clean.

> Root cause worth remembering: **`@PlatformRoles()` with no arguments = allow-all**, not "owner-only". Always pass the role.

---

## ⚠️ Needs a design decision (do NOT blind-patch)

### F-throttle — rate limiting is dead, but enabling it naively will 429 the whole platform `[HIGH]`
`ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])` is registered and `@Throttle()` decorators sit on `public/seller.controller.ts`, but **no `ThrottlerGuard` is registered as `APP_GUARD`**, so all of it is inert.

**Why I did not just turn it on:** `main.ts` never calls `app.set('trust proxy', …)`. Behind Nginx, `req.ip` is the proxy address (same for every request), so a global guard at `120/min` would throttle the **entire platform on one shared IP** — an instant outage — and would also throttle Telegram/Payme/Click webhooks.

**Safe fix (apply + validate in staging):**
1. In `main.ts`, after `NestFactory.create`: `app.set('trust proxy', 1)` (exactly the number of proxy hops; Nginx = 1). Verify `req.ip` then reflects the real client IP via `X-Forwarded-For`.
2. Register the guard in `app.module.ts`:
   ```ts
   import { APP_GUARD } from '@nestjs/core';
   import { ThrottlerGuard } from '@nestjs/throttler';
   // ...
   providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
   ```
3. `@SkipThrottle()` on machine-to-machine controllers so providers/bots are never throttled: `payments.controller.ts` (Payme/Click webhooks), `telegram-bot/*webhook.controller.ts`, `health`, and the Socket.IO handshake path.
4. Load-test signup + login under the real Nginx config before deploy. Consider a higher global `limit` and rely on the per-endpoint `@Throttle()` for the sensitive routes.

### F1 — `admin/admins` is un-scoped `[CRITICAL, latent]`
`admin/admin-admins.module.ts` `list/create/update/delete` carry no `tenantId`. Guarded by `@Roles(SUPERADMIN)`; in the multi-tenant model store-admins are `ADMIN`/`CREATOR`/`MODERATOR` and store teams are managed via `/admin/store/team`, so this is only reachable by a platform-level `SUPERADMIN`. **Decision needed:** is this legacy global-admin manager still used? If not, **remove the module**. If yes, scope every query by the caller's `tenantId` (and forbid `SUPERADMIN` role assignment by tenants).

### F-orderpaid — online payment never confirms the order `[HIGH, product impact]`
`order.paid` is emitted by Payme/Click but has **no `@OnEvent('order.paid')` listener**. Paid orders stay `PENDING`: no auto-`CONFIRMED`, no customer "payment received" DM, no `Tenant.totalRevenue`/`totalOrders` rollup. **Decision needed** (product behavior): should a paid online order auto-advance to `CONFIRMED`, or to a new `PAID`-but-unconfirmed state the seller still approves? Once decided, add a listener mirroring the manual card-transfer approval path (`telegram-payments.listener` / the `paycfm:approve` handler) — set status + `OrderEvent`, DM the customer, and update revenue counters, all in one transaction.

---

## 🔧 Recommended fixes (clear direction, scope each carefully)

### Cross-tenant isolation (the dominant risk class)
- **F3 — `admin/admin-related`**: `RelatedRule` has no `tenantId` column. Add one (migration) + scope all CRUD by tenant, or constrain rules to products the caller's tenant owns.
- **F4 — `admin/admin-broadcast`**: filter the recipient query by `tenantId` and send via the **tenant** bot, not the global one; honor `TenantBlockedUser` in `excludeBlocked`.
- **F5 — `admin/admin-settings` + `admin/admin-support`**: make settings rows tenant-scoped (composite key or `tenantId` column); use `SupportTicket.tenantId` for **access control**, not just reply routing.
- **F6 — `NotificationsGateway` (`/admin`)**: join each admin to a **per-tenant room** (`admin-live:<tenantId>`) and emit to that room only.
- **F7 — global orders channel**: post order cards to the **tenant's own** channel, and authorize the status-button `callback_query` actor against the order's tenant.

### Payments & auth hardening
- **Payme tenant binding**: thread the `:tenantId` through `Check/Perform/Cancel` and require the resolved transaction's `tenantId` to match. Use constant-time secret comparison; add Click `sign_time` freshness.
- **Webhook secret**: derive/store a per-tenant secret, or at minimum verify the update's bot id matches `:tenantId`.
- **Deactivated store-admins**: revoke their `RefreshToken`s on deactivate (mirror the super realm).
- **`NODE_ENV` dev bypass**: gate the dev login on an explicit `ENABLE_DEV_AUTH=true` flag, not merely `NODE_ENV !== 'production'`.
- **`HttpExceptionFilter`**: return a generic message for unhandled 500s; log the detail server-side only.
- **`enhance-image` SSRF**: allow-list the image host (own `/uploads` + Telegram CDN).
- **Tokens in `localStorage`**: consider moving the super-admin access token to an httpOnly cookie + CSRF, given it's a platform-owner credential.

### Correctness & data integrity
- **WebApp `/user` socket** (`WebAppNotificationsGateway`): pass the tenant bot token into `authenticate(initData)` so per-tenant customers actually get personal events. *(High user-facing impact, low blast radius — good early fix.)*
- **Promo**: use the existing `applyOnUsage` helper, make evaluate+increment atomic (unique constraint on `(promoCodeId, userId)` or a transactional check), and refund the allotment on cancel.
- **Order status**: add a transition whitelist; move stock side-effects to the correct edges.
- **AI cost**: compute `costUsd`/`costUzs` from token/image counts × model price; make quota-check + insert atomic.
- **`viewCount`**: debounce or move to the analytics pipeline; don't UPDATE on every GET.

### Cleanups (low risk)
- Remove dead `WeeklyStat` + `WEEKLY_AGGREGATION_CRON` (or implement it) — and drop the now-unneeded required env var.
- Reconcile the dashboard `TARIFF_PRICE` tables with `TariffConfig`; remove fake KPI deltas / `churnRate: 0` placeholders.
- Fix the support-badge query-key mismatch (`['support','open-count']` vs `['support-tickets']`).
- GC orphaned upload webp files on image delete.
- Fix role-model drift in admin `types.ts`; fix mojibake strings; reconcile infra host/repo drift in `deploy/`.

---

*Re-run the exploration after a remediation pass to confirm closure. The cross-tenant items (F3–F7) and the WebApp-socket token bug are the highest value-to-risk fixes to tackle first.*
