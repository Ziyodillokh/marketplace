import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { OpenAiService } from './openai.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [AdminAuthModule, UploadsModule],
  controllers: [AiController],
  providers: [OpenAiService],
})
export class AiModule {}
