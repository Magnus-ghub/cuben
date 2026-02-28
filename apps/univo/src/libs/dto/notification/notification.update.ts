import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { ObjectId } from 'mongoose';
import { NotificationStatus } from '../../enums/notification.enum';

@InputType()
export class NotificationUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => NotificationStatus, { nullable: true })
	notificationStatus?: NotificationStatus;

	@IsOptional()
	@Length(3, 200)
	@Field(() => String, { nullable: true })
	notificationTitle?: string;

	@IsOptional()
	@Length(3, 2000)
	@Field(() => String, { nullable: true })
	notificationDesc?: string;
}
