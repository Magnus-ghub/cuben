import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CommentService } from './comment.service';
import { Comments, Comment } from '../../libs/dto/comment/comment';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CommentStatus } from '../../libs/enums/comment.enum';

@Resolver()
export class CommentResolver {
    constructor(private readonly commentService: CommentService) {}

    @UseGuards(AuthGuard)
    @Mutation(() => Comment)
    public async createComment(
        @Args('input') input: CommentInput,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Comment> {
        console.log('Mutation: createComment');
        return await this.commentService.createComment(memberId, input)
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Comment)
    public async updateComment(
        @Args('input') input: CommentUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Comment> {
        console.log('Mutation: updateComment');
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.commentService.updateComment(memberId, input);
    }

    // Yangi: User o'z commentini o'chirish uchun (status DELETE ga o'tkazish)
    @UseGuards(AuthGuard)
    @Mutation(() => Comment)
    public async deleteComment(
        @Args('commentId') commentId: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Comment> {
        console.log('Mutation: deleteComment');
        const _id = shapeIntoMongoObjectId(commentId);
        const updateInput: CommentUpdate = {
            _id,
            commentStatus: CommentStatus.DELETE,
        };
        return await this.commentService.updateComment(memberId, updateInput);
    }
    
    @UseGuards(WithoutGuard)
    @Query(() => Comments)
    public async getComments(
        @Args('input') input: CommentsInquiry, 
        @AuthMember('_id') memberId: ObjectId | null, // Nullable
    ): Promise<Comments> {
        console.log('Query: getComments');
        input.search.commentRefId = shapeIntoMongoObjectId(input.search.commentRefId);
        return await this.commentService.getComments(memberId || null, input);
    }

    /** ADMIN **/
    @Roles(MemberType.ADMIN)  
    @UseGuards(RolesGuard)
    @Mutation(() => Comment)
    public async removeCommentByAdmin(
        @Args('commentId') input: string // commentId nomi to'g'rilandi
    ): Promise<Comment> {
        console.log('Mutation: removeCommentByAdmin');
        const commentId = shapeIntoMongoObjectId(input); // articleId → commentId
        return await this.commentService.removeCommentByAdmin(commentId);
    }
}