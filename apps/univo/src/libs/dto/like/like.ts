import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { LikeAction, LikeTarget } from '../../enums/like.enum';

@ObjectType()
export class MeLiked {
	@Field(() => Boolean, { nullable: true })
	liked: boolean;

	@Field(() => Boolean, { nullable: true })
	saved: boolean;
}

@ObjectType()
export class Like {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => LikeTarget)
	targetType: LikeTarget;

	@Field(() => LikeAction)
	action: LikeAction;

	@Field(() => String)
	refId: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date)
	createdAt: Date;
}
