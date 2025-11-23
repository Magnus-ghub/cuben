import { Module } from '@nestjs/common';
import { ViewResolver } from './view.resolver';

@Module({
  providers: [ViewResolver]
})
export class ViewModule {}
