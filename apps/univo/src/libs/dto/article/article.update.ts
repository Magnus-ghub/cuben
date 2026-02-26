import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ArticleCategory, ArticleStatus } from '../../enums/article.enum';
import { ObjectId } from 'mongoose';

// article.update.ts (rename)
@InputType()
export class ArticleUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => ArticleStatus, { nullable: true })
	articleStatus?: ArticleStatus;

	@IsOptional()
	@Field(() => ArticleCategory, { nullable: true })
	articleCategory?: ArticleCategory;

	@IsOptional()
	@Length(3, 200)
	@Field(() => String, { nullable: true })
	articleTitle?: string;

	@IsOptional()
	@Length(3, 500)
	@Field(() => String, { nullable: true })
	articleContent?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	articleImage?: string;
}
