import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { OrderStatus, type Admin } from '@prisma/client';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin, Roles, RolesGuard } from '../admin-auth/roles.guard';
import { ORDERS_ROLES } from '@/common/role-groups';
import { AdminOrdersService } from './admin-orders.service';

class ListOrdersDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

class UpdateStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}

class MessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) text!: string;
}

@Controller('admin/orders')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  list(@Query() q: ListOrdersDto, @CurrentAdmin() admin: Admin) {
    return this.orders.list(q, admin.tenantId);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentAdmin() admin: Admin) {
    return this.orders.getById(id, admin.tenantId);
  }

  @Patch(':id/status')
  @Roles(...ORDERS_ROLES)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentAdmin() admin: Admin) {
    return this.orders.updateStatus(id, dto.status, dto.comment, admin.id, admin.tenantId);
  }

  @Post(':id/message')
  @Roles(...ORDERS_ROLES)
  message(@Param('id') id: string, @Body() dto: MessageDto, @CurrentAdmin() admin: Admin) {
    return this.orders.sendMessageToUser(id, dto.text, admin.tenantId);
  }
}
