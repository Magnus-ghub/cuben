import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';
import { ArticleCategory, ArticleStatus } from '../../enums/article.enum';

@ObjectType()
export class Article {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => ArticleCategory)
	articleCategory: ArticleCategory;

	@Field(() => ArticleStatus)
	articleStatus: ArticleStatus;

	@Field(() => String)
	articleTitle: string;

	@Field(() => String)
	articleContent: string;

	@Field(() => String, { nullable: true })
	articleImage?: string;

	@Field(() => Int)
	articleViews: number;

	@Field(() => Int)
	articleLikes: number;

	@Field(() => Int)
	articleComments: number;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	/** from aggregation **/
	@Field(() => MeLiked, {nullable: true}) 
	meLiked?: MeLiked; 

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Articles {
	@Field(() => [Article])
	list: Article[];

	@Field(() => TotalCounter, { nullable: true }) 
	metaCounter: TotalCounter;
}