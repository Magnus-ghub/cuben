import { Module } from '@nestjs/common';
import { FollowResolver } from './follow.resolver';

@Module({
  providers: [FollowResolver]
})
export class FollowModule {}
