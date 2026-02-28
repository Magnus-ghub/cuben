import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import {
	Notification,
	Notifications,
	NotificationStats,
} from '../../libs/dto/notification/notification';
import {
	AllNotificationsInquiry,
	NotificationInput,
	NotificationsInquiry,
} from '../../libs/dto/notification/notification.input';
import { NotificationUpdate } from '../../libs/dto/notification/notification.update';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class NotificationResolver {
	constructor(private readonly notificationService: NotificationService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	public async createNotification(
		@Args('input') input: NotificationInput,
		@AuthMember('_id') authorId: ObjectId,
	): Promise<Notification> {
		return await this.notificationService.createNotification(authorId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Notification)
	public async getNotification(
		@Args('notificationId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notification> {
		const notificationId = shapeIntoMongoObjectId(input);
		return await this.notificationService.getNotification(memberId, notificationId);
	}

	@UseGuards(AuthGuard)
	@Query(() => Notifications)
	public async getMyNotifications(
		@Args('input') input: NotificationsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notifications> {
		return await this.notificationService.getMyNotifications(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	public async readNotification(
		@Args('notificationId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notification> {
		const notificationId = shapeIntoMongoObjectId(input);
		return await this.notificationService.readNotification(memberId, notificationId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => NotificationStats)
	public async readAllNotifications(@AuthMember('_id') memberId: ObjectId): Promise<NotificationStats> {
		return await this.notificationService.readAllNotifications(memberId);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Notification)
	public async removeNotification(
		@Args('notificationId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Notification> {
		const notificationId = shapeIntoMongoObjectId(input);
		return await this.notificationService.removeNotification(memberId, notificationId);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Notifications)
	public async getAllNotificationsByAdmin(
		@Args('input') input: AllNotificationsInquiry,
	): Promise<Notifications> {
		return await this.notificationService.getAllNotificationsByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notification)
	public async updateNotificationByAdmin(@Args('input') input: NotificationUpdate): Promise<Notification> {
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.notificationService.updateNotificationByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Notification)
	public async removeNotificationByAdmin(@Args('notificationId') input: string): Promise<Notification> {
		const notificationId = shapeIntoMongoObjectId(input);
		return await this.notificationService.removeNotificationByAdmin(notificationId);
	}
}
