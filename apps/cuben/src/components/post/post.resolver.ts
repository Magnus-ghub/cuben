import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PostService } from './post.service';
import { Post, Posts } from '../../libs/dto/post/post';
import { PostInput, PostsInquiry } from '../../libs/dto/post/post.input';
import { PostUpdate } from '../../libs/dto/post/post.update';
import { CommentInput } from '../../libs/dto/comment/comment.input'; // Comment uchun

@Resolver()
export class PostResolver {
	constructor(private readonly postService: PostService) {}

	@Roles(MemberType.USER, MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Post)
	public async createPost(
		@Args('input') input: PostInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Post> {
		console.log('Mutation: createPost');
		input.memberId = memberId;
		return await this.postService.createPost(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Post)
	public async getPost(
        @Args('postId') input: string, 
        @AuthMember('_id') memberId: ObjectId | null, // Null bo'lishi mumkin, unauth uchun
    ): Promise<Post> {
		console.log('Query: getPost');
		const postId = shapeIntoMongoObjectId(input);
		return await this.postService.getPost(memberId || null, postId);
	}

    @Roles(MemberType.USER, MemberType.ADMIN) 
    @UseGuards(RolesGuard)
    @Mutation(() => Post)
    public async updatePost(
        @Args('input') input: PostUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Post> {
        console.log('Mutation: updatePost'); // Query emas, Mutation
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.postService.updatePost(memberId, input);
    }

    @UseGuards(WithoutGuard)
    @Query(() => Posts)
    public async getPosts(
        @Args('input') input: PostsInquiry,
        @AuthMember('_id') memberId: ObjectId | null,
    ): Promise<Posts> {
        console.log('Query: getPosts');
        return await this.postService.getPosts(memberId || null, input);
    }

    // Like va Save ni yangiladim: LikeInput bilan
    @UseGuards(AuthGuard)
	@Mutation(() => Post)
	public async likeTargetPost(
		@Args('postId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Post> {
		console.log('Mutation: likeTargetPost');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.postService.likeTargetPost(memberId, likeRefId);
	}

    @UseGuards(AuthGuard)
	@Mutation(() => Post)
	public async saveTargetPost(
		@Args('postId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Post> {
		console.log('Mutation: saveTargetPost');
		const saveRefId = shapeIntoMongoObjectId(input);
		return await this.postService.saveTargetPost(memberId, saveRefId);
	}

    // Yangi: Comment qo'shish uchun mutation (post counter ni update qilish bilan)
    @UseGuards(AuthGuard)
	@Mutation(() => Post)
	public async addCommentToPost(
		@Args('postId') postId: string,
        @Args('input') input: Partial<CommentInput>, // commentContent ni oladi, group va refId service da set qilinadi
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Post> {
		console.log('Mutation: addCommentToPost');
		const refId = shapeIntoMongoObjectId(postId);
        const commentContent = input.commentContent; // Faqat content ni olamiz
		return await this.postService.addCommentToPost(memberId, refId, commentContent);
	}

    // Yangi: Comment o'chirish uchun (status DELETE ga o'tkazib, counter -1)
    @UseGuards(AuthGuard)
	@Mutation(() => Post)
	public async deleteCommentFromPost(
		@Args('commentId') commentId: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Post> {
		console.log('Mutation: deleteCommentFromPost');
		const commentRefId = shapeIntoMongoObjectId(commentId); // Comment ID emas, post ID ni qaytarish uchun
		return await this.postService.deleteCommentFromPost(memberId, commentRefId);
	}
}