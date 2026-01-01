import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { SaveGroup } from '../../enums/save.enum';

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
export class Save {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => SaveGroup)
	saveGroup: SaveGroup;

	@Field(() => String)
	saveRefId: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;
}


