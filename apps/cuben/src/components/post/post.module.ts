import { forwardRef, Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostResolver } from './post.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import PostSchema from '../../schemas/Post.model';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';
import { CommentModule } from '../comment/comment.module';


@Module({
  imports: [
    MongooseModule.forFeature([
        {
            name: 'Post',
            schema: PostSchema,
        }
    ]),
    AuthModule,
    MemberModule,
    LikeModule,
  ],  
  providers: [PostService, PostResolver],
  exports: [PostService],
})
export class PostModule {}
