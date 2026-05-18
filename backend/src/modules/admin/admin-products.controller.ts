import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AdminRole } from '@prisma/client';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { Roles, RolesGuard } from '../admin-auth/roles.guard';
import { AdminProductsService } from './admin-products.service';

class VariantDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() color?: string | null;
  @IsOptional() @IsString() size?: string | null;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsNumber() @Min(0) oldPrice?: number | null;
  @IsInt() @Min(0) stock!: number;
  @IsOptional() @IsString() sku?: string | null;
  @IsOptional() @IsString() imageUrl?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class SpecDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MaxLength(80) labelUz!: string;
  @IsString() @MaxLength(80) labelRu!: string;
  @IsString() @MaxLength(200) valueUz!: string;
  @IsString() @MaxLength(200) valueRu!: string;
  @IsOptional() @IsInt() position?: number;
}

class ImageDto {
  @IsOptional() @IsString() id?: string;
  @IsString() url!: string;
  @IsOptional() @IsInt() position?: number;
}

class CreateProductDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() sku?: string | null;
  @IsString() @MinLength(2) @MaxLength(200) titleUz!: string;
  @IsString() @MinLength(2) @MaxLength(200) titleRu!: string;
  @IsOptional() @IsString() descriptionUz?: string | null;
  @IsOptional() @IsString() descriptionRu?: string | null;
  @IsString() categoryId!: string;
  @IsOptional() @IsString() brand?: string | null;
  @IsNumber() @Min(0) basePrice!: number;
  @IsOptional() @IsNumber() @Min(0) oldPrice?: number | null;
  @IsOptional() @IsInt() @Min(0) discountPct?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @ArrayMaxSize(20) @Type(() => ImageDto) images?: ImageDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @ArrayMaxSize(100) @Type(() => VariantDto) variants?: VariantDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @ArrayMaxSize(50) @Type(() => SpecDto) specs?: SpecDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) relatedProductIds?: string[];
}

class UpdateProductDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() sku?: string | null;
  @IsOptional() @IsString() titleUz?: string;
  @IsOptional() @IsString() titleRu?: string;
  @IsOptional() @IsString() descriptionUz?: string | null;
  @IsOptional() @IsString() descriptionRu?: string | null;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brand?: string | null;
  @IsOptional() @IsNumber() @Min(0) basePrice?: number;
  @IsOptional() @IsNumber() @Min(0) oldPrice?: number | null;
  @IsOptional() @IsInt() @Min(0) discountPct?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @ArrayMaxSize(20) @Type(() => ImageDto) images?: ImageDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @ArrayMaxSize(100) @Type(() => VariantDto) variants?: VariantDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @ArrayMaxSize(50) @Type(() => SpecDto) specs?: SpecDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) relatedProductIds?: string[];
}

class ListProductsDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsIn(['active', 'inactive', 'all']) status?: 'active' | 'inactive' | 'all';
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

@Controller('admin/products')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminProductsController {
  constructor(private readonly products: AdminProductsService) {}

  @Get()
  list(@Query() q: ListProductsDto) {
    return this.products.list(q);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.products.getById(id);
  }

  @Post()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN, AdminRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.products.delete(id);
  }

  @Delete(':id/hard')
  @Roles(AdminRole.SUPERADMIN)
  hardDelete(@Param('id') id: string) {
    return this.products.hardDelete(id);
  }
}
