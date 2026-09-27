import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '../admin-auth/jwt.service';
import { PrismaService } from '@/prisma/prisma.service';
import { corsOriginFn } from '@/common/helpers/cors-origins';

/**
 * Har do'kon o'z xonasida: `admin-live:<tenantId>`; platforma (tenantId=null)
 * adminlari `admin-live:platform` da. Ilgari bitta umumiy xona bo'lgani uchun
 * har do'kon admini BARCHA do'konlarning buyurtma/hodisalarini ko'rardi.
 */
const PLATFORM_ROOM = 'admin-live:platform';
const roomFor = (tenantId: string | null | undefined): string =>
  tenantId ? `admin-live:${tenantId}` : PLATFORM_ROOM;

@WebSocketGateway({
  namespace: '/admin',
  cors: { origin: corsOriginFn, credentials: true },
})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;
    const queryToken = client.handshake.query?.token as string | undefined;
    if (queryToken) return queryToken;
    const cookie = client.handshake.headers.cookie ?? '';
    const match = /access_token=([^;]+)/.exec(cookie);
    return match?.[1];
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Socket reject (no token): ${client.id}`);
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verifyAccess(token);
      // Tenant JWT'dan emas, bazadan — token ichidagi qiymatga ishonmaymiz va
      // o'chirilgan admin ulanib qolmasin.
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, tenantId: true, isActive: true },
      });
      if (!admin || !admin.isActive) {
        this.logger.warn(`Socket reject (admin inactive/missing): ${client.id}`);
        client.disconnect(true);
        return;
      }
      client.data.adminId = admin.id;
      client.data.role = payload.role;
      client.data.tenantId = admin.tenantId;
      client.join(roomFor(admin.tenantId));
      this.logger.debug(
        `Admin socket connected: ${client.id} (admin=${admin.id}, tenant=${admin.tenantId ?? 'platform'})`,
      );
      client.emit('connected', { ok: true });
    } catch {
      this.logger.warn(`Socket reject (invalid token): ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Admin socket disconnected: ${client.id}`);
  }

  /** Faqat o'sha do'kon adminlariga (tenantId=null → platforma xonasi). */
  emitToTenant(tenantId: string | null | undefined, event: string, payload: unknown): void {
    this.server?.to(roomFor(tenantId)).emit(event, payload);
  }

  /** Eski API (hammaga) — faqat platforma xonasiga yuboradi. */
  emitToAdmins(event: string, payload: unknown): void {
    this.emitToTenant(null, event, payload);
  }

  private async orderTenant(orderId: string | undefined): Promise<string | null> {
    if (!orderId) return null;
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, select: { tenantId: true } });
    return o?.tenantId ?? null;
  }

  @OnEvent('user.event')
  onUserEvent(payload: { tenantId?: string | null } & Record<string, unknown>): void {
    this.emitToTenant(payload?.tenantId ?? null, 'user-event', payload);
  }

  @OnEvent('order.created')
  async onOrderCreated(payload: { orderId: string }): Promise<void> {
    this.emitToTenant(await this.orderTenant(payload?.orderId), 'order-created', payload);
  }

  @OnEvent('order.status_changed')
  async onOrderStatusChanged(payload: { orderId: string; status: string }): Promise<void> {
    this.emitToTenant(await this.orderTenant(payload?.orderId), 'order-status-changed', payload);
  }

  @OnEvent('support.ticket_created')
  async onSupportTicket(payload: { ticketId: string }): Promise<void> {
    const t = payload?.ticketId
      ? await this.prisma.supportTicket.findUnique({
          where: { id: payload.ticketId },
          select: { tenantId: true },
        })
      : null;
    this.emitToTenant(t?.tenantId ?? null, 'support-new-ticket', payload);
  }
}
