// PostService (commentTargetPost da skipStatsUpdate qo'shing, double update oldini olish uchun)
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberService } from '../member/member.service';
import { Direction, Message } from '../../libs/enums/common.enum';
import moment from 'moment';
import { StatisticModifier, T } from '../../libs/types/common';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeInput } from '../../libs/dto/like/like.input';
import { Post, Posts } from '../../libs/dto/post/post';
import { PostInput, PostsInquiry } from '../../libs/dto/post/post.input';
import { PostUpdate } from '../../libs/dto/post/post.update';
import { PostStatus } from '../../libs/enums/post.enum';
import { CommentService } from '../comment/comment.service';

@Injectable()
export class PostService {
	constructor(
		@InjectModel('Post') private readonly postModel: Model<Post>,
		private memberService: MemberService,
		private likeService: LikeService,
	) {}

	public async createPost(input: PostInput): Promise<Post> {
		try {
			const result = await this.postModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberPosts',
				modifier: 1,
			});
			return result;
		} catch (err) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getPost(memberId: ObjectId, postId: ObjectId): Promise<Post> {
		const search: T = {
			_id: postId,
			postStatus: PostStatus.ACTIVE,
		};

		const targetPost: Post = await this.postModel.findOne(search).lean().exec();
		if (!targetPost) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const likeInput = { memberId: memberId, likeRefId: postId, likeGroup: LikeGroup.POST };
			targetPost.meLiked = await this.likeService.checkLikeExistence(likeInput);

            const saveInput = { memberId: memberId, likeRefId: postId, likeGroup: LikeGroup.SAVE_POST };
            targetPost.meSaved = await this.likeService.checkLikeExistence(saveInput);  
		}

		targetPost.memberData = await this.memberService.getMember(null, targetPost.memberId);
		return targetPost;
	}

	public async updatePost(memberId: ObjectId, input: PostUpdate): Promise<Post> {
		let { postStatus, blockedAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			memberId: memberId,
			postStatus: PostStatus.ACTIVE,
		};

		if (postStatus === PostStatus.BLOCKED) blockedAt = moment().toDate();
		else if (postStatus === PostStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.postModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (blockedAt || deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberPosts',
				modifier: -1,
			});
		}

		return result;
	}

	public async getPosts(memberId: ObjectId, input: PostsInquiry): Promise<Posts> {
	const match: T = { postStatus: PostStatus.ACTIVE };
	const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

	this.shapeMatchQuery(match, input);
	console.log('match:', match);

	const result = await this.postModel
		.aggregate([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [
						{ $skip: (input.page - 1) * input.limit },
						{ $limit: input.limit },
						lookupAuthMemberLiked(memberId), 
						{
							$lookup: {
								from: 'Like', 
								let: { 
									userId: memberId, 
									postId: '$_id'    
								},
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [
													{ $eq: ['$memberId', '$$userId'] },  
													{ $eq: ['$likeRefId', '$$postId'] }, 
													{ $eq: ['$likeGroup', LikeGroup.SAVE_POST] },
												],
											},
										},
									},
									{ 
										$project: { 
											memberId: 1, 
											likeRefId: 1, 
											mySaves: { $const: true }  
										} 
									},
								],
								as: 'meSaved',
							},
						},
						lookupMember,
						{ $unwind: '$memberData' },
					],
					metaCounter: [{ $count: 'total' }],
				},
			},
		])
		.exec();
	if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

	return result[0];
}

	private shapeMatchQuery(match: T, input: PostsInquiry): void {
		const { memberId, text } = input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);

		if (text) match.postTitle = { $regex: new RegExp(text, 'i') };
	}

	public async likeTargetPost(memberId: ObjectId, likeRefId: ObjectId): Promise<Post> {
		const target: Post = await this.postModel.findOne({ _id: likeRefId, postStatus: PostStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: likeRefId,
			likeGroup: LikeGroup.POST,
		};

		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.postStatsEditor({ _id: likeRefId, targetKey: 'postLikes', modifier: modifier });

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}


	public async saveTargetPost(memberId: ObjectId, saveRefId: ObjectId): Promise<Post> {
		const target: Post = await this.postModel.findOne({ _id: saveRefId, postStatus: PostStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			memberId: memberId,
			likeRefId: saveRefId,
			likeGroup: LikeGroup.SAVE_POST,
		};

		const modifier: number = await this.likeService.toggleLike(input);
		const result = await this.postStatsEditor({ _id: saveRefId, targetKey: 'postSaves', modifier: modifier });

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	public async postStatsEditor(input: StatisticModifier): Promise<Post> {
		const { _id, targetKey, modifier } = input;
		return await this.postModel
			.findByIdAndUpdate(
				_id,
				{ $inc: { [targetKey]: modifier } },
				{
					new: true,
				},
			)
			.exec();
	}
}