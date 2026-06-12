import { Module } from '@nestjs/common';
import { PublicSignupController } from './public-signup.controller';
import { PublicSignupService } from './public-signup.service';

@Module({
  controllers: [PublicSignupController],
  providers: [PublicSignupService],
})
export class PublicModule {}
