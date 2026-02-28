import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
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

@Injectable()
export class NotificationService {
	constructor(@InjectModel('Notification') private readonly notificationModel: Model<Notification>) {}

	public async createNotification(authorId: ObjectId, input: NotificationInput): Promise<Notification> {
		const receiverId = shapeIntoMongoObjectId(input.receiverId);

		const payload: T = {
			notificationType: input.notificationType,
			notificationGroup: input.notificationGroup,
			notificationTitle: input.notificationTitle,
			notificationDesc: input.notificationDesc,
			authorId,
			receiverId,
		};

		if (input.productId) payload.productId = shapeIntoMongoObjectId(input.productId);
		if (input.articleId) payload.articleId = shapeIntoMongoObjectId(input.articleId);

		try {
			const result: any = await this.notificationModel.create(payload);
			return result.toObject();
		} catch (err) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getNotification(memberId: ObjectId, notificationId: ObjectId): Promise<Notification> {
		const notification: any = await this.notificationModel
			.findOne({ _id: notificationId, receiverId: memberId })
			.lean()
			.exec();
		if (!notification) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return notification;
	}

	public async getMyNotifications(memberId: ObjectId, input: NotificationsInquiry): Promise<Notifications> {
		const match: T = { receiverId: memberId };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeMemberMatch(match, input);

		const result: Notifications[] = await this.notificationModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							{
								$lookup: {
									from: 'members',
									localField: 'authorId',
									foreignField: '_id',
									as: 'authorData',
								},
							},
							{ $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async readNotification(memberId: ObjectId, notificationId: ObjectId): Promise<Notification> {
		const result: any = await this.notificationModel
			.findOneAndUpdate(
				{ _id: notificationId, receiverId: memberId },
				{ notificationStatus: NotificationStatus.READ },
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result.toObject();
	}

	public async readAllNotifications(memberId: ObjectId): Promise<NotificationStats> {
		const result: any = await this.notificationModel
			.updateMany(
				{ receiverId: memberId, notificationStatus: NotificationStatus.WAIT },
				{ notificationStatus: NotificationStatus.READ },
			)
			.exec();

		return { modifiedCount: result.modifiedCount ?? 0 };
	}

	public async removeNotification(memberId: ObjectId, notificationId: ObjectId): Promise<Notification> {
		const result: any = await this.notificationModel
			.findOneAndDelete({ _id: notificationId, receiverId: memberId })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result.toObject();
	}

	public async getAllNotificationsByAdmin(input: AllNotificationsInquiry): Promise<Notifications> {
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeAdminMatch(match, input);

		const result: Notifications[] = await this.notificationModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							{
								$lookup: {
									from: 'members',
									localField: 'authorId',
									foreignField: '_id',
									as: 'authorData',
								},
							},
							{ $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
							{
								$lookup: {
									from: 'members',
									localField: 'receiverId',
									foreignField: '_id',
									as: 'receiverData',
								},
							},
							{ $unwind: { path: '$receiverData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async updateNotificationByAdmin(input: NotificationUpdate): Promise<Notification> {
		const result: any = await this.notificationModel.findOneAndUpdate({ _id: input._id }, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result.toObject();
	}

	public async removeNotificationByAdmin(notificationId: ObjectId): Promise<Notification> {
		const result: any = await this.notificationModel.findOneAndDelete({ _id: notificationId }).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result.toObject();
	}

	private shapeMemberMatch(match: T, input: NotificationsInquiry): void {
		const { notificationStatus, notificationType, notificationGroup } = input.search;

		if (notificationStatus) match.notificationStatus = notificationStatus;
		if (notificationType) match.notificationType = notificationType;
		if (notificationGroup) match.notificationGroup = notificationGroup;
	}

	private shapeAdminMatch(match: T, input: AllNotificationsInquiry): void {
		const { notificationStatus, notificationType, notificationGroup, authorId, receiverId } = input.search;

		if (notificationStatus) match.notificationStatus = notificationStatus;
		if (notificationType) match.notificationType = notificationType;
		if (notificationGroup) match.notificationGroup = notificationGroup;
		if (authorId) match.authorId = shapeIntoMongoObjectId(authorId);
		if (receiverId) match.receiverId = shapeIntoMongoObjectId(receiverId);
	}
}
