import { Module } from '@nestjs/common';
import { FolloBatchController } from './follo-batch.controller';
import { FolloBatchService } from './follo-batch.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [FolloBatchController],
  providers: [FolloBatchService],
})
export class FolloBatchModule {}
