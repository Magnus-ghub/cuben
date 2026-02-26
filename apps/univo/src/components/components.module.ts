import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { ProductModule } from './product/product.module';
import { LikeModule } from './like/like.module';
import { FollowModule } from './follow/follow.module';
import { ViewModule } from './view/view.module';
import { ArticleModule } from './article/article.module';
import { AuthModule } from './auth/auth.module';
import { PostModule } from './post/post.module';
import { CommentModule } from './comment/comment.module';

@Module({
  imports: [
    MemberModule, 
    ProductModule, 
    PostModule,
    LikeModule, 
    FollowModule, 
    ViewModule, 
    CommentModule, 
    ArticleModule, 
    AuthModule, 
  ]
})
export class ComponentsModule {}
