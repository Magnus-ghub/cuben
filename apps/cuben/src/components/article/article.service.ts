import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { Direction, Message } from '../../libs/enums/common.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { ArticleStatus } from '../../libs/enums/article.enum'; // Rename
import { ViewGroup } from '../../libs/enums/view.enum';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { MeLiked } from '../../libs/dto/like/like'; // MeLiked qo'shildi
import { CommentService } from '../comment/comment.service'; // Qo'shildi
import { CommentInput } from '../../libs/dto/comment/comment.input'; // Qo'shildi
import { Article, Articles } from '../../libs/dto/article/article'; // Rename
import { AllArticlesInquiry, ArticleInput, ArticlesInquiry } from '../../libs/dto/article/article.input'; // Rename
import { ArticleUpdate } from '../../libs/dto/article/article.update'; // Rename
import { LikeTarget, LikeAction } from '../../libs/enums/like.enum'; // Yangi enum'lar
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum'; // Comment uchun
import { CommentUpdate } from '../../libs/dto/comment/comment.update'; // Update uchun
import { LikeInput } from '../../libs/dto/like/like.input';

@Injectable()
export class ArticleService {
    constructor(
        @InjectModel('Article') private readonly articleModel: Model<Article>, // Rename model
        private readonly memberService: MemberService,
        private readonly viewService: ViewService,
        private readonly likeService: LikeService,
        private readonly commentService: CommentService, // Qo'shildi
    ) {}

    public async createArticle(memberId: ObjectId, input: ArticleInput): Promise<Article> {
        input.memberId = memberId;
        try {
            const result = await this.articleModel.create(input); // Rename
            await this.memberService.memberStatsEditor({
                _id: memberId,
                targetKey: 'memberArticles',
                modifier: 1,
            });

            return result.toObject() as Article;
        } catch (err) {
            console.log('Error, Service.model:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    public async getArticle(memberId: ObjectId | null, articleId: ObjectId): Promise<Article> {
        const search: T = {
            _id: articleId,
            articleStatus: ArticleStatus.ACTIVE,
        };
    
        const targetArticle: any = await this.articleModel.findOne(search).lean().exec(); // Rename
        if(!targetArticle) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    
        // View check/create (+1)
        if (memberId) {
            const viewInput = { 
                viewRefId: articleId, 
                viewGroup: ViewGroup.ARTICLE 
            };
            const newView = await this.viewService.recordView({ ...viewInput, memberId }); // memberId qo'sh
            if (newView) {
                await this.articleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
                targetArticle.articleViews++;
            }
        } else {
            // Anonymous view
            const viewInput = { 
                viewRefId: articleId, 
                viewGroup: ViewGroup.ARTICLE 
            };
            const newView = await this.viewService.recordView(viewInput); // memberId null
            if (newView) {
                await this.articleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
                targetArticle.articleViews++;
            }
        }
            
        // meLiked (single obyekt)
        let meLiked: MeLiked = { liked: false, saved: false };
        if (memberId) {
            meLiked = await this.likeService.getMeLiked(memberId, articleId, LikeTarget.ARTICLE);
        }
        targetArticle.meLiked = meLiked;

        targetArticle.memberData = await this.memberService.getMember(null, targetArticle.memberId);
        return targetArticle as Article;
    } 
    
    public async updateArticle(memberId: ObjectId, input: ArticleUpdate): Promise<Article> {
        const { _id, articleStatus } = input;
          
        const result = await this.articleModel // Rename
            .findOneAndUpdate({ _id: _id, memberId: memberId, articleStatus: ArticleStatus.ACTIVE}, input,  {
                new: true, 
            })
            .exec();

            if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
            
            if(articleStatus === ArticleStatus.DELETE) {
                await this.memberService.memberStatsEditor({
                    _id: memberId,
                    targetKey: 'memberArticles',
                    modifier: -1,
                });
            }
    
        return result.toObject() as Article;
    }

    public async getArticles(memberId: ObjectId | null, input: ArticlesInquiry): Promise<Articles> {
        const { articleCategory, text } = input.search;
        const match: T = { articleStatus: ArticleStatus.ACTIVE };
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
    
        if (articleCategory) match.articleCategory = articleCategory;
        if (text) match.$or = [ // $or bilan yaxshilandi
            { articleTitle: { $regex: new RegExp(text, 'i') } },
            { articleContent: { $regex: new RegExp(text, 'i') } }
        ];
        if (input.search?.memberId) {
            match.memberId = shapeIntoMongoObjectId(input.search.memberId);
        }
        console.log('match:', match);

        const result = await this.articleModel // Rename
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * input.limit },
                            { $limit: input.limit },
                            // Like lookup (LIKE)
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
                            // Save lookup (SAVE)
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
                            // MeLiked yaratish
                            {
                                $addFields: {
                                    meLiked: {
                                        liked: { $gt: [{ $size: '$tempLiked' }, 0] },
                                        saved: { $gt: [{ $size: '$tempSaved' }, 0] }
                                    }
                                }
                            },
                            { $project: { tempLiked: 0, tempSaved: 0 } },
                            lookupMember,
                            { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } }, // Nullable
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec()
        if(!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
            
        return result[0] as Articles;
    }

    public async likeTargetArticle(memberId: ObjectId, likeRefId: ObjectId): Promise<Article> {
        const target: any = await this.articleModel.findOne({_id: likeRefId, articleStatus: ArticleStatus.ACTIVE}).exec(); // Rename
        if(!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    
        const input: LikeInput = {
            refId: likeRefId,
            targetType: LikeTarget.ARTICLE,
            action: LikeAction.LIKE,
        };
    
        // LIKE TOGGLE via Like Module
        const modifier: number = await this.likeService.toggleLike(memberId, input); // memberId alohida
        const result = await this.articleStatsEditor({_id: likeRefId, targetKey: 'articleLikes', modifier: modifier});
    
        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
        return result.toObject() as Article;
    }

    // Yangi: Save method
    public async saveTargetArticle(memberId: ObjectId, saveRefId: ObjectId): Promise<Article> {
        const target: any = await this.articleModel.findOne({_id: saveRefId, articleStatus: ArticleStatus.ACTIVE}).exec();
        if(!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    
        const input: LikeInput = {
            refId: saveRefId,
            targetType: LikeTarget.ARTICLE,
            action: LikeAction.SAVE,
        };
    
        const modifier: number = await this.likeService.toggleLike(memberId, input);
        const result = await this.articleStatsEditor({_id: saveRefId, targetKey: 'articleLikes', modifier: modifier}); // Agar alohida save counter kerak bo'lsa, key o'zgartiring
    
        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
        return result.toObject() as Article;
    }

    // Yangi: Comment qo'shish
    public async addCommentToArticle(memberId: ObjectId, articleId: ObjectId, commentContent: string): Promise<Article> {
        const target: any = await this.articleModel.findOne({ _id: articleId, articleStatus: ArticleStatus.ACTIVE }).exec();
        if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        const input: CommentInput = {
            commentGroup: CommentGroup.ARTICLE,
            commentRefId: articleId,
            commentContent,
        };

        await this.commentService.createComment(memberId, input);

        const result = await this.articleStatsEditor({ _id: articleId, targetKey: 'articleComments', modifier: 1 });

        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
        return result.toObject() as Article;
    }

    // Yangi: Comment o'chirish
    public async deleteCommentFromArticle(memberId: ObjectId, commentId: ObjectId): Promise<Article> {
        const targetComment: any = await this.commentService.getCommentById(commentId);
        if (!targetComment || targetComment.memberId.toString() !== memberId.toString() || targetComment.commentStatus === CommentStatus.DELETE) {
            throw new BadRequestException('Comment not found or not authorized');
        }

        const updateInput: CommentUpdate = {
            _id: commentId,
            commentStatus: CommentStatus.DELETE,
        };
        await this.commentService.updateComment(memberId, updateInput);

        const articleId = targetComment.commentRefId;
        const result = await this.articleStatsEditor({ _id: articleId, targetKey: 'articleComments', modifier: -1 });

        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
        return result.toObject() as Article;
    }

    // Yangi: View method
    public async viewArticle(memberId: ObjectId | null, viewRefId: ObjectId): Promise<Article> {
        const target: any = await this.articleModel.findOne({ _id: viewRefId, articleStatus: ArticleStatus.ACTIVE }).exec();
        if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        const input = { 
            viewRefId, 
            viewGroup: ViewGroup.ARTICLE 
        };

        const newView = await this.viewService.recordView({ ...input, memberId: memberId || null });
        let modifier = 0;
        if (newView) {
            modifier = 1;
            await this.articleStatsEditor({ _id: viewRefId, targetKey: 'articleViews', modifier });
        }

        const result = await this.articleModel.findById(viewRefId).exec(); // Updated result
        return result.toObject() as Article;
    }

    public async getAllArticlesByAdmin(input: AllArticlesInquiry): Promise<Articles> {
        const { articleStatus, articleCategory } = input.search;
        const match: T = {};
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
    
        if (articleStatus) match.articleStatus = articleStatus;
        if (articleCategory) match.articleCategory = articleCategory;
    
        const result = await this.articleModel // Rename
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * input.limit },
                            { $limit: input.limit },
                            lookupMember,
                            { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec()
        if(!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
            
        return result[0] as Articles;
    } 
    
    public async updateArticleByAdmin(input: ArticleUpdate): Promise<Article> {
        const { _id, articleStatus } = input;
        
        const result = await this.articleModel // Rename
            .findOneAndUpdate( {_id: _id, articleStatus: ArticleStatus.ACTIVE}, input, { 
                new: true, 
            })
            .exec();
        if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
            
        if(articleStatus ===  ArticleStatus.DELETE) {
            await this.memberService.memberStatsEditor({
                _id: result.memberId,
                targetKey: 'memberArticles',
                modifier: -1,
            });
        }
    
        return result.toObject() as Article;
    }
    
    public async removeArticleByAdmin(articleId: ObjectId): Promise<Article> {
        const search: T = { _id: articleId, articleStatus: ArticleStatus.DELETE };
        const result = await this.articleModel.findOneAndUpdate(search, { articleStatus: ArticleStatus.DELETE }, { new: true }).exec(); // Delete o'rniga status DELETE
        if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
            
        return result.toObject() as Article;
    }

    public async articleStatsEditor(input: StatisticModifier): Promise<any> { // Rename
        const { _id, targetKey, modifier } = input;
        return await this.articleModel // Rename
            .findByIdAndUpdate(
                _id,
                { $inc: { [targetKey]:  modifier } },
                {
                    new: true,
                },
            )
            .exec()
    }
}