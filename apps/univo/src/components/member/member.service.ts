import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Member, Members } from '../../libs/dto/member/member';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { LikeService } from '../like/like.service';
import { LikeTarget, LikeAction } from '../../libs/enums/like.enum';
import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';
import { lookupMember } from '../../libs/config';
import { Product } from '../../libs/dto/product/product';
import { Article } from '../../libs/dto/article/article';
import { Post } from '../../libs/dto/post/post';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		@InjectModel('Product') private readonly productModel: Model<Product>,
		@InjectModel('Article') private readonly articleModel: Model<Article>,
		@InjectModel('Post') private readonly postModel: Model<Post>,
		private authService: AuthService,
		private likeService: LikeService,
	) {}

	public async signup(input: MemberInput): Promise<Member> {
		input.memberPassword = await this.authService.hashPassword(input.memberPassword);
		try {
			const result = await this.memberModel.create(input);
			result.accessToken = await this.authService.createToken(result);
			return result;
		} catch (err: any) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
		}
	}

	public async login(input: LoginInput): Promise<Member> {
		const { memberNick, memberPassword } = input;
		const response: any = await this.memberModel.findOne({ memberNick: memberNick }).select('+memberPassword').exec();

		if (!response || response.memberStatus === MemberStatus.DELETE) {
			throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
		} else if (response.memberStatus === MemberStatus.BLOCK) {
			throw new InternalServerErrorException(Message.BLOCKED_USER);
		}

		const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
		if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);
		response.accessToken = await this.authService.createToken(response);

		return response;
	}

	public async getMember(memberId: ObjectId | null, targetId: ObjectId): Promise<Member> {
		const search: T = {
			_id: targetId,
			memberStatus: {
				$in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
			},
		};

		const targetMember = await this.memberModel.findOne(search).lean().exec();
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			targetMember.meFollowed = await this.checkSubscription(memberId, targetId);
		} else {
			targetMember.meFollowed = [];
		}
		return targetMember;
	}

	private async checkSubscription(followerId: ObjectId, followingId: ObjectId): Promise<MeFollowed[]> {
		const result = await this.followModel.findOne({ followingId: followingId, followerId: followerId }).exec();
		return result ? [{ followerId: followerId, followingId: followingId, myFollowing: true }] : [];
	}

	public async updateMember(memberId: ObjectId, input: MemberUpdate): Promise<Member> {
		const result: Member = await this.memberModel
			.findOneAndUpdate(
				{
					_id: memberId,
					memberStatus: MemberStatus.ACTIVE,
				},
				input,
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		result.accessToken = await this.authService.createToken(result);
		return result;
	}

	public async getAgents(memberId: ObjectId | null, input: AgentsInquiry): Promise<Members> {
		const { text } = input.search;
		const match: T = { memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (text)
			match.$or = [
				{ memberNick: { $regex: new RegExp(text, 'i') } },
				{ memberFullName: { $regex: new RegExp(text, 'i') } },
			];
		console.log('match:', match);

		const result = await this.memberModel
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
									from: 'likes',
									let: { userId: memberId, memberId: '$_id' },
									pipeline: [
										{
											$match: {
												$expr: {
													$and: [
														{ $eq: ['$memberId', '$$userId'] },
														{ $in: ['$targetType', [LikeTarget.POST, LikeTarget.PRODUCT, LikeTarget.ARTICLE]] },
														{ $in: ['$action', [LikeAction.LIKE, LikeAction.SAVE]] },
													],
												},
											},
										},
										{ $count: 'totalLikesSaves' },
									],
									as: 'tempMeLiked',
								},
							},
							{
								$addFields: {
									// meLiked: {
									// 	liked: { $gt: [{ $size: { $filter: { input: '$tempMeLiked', cond: { $eq: ['$$this.action', LikeAction.LIKE] } } }, 0] },
									// 	saved: { $gt: [{ $size: { $filter: { input: '$tempMeLiked', cond: { $eq: ['$$this.action', LikeAction.SAVE] } } }, 0] }
									// }
								},
							},
							{ $project: { tempMeLiked: 0 } },
							lookupMember,
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

	public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
		const { memberStatus, memberType, text } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (memberStatus) match.memberStatus = memberStatus;
		if (memberType) match.memberType = memberType;
		if (text)
			match.$or = [
				{ memberNick: { $regex: new RegExp(text, 'i') } },
				{ memberFullName: { $regex: new RegExp(text, 'i') } },
			];
		console.log('match:', match);

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							{
								$addFields: {
									meLiked: {
										liked: false,
										saved: false,
									},
								},
							},
							lookupMember,
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

	public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
		const result: Member = await this.memberModel.findOneAndUpdate({ _id: input._id }, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result;
	}

	public async memberStatsEditor(input: StatisticModifier): Promise<any> {
		const { _id, targetKey, modifier } = input;
		return await this.memberModel
			.findByIdAndUpdate(
				_id,
				{
					$inc: { [targetKey]: modifier },
				},
				{ new: true },
			)
			.exec();
	}
}
