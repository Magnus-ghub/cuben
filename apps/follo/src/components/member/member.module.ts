import { Module } from '@nestjs/common';
import { MemberResolver } from './member.resolver';

@Module({
  providers: [MemberResolver]
})
export class MemberModule {}
