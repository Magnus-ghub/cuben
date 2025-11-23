import { Module } from '@nestjs/common';
import { BoardArticleResolver } from './board-article.resolver';

@Module({
  providers: [BoardArticleResolver]
})
export class BoardArticleModule {}
