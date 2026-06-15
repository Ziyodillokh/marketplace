import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { AdminRole, type Admin } from '@prisma/client';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CurrentAdmin, Roles, RolesGuard } from '../admin-auth/roles.guard';
import { AdminCategoriesService } from './admin-categories.service';

class CreateCategoryDto {
  @IsOptional() @IsString() slug?: string;
  @IsString() @MinLength(2) @MaxLength(80) titleUz!: string;
  @IsString() @MinLength(2) @MaxLength(80) titleRu!: string;
  @IsOptional() @IsString() iconUrl?: string | null;
  @IsOptional() @IsString() bannerUrl?: string | null;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() @IsInt() position?: number;
  @IsOptional() @IsBoolean() isVisible?: boolean;
}

class UpdateCategoryDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() titleUz?: string;
  @IsOptional() @IsString() titleRu?: string;
  @IsOptional() @IsString() iconUrl?: string | null;
  @IsOptional() @IsString() bannerUrl?: string | null;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() @IsInt() position?: number;
  @IsOptional() @IsBoolean() isVisible?: boolean;
}

class ReorderItemDto {
  @IsString() id!: string;
  @IsInt() position!: number;
  @IsOptional() @IsString() parentId?: string | null;
}

class ReorderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderItemDto) items!: ReorderItemDto[];
}

@Controller('admin/categories')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminCategoriesController {
  constructor(private readonly categories: AdminCategoriesService) {}

  @Get()
  tree(@CurrentAdmin() admin: Admin) {
    return this.categories.tree(admin.tenantId);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentAdmin() admin: Admin) {
    return this.categories.getById(id, admin.tenantId);
  }

  @Post()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  create(@Body() dto: CreateCategoryDto, @CurrentAdmin() admin: Admin) {
    return this.categories.create(dto, admin.tenantId);
  }

  @Patch('reorder')
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  reorder(@Body() dto: ReorderDto) {
    return this.categories.reorder(dto.items);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentAdmin() admin: Admin) {
    return this.categories.update(id, dto, admin.tenantId);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  delete(@Param('id') id: string, @CurrentAdmin() admin: Admin) {
    return this.categories.delete(id, admin.tenantId);
  }
}
