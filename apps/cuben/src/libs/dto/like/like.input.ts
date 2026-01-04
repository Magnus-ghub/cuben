import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { ObjectId } from 'mongoose';
import { LikeAction, LikeTarget } from '../../enums/like.enum';

@InputType()
export class LikeInput {
	@IsNotEmpty()
	@Field(() => String)
	refId: ObjectId; // postId | productId | articleId

	@IsNotEmpty()
	@Field(() => LikeTarget)
	targetType: LikeTarget;

	@IsNotEmpty()
	@Field(() => LikeAction)
	action: LikeAction;
}
