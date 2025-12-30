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
	@Query((returns) => Post)
	public async getPost(
        @Args('postId') input: string, 
        @AuthMember('_id') memberId: ObjectId
    ): Promise<Post> {
		console.log('Query: getPost');
		const postId = shapeIntoMongoObjectId(input);
		return await this.postService.getPost(memberId, postId);
	}

    @Roles(MemberType.USER, MemberType.ADMIN) 
    @UseGuards(RolesGuard)
    @Mutation((returns) => Post)
    public async updatePost(
        @Args('input') input: PostUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Post> {
        console.log('Query: updatePost');
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.postService.updatePost(memberId, input);
    }

    @UseGuards(WithoutGuard)
    @Query((returns) => Posts)
    public async getProducts(
        @Args('input') input: PostsInquiry,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Posts> {
        console.log('Query: getPosts');
        return await this.postService.getPosts(memberId, input);
    }

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
}
