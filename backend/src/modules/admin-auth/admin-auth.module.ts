import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtGuard } from './admin-jwt.guard';
import { RolesGuard } from './roles.guard';
import { JwtService } from './jwt.service';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtGuard, RolesGuard, JwtService],
  exports: [AdminAuthService, AdminJwtGuard, RolesGuard, JwtService],
})
export class AdminAuthModule {}
