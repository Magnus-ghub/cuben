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
import { AllPostsInquiry, PostInput, PostsInquiry } from '../../libs/dto/post/post.input';
import { PostUpdate } from '../../libs/dto/post/post.update';
import { LikeAction, LikeTarget } from '../../libs/enums/like.enum';

@Resolver()
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @UseGuards(AuthGuard)
  @Mutation(() => Post)
  public async createPost(
    @Args('input') input: PostInput,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Post> {
    input.memberId = memberId;
    return await this.postService.createPost(input);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Post)
  public async getPost(
    @Args('postId') input: string,
    @AuthMember('_id') memberId: ObjectId | null,
  ): Promise<Post> {
    const postId = shapeIntoMongoObjectId(input);
    return await this.postService.getPost(memberId, postId);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Post)
  public async updatePost(
    @Args('input') input: PostUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Post> {
    input._id = shapeIntoMongoObjectId(input._id);
    return await this.postService.updatePost(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Post)
  public async removePost(
    @Args('postId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Post> {
    const postId = shapeIntoMongoObjectId(input);
    return await this.postService.removePost(postId, memberId);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Posts)
  public async getPosts(
    @Args('input') input: PostsInquiry,
    @AuthMember('_id') memberId: ObjectId | null,
  ): Promise<Posts> {
    return await this.postService.getPosts(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Post)
  public async likeTargetPost(
    @Args('postId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Post> {
    const postId = shapeIntoMongoObjectId(input);
    return await this.postService.likeTargetPost(memberId, postId);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Post)
  public async saveTargetPost(
    @Args('postId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Post> {
    const postId = shapeIntoMongoObjectId(input);
    return await this.postService.saveTargetPost(memberId, postId);
  }

  @UseGuards(AuthGuard)
  @Query(() => Posts)
  public async getLikedPosts(
    @Args('input') input: PostsInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Posts> {
    return await this.postService.getLikedPosts(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Query(() => Posts)
  public async getSavedPosts(
    @Args('input') input: PostsInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Posts> {
    return await this.postService.getSavedPosts(memberId, input);
  }

  // ──────────────────────────────────────────
  //                  ADMIN QISMI
  // ──────────────────────────────────────────

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Posts)
  public async getAllPostsByAdmin(
    @Args('input') input: AllPostsInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Posts> {
    return await this.postService.getAllPostsByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Post)
  public async updatePostByAdmin(
    @Args('input') input: PostUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Post> {
    input._id = shapeIntoMongoObjectId(input._id);
    return await this.postService.updatePostByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Post)
  public async removePostByAdmin(
    @Args('postId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Post> {
    const postId = shapeIntoMongoObjectId(input);
    return await this.postService.removePostByAdmin(postId);
  }
}



