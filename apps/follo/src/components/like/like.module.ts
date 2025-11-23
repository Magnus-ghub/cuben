import { Module } from '@nestjs/common';
import { LikeResolver } from './like.resolver';

@Module({
  providers: [LikeResolver]
})
export class LikeModule {}
