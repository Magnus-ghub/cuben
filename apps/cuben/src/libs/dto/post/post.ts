import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';
import { PostStatus } from '../../enums/post.enum';

@ObjectType()
export class MeSaved {
	@Field(() => String)
	memberId: ObjectId;

	@Field(() => String)
	saveRefId: ObjectId;

	@Field(() => Boolean)
	mySaves: boolean;
}

@ObjectType()
export class Post {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => PostStatus)
	postStatus: PostStatus;

	@Field(() => String)
	postTitle: string;

	@Field(() => String)
	postContent: string;

	@Field(() => [String], { nullable: true })
	postImages?: string[];

	@Field(() => Int)
	postLikes: number;

	@Field(() => Int)
	postComments: number;

	@Field(() => Int)
	postSaves: number;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	/** from aggregation **/
	@Field(() => [MeSaved], {nullable: true})
	meSaved?: MeSaved[];

	@Field(() => [MeLiked], {nullable: true})
	meLiked?: MeLiked[];

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Posts {
	@Field(() => [Post])
	list: Post[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}
