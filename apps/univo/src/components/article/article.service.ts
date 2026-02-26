import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberService } from '../member/member.service';
import { Direction, Message } from '../../libs/enums/common.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { MeLiked } from '../../libs/dto/like/like';
import { ViewService } from '../view/view.service';
import { ViewInput } from '../../libs/dto/view/view.input';
import { CommentService } from '../comment/comment.service';
import { Article, Articles } from '../../libs/dto/article/article';
import { AllArticlesInquiry, ArticleInput, ArticlesInquiry } from '../../libs/dto/article/article.input';
import { ArticleUpdate } from '../../libs/dto/article/article.update';
import { ArticleStatus } from '../../libs/enums/article.enum';
import { LikeTarget, LikeAction } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { LikeInput } from '../../libs/dto/like/like.input';

@Injectable()
export class ArticleService {
	constructor(
		@InjectModel('Article') private readonly articleModel: Model<any>,
		private memberService: MemberService,
		private likeService: LikeService,
		private viewService: ViewService,
	) {}

	public async createArticle(memberId: ObjectId, input: ArticleInput): Promise<Article> {
		input.memberId = memberId;
		try {
			const result = await this.articleModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: 1,
			});
			return result;
		} catch (err) {
			// console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getArticle(memberId: ObjectId | null, articleId: ObjectId): Promise<Article> {
		const search: T = {
			_id: articleId,
			articleStatus: ArticleStatus.ACTIVE,
		};

		const targetArticle: any = await this.articleModel.findOne(search).lean().exec();
		if (!targetArticle) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		// View +1
		if (memberId) {
			const viewInput: ViewInput = {
				viewRefId: articleId,
				viewGroup: ViewGroup.ARTICLE,
			};
			const newView = await this.viewService.recordView({ ...viewInput, memberId });
			if (newView) {
				await this.articleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
				targetArticle.articleViews++;
			}
		} else {
			const viewInput: ViewInput = {
				viewRefId: articleId,
				viewGroup: ViewGroup.ARTICLE,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.articleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
				targetArticle.articleViews++;
			}
		}

		let meLiked: MeLiked = { liked: false, saved: false };
		if (memberId) {
			const liked = await this.likeService.checkLikeExistence(memberId, {
				refId: articleId,
				targetType: LikeTarget.ARTICLE,
				action: LikeAction.LIKE,
			});
			const saved = await this.likeService.checkLikeExistence(memberId, {
				refId: articleId,
				targetType: LikeTarget.ARTICLE,
				action: LikeAction.SAVE,
			});
			meLiked = { liked, saved };
		}

		targetArticle.meLiked = meLiked;
		targetArticle.memberData = await this.memberService.getMember(null, targetArticle.memberId);
		return targetArticle;
	}

	public async updateArticle(memberId: ObjectId, input: ArticleUpdate): Promise<Article> {
		const { _id, articleStatus } = input;

		const result = await this.articleModel
			.findOneAndUpdate({ _id: _id, memberId: memberId, articleStatus: ArticleStatus.ACTIVE }, input, {
				new: true,
			})
			.exec();

		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (articleStatus === ArticleStatus.DELETE) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: -1,
			});
		}

		return result;
	}

	public async removeArticle(articleId: ObjectId): Promise<Article> {
		const search: T = { _id: articleId, articleStatus: ArticleStatus.ACTIVE };
		const result = await this.articleModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}

	public async getArticles(memberId: ObjectId | null, input: ArticlesInquiry): Promise<Articles> {
		const { articleCategory, text } = input.search;
		const match: T = { articleStatus: ArticleStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (articleCategory) match.articleCategory = articleCategory;
		if (text)
			match.$or = [
				{ articleTitle: { $regex: new RegExp(text, 'i') } },
				{ articleContent: { $regex: new RegExp(text, 'i') } },
			];
		if (input.search?.memberId) {
			match.memberId = shapeIntoMongoObjectId(input.search.memberId);
		}
		console.log('match:', match);

		const result = await this.articleModel
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
									let: { userId: memberId, articleId: '$_id' },
									pipeline: [
										{
											$match: {
												$expr: {
													$and: [
														{ $eq: ['$memberId', '$$userId'] },
														{ $eq: ['$refId', '$$articleId'] },
														{ $eq: ['$targetType', LikeTarget.ARTICLE] },
														{ $eq: ['$action', LikeAction.LIKE] },
													],
												},
											},
										},
										{ $project: { memberId: 1, refId: 1 } },
									],
									as: 'tempLiked',
								},
							},
							{
								$lookup: {
									from: 'likes',
									let: { userId: memberId, articleId: '$_id' },
									pipeline: [
										{
											$match: {
												$expr: {
													$and: [
														{ $eq: ['$memberId', '$$userId'] },
														{ $eq: ['$refId', '$$articleId'] },
														{ $eq: ['$targetType', LikeTarget.ARTICLE] },
														{ $eq: ['$action', LikeAction.SAVE] },
													],
												},
											},
										},
										{ $project: { memberId: 1, refId: 1 } },
									],
									as: 'tempSaved',
								},
							},
							{
								$addFields: {
									meLiked: {
										liked: { $gt: [{ $size: '$tempLiked' }, 0] },
										saved: { $gt: [{ $size: '$tempSaved' }, 0] },
									},
								},
							},
							{ $project: { tempLiked: 0, tempSaved: 0 } },
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

	public async likeTargetArticle(memberId: ObjectId, likeRefId: ObjectId): Promise<Article> {
		const target: any = await this.articleModel.findOne({ _id: likeRefId, articleStatus: ArticleStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			refId: likeRefId,
			targetType: LikeTarget.ARTICLE,
			action: LikeAction.LIKE,
		};

		const modifier: number = await this.likeService.toggleLike(memberId, input);
		const result = await this.articleStatsEditor({ _id: likeRefId, targetKey: 'articleLikes', modifier: modifier });

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	public async saveTargetArticle(memberId: ObjectId, saveRefId: ObjectId): Promise<Article> {
		const target: any = await this.articleModel.findOne({ _id: saveRefId, articleStatus: ArticleStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = {
			refId: saveRefId,
			targetType: LikeTarget.ARTICLE,
			action: LikeAction.SAVE,
		};

		const modifier: number = await this.likeService.toggleLike(memberId, input);
		const result = await this.articleStatsEditor({ _id: saveRefId, targetKey: 'articleLikes', modifier: modifier }); // Agar alohida save key kerak bo'lsa, o'zgartiring

		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	public async viewArticle(memberId: ObjectId | null, viewRefId: ObjectId): Promise<Article> {
		const target: any = await this.articleModel.findOne({ _id: viewRefId, articleStatus: ArticleStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: ViewInput = {
			viewRefId,
			viewGroup: ViewGroup.ARTICLE,
		};

		const newView = await this.viewService.recordView({ ...input, memberId: memberId || null });
		let modifier = 0;
		if (newView) {
			modifier = 1;
			await this.articleStatsEditor({ _id: viewRefId, targetKey: 'articleViews', modifier });
		}

		const result = await this.articleModel.findById(viewRefId).exec();
		return result;
	}

	public async getLikedArticles(memberId: ObjectId, input: AllArticlesInquiry): Promise<Articles> {
		console.log('Getting Favorite articles (LIKED)...');
		return await this.likeService.getFavoriteArticles(memberId, input);
	}

	public async incrementArticleComments(articleId: ObjectId): Promise<Article> {
		return await this.articleStatsEditor({ _id: articleId, targetKey: 'articleComments', modifier: 1 });
	}

	public async decrementArticleComments(articleId: ObjectId): Promise<Article> {
		return await this.articleStatsEditor({ _id: articleId, targetKey: 'articleComments', modifier: -1 });
	}

	public async getAllArticlesByAdmin(input: AllArticlesInquiry): Promise<Articles> {
		const { articleStatus, articleCategory } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (articleStatus) match.articleStatus = articleStatus;
		if (articleCategory) match.articleCategory = articleCategory;

		const result = await this.articleModel
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

	public async updateArticleByAdmin(input: ArticleUpdate): Promise<Article> {
		const { _id, articleStatus } = input;

		const result = await this.articleModel
			.findOneAndUpdate({ _id: _id, articleStatus: ArticleStatus.ACTIVE }, input, {
				new: true,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (articleStatus === ArticleStatus.DELETE) {
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberArticles',
				modifier: -1,
			});
		}

		return result;
	}

	public async removeArticleByAdmin(articleId: ObjectId): Promise<Article> {
		const search: T = { _id: articleId, articleStatus: ArticleStatus.DELETE };
		const result = await this.articleModel
			.findOneAndUpdate(search, { articleStatus: ArticleStatus.DELETE }, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}

	public async articleStatsEditor(input: StatisticModifier): Promise<any> {
		const { _id, targetKey, modifier } = input;
		return await this.articleModel
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
