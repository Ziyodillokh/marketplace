import { Module } from '@nestjs/common';
import { RelatedProductsService } from './related-products.service';

@Module({
  providers: [RelatedProductsService],
  exports: [RelatedProductsService],
})
export class RelatedProductsModule {}
