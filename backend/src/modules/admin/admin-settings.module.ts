import { Body, Controller, Get, Module, Patch, UseGuards } from '@nestjs/common';
import { IsObject, IsString } from 'class-validator';
import { AdminRole, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { Roles, RolesGuard } from '../admin-auth/roles.guard';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

class UpsertSettingDto {
  @IsString() key!: string;
  @IsObject() value!: Record<string, unknown>;
}

@Controller('admin/settings')
@UseGuards(AdminJwtGuard, RolesGuard)
class AdminSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.settings.findMany();
  }

  @Patch()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async upsert(@Body() dto: UpsertSettingDto) {
    const value = dto.value as Prisma.InputJsonValue;
    return this.prisma.settings.upsert({
      where: { key: dto.key },
      update: { value },
      create: { key: dto.key, value },
    });
  }
}

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminSettingsController],
})
export class AdminSettingsModule {}
