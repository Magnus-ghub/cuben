import { Module } from '@nestjs/common';
import { SaveService } from './save.service';

@Module({
  providers: [SaveService]
})
export class SaveModule {}
