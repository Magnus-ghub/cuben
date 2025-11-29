import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CommentService } from './comment.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { CommentInput } from '../../libs/dto/comment/comment.input';
import { Comment } from '../../libs/dto/comment/comment';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';

@Resolver()
export class CommentResolver {
    constructor(private readonly commentService: CommentService) {}

    @UseGuards(AuthGuard)
    @Mutation((returns) => Comment)
    public async createComment(
        @Args('input') input: CommentInput,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Comment> {
        console.log('Mutation: createComment');
        return await this.commentService.createComment(input, memberId)
    }

    @UseGuards(AuthGuard)
    @Mutation((returns) => Comment)
    public async updateComment(
        @Args('input') input: CommentUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Comment> {
        console.log('Mutation: updateComment');
        return await this.commentService.updateComment(memberId, input);
    }
}
