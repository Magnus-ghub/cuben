import { Module } from '@nestjs/common';
import { CubenBatchController } from './cuben-batch.controller';
import { CubenBatchService } from './cuben-batch.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [CubenBatchController],
  providers: [CubenBatchService],
})
export class CubenBatchModule {}
