import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { NoticeStatus } from '../../libs/enums/notice.enum';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import { AllNoticesInquiry, NoticeInput, NoticesInquiry } from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';

@Injectable()
export class NoticeService {
	constructor(@InjectModel('Notice') private readonly noticeModel: Model<Notice>) {}

	public async createNotice(memberId: ObjectId, input: NoticeInput): Promise<Notice> {
		try {
			const result = await this.noticeModel.create({ ...input, memberId });
			return result.toObject();
		} catch (err) {
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getNotice(noticeId: ObjectId): Promise<Notice> {
		const targetNotice: any = await this.noticeModel
			.findOne({ _id: noticeId, noticeStatus: NoticeStatus.ACTIVE })
			.lean()
			.exec();
		if (!targetNotice) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		targetNotice.memberData = null;
		return targetNotice;
	}

	public async getNotices(input: NoticesInquiry): Promise<Notices> {
		const match: T = { noticeStatus: NoticeStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapePublicMatch(match, input);

		const result: Notices[] = await this.noticeModel
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
									localField: 'memberId',
									foreignField: '_id',
									as: 'memberData',
								},
							},
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async getAllNoticesByAdmin(input: AllNoticesInquiry): Promise<Notices> {
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeAdminMatch(match, input);

		const result: Notices[] = await this.noticeModel
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
									localField: 'memberId',
									foreignField: '_id',
									as: 'memberData',
								},
							},
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async updateNoticeByAdmin(input: NoticeUpdate): Promise<Notice> {
		const result: any = await this.noticeModel.findOneAndUpdate({ _id: input._id }, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result.toObject();
	}

	public async removeNoticeByAdmin(noticeId: ObjectId): Promise<Notice> {
		const result: any = await this.noticeModel
			.findOneAndUpdate({ _id: noticeId }, { noticeStatus: NoticeStatus.DELETE }, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result.toObject();
	}

	private shapePublicMatch(match: T, input: NoticesInquiry): void {
		const { noticeCategory, text } = input.search;

		if (noticeCategory) match.noticeCategory = noticeCategory;
		if (text)
			match.$or = [
				{ noticeTitle: { $regex: new RegExp(text, 'i') } },
				{ noticeContent: { $regex: new RegExp(text, 'i') } },
			];
	}

	private shapeAdminMatch(match: T, input: AllNoticesInquiry): void {
		const { noticeStatus, noticeCategory, text } = input.search;

		if (noticeStatus) match.noticeStatus = noticeStatus;
		if (noticeCategory) match.noticeCategory = noticeCategory;
		if (text)
			match.$or = [
				{ noticeTitle: { $regex: new RegExp(text, 'i') } },
				{ noticeContent: { $regex: new RegExp(text, 'i') } },
			];
	}
}
