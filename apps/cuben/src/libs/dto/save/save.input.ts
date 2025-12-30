import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { ObjectId } from 'mongoose';
import { SaveGroup } from '../../enums/save.enum';

@InputType()
export class SaveInput {
	@IsNotEmpty()
	@Field(() => String)
	memberId: ObjectId;

	@IsNotEmpty()
	@Field(() => String)
	saveRefId: ObjectId;

	@IsNotEmpty()
	@Field(() => SaveGroup)
	saveGroup: SaveGroup;
}
