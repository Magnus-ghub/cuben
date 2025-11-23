import { Module } from '@nestjs/common';
import { ViewResolver } from './view.resolver';
import { ViewService } from './view.service';

@Module({
  providers: [ViewResolver, ViewService]
})
export class ViewModule {}
