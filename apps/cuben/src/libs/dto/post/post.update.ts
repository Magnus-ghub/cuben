import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ObjectId } from 'mongoose';
import { PostStatus } from '../../enums/post.enum';

@InputType()
export class PostUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => PostStatus, { nullable: true })
	postStatus?: PostStatus;

	@IsOptional()
	@Length(3, 500)
	@Field(() => String, { nullable: true })
	postTitle?: string;

	@IsOptional()
	@Length(3, 9999)
	@Field(() => String, { nullable: true })
	postContent?: string;

	@IsOptional()
	@Field(() => [String], { nullable: true })
	postImages?: string[];

	blockedAt?: Date;
    deletedAt?: Date;
}