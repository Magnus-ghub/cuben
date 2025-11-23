import { Module } from '@nestjs/common';
import { FolloBatchController } from './follo-batch.controller';
import { FolloBatchService } from './follo-batch.service';

@Module({
  imports: [],
  controllers: [FolloBatchController],
  providers: [FolloBatchService],
})
export class FolloBatchModule {}
