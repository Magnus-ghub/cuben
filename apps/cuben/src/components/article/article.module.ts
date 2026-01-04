import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import ArticleSchema from '../../schemas/Article.model';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { ViewModule } from '../view/view.module';
import { LikeModule } from '../like/like.module';
import { ArticleService } from './article.service';
import { ArticleResolver } from './article.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Article',
        schema: ArticleSchema,
      }
    ]),
    AuthModule,
    MemberModule,
    ViewModule,
    LikeModule,
  ],
  providers: [ArticleResolver, ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
