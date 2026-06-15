import { Module } from '@nestjs/common';
import { AdminStoreController } from './admin-store.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminStoreController],
})
export class AdminStoreModule {}
