import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { SellerController } from './seller.controller';
import { SellerOnboardingService } from './seller.service';

@Module({
  imports: [UploadsModule],
  controllers: [SellerController],
  providers: [SellerOnboardingService],
})
export class PublicModule {}
