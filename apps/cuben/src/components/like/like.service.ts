import { BadGatewayException, Injectable } from '@nestjs/common';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeTarget, LikeAction } from '../../libs/enums/like.enum';
import { T } from '../../libs/types/common';
import { Message } from '../../libs/enums/common.enum';
import { OrdinaryInquiry } from '../../libs/dto/product/product.input';
import { Products } from '../../libs/dto/product/product';
import { PostsInquiry } from '../../libs/dto/post/post.input';
import { Posts } from '../../libs/dto/post/post';
import { AllArticlesInquiry } from '../../libs/dto/article/article.input';
import { Articles } from '../../libs/dto/article/article';
import { lookupFavoriteArticle, lookupFavoritePost, lookupFavoriteProduct, lookupSavedArticle, lookupSavedPost, lookupSavedProduct } from '../../libs/config';

@Injectable()
export class LikeService {
    constructor(@InjectModel('Like') private readonly likeModel: Model<Like>) {}

    public async toggleLike(memberId: ObjectId, input: LikeInput): Promise<number> {
        const search: T = { 
            memberId, 
            refId: input.refId, 
            targetType: input.targetType, 
            action: input.action 
        };

        const exist = await this.likeModel.findOne(search).exec();
        let modifier = 1;

        if (exist) {
            await this.likeModel.findOneAndDelete(search).exec();
            modifier = -1;
        } else {
            try {
                await this.likeModel.create({ ...input, memberId });
            } catch (err) {
                console.log('Error, Service.model:', err.message);
                throw new BadGatewayException(Message.CREATE_FAILED);
            }
        }

        console.log(`-Like modifier ${modifier} -`);
        return modifier;
    }

    public async checkLikeExistence(memberId: ObjectId, input: LikeInput): Promise<boolean> {
        const search: T = { 
            memberId, 
            refId: input.refId, 
            targetType: input.targetType, 
            action: input.action 
        };
        const result = await this.likeModel.findOne(search).exec();
        return !!result;
    }

    public async getMeLiked(memberId: ObjectId, refId: ObjectId, targetType: LikeTarget): Promise<MeLiked> {
        const liked = await this.checkLikeExistence(memberId, {
            refId,
            targetType,
            action: LikeAction.LIKE,
        });

        const saved = await this.checkLikeExistence(memberId, {
            refId,
            targetType,
            action: LikeAction.SAVE,
        });

        return { liked, saved };
    }

    public async getBulkMeLiked(
        memberId: ObjectId, 
        productIds: ObjectId[], 
        targetType: LikeTarget
    ): Promise<Map<string, MeLiked>> {
        if (!productIds.length) return new Map();

        // Barcha likes va saves ni bir queryda olish
        const likes = await this.likeModel.find({
            memberId,
            refId: { $in: productIds },
            targetType,
        }).lean().exec();

        // Map yaratish: productId -> MeLiked
        const result = new Map<string, MeLiked>();
        
        // Har bir product uchun default qiymat
        productIds.forEach(id => {
            result.set(id.toString(), { liked: false, saved: false });
        });

        // Likes va saves ni map ga qo'shish
        likes.forEach(like => {
            const key = like.refId.toString();
            const current = result.get(key);
            
            if (like.action === LikeAction.LIKE) {
                current.liked = true;
            } else if (like.action === LikeAction.SAVE) {
                current.saved = true;
            }
            
            result.set(key, current);
        });

        return result;
    }

    public async getFavoriteProducts(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        const { page, limit } = input;
        
        const match: T = { 
            targetType: LikeTarget.PRODUCT, 
            action: LikeAction.LIKE,
            memberId 
        };

        const data: T = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'refId',
                        foreignField: '_id',
                        as: 'favoriteProduct',
                    },
                },
                { $unwind: '$favoriteProduct' },
                {
                    $match: {
                        'favoriteProduct.productStatus': 'ACTIVE'
                    }
                },
                {
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            lookupFavoriteProduct,
                            { 
                                $unwind: { 
                                    path: '$favoriteProduct.memberData', 
                                    preserveNullAndEmptyArrays: true 
                                } 
                            },
                            {
                                $lookup: {
                                    from: 'likes',
                                    let: { productId: '$favoriteProduct._id' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $and: [
                                                        { $eq: ['$memberId', memberId] },
                                                        { $eq: ['$refId', '$$productId'] },
                                                        { $eq: ['$targetType', LikeTarget.PRODUCT] },
                                                        { $eq: ['$action', LikeAction.SAVE] },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'saveStatus',
                                },
                            },
                            {
                                $addFields: {
                                    'favoriteProduct.meLiked': {
                                        liked: true,  
                                        saved: { $gt: [{ $size: '$saveStatus' }, 0] }  
                                    }
                                }
                            },
                            { $project: { saveStatus: 0 } }  
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Products = {list: [], metaCounter: data[0].metaCounter };
        result.list = data[0].list.map((ele) => ele.favoriteProduct);
        
        console.log('✅ Favorites:', result.list.length);
        return result;
    }

    public async getSavedProducts(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        const { page, limit } = input;
        
        const match: T = { 
            targetType: LikeTarget.PRODUCT, 
            action: LikeAction.SAVE,
            memberId 
        };

        const data: T = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'refId',
                        foreignField: '_id',
                        as: 'savedProduct',
                    },
                },
                { $unwind: '$savedProduct' },
                {
                    $match: {
                        'savedProduct.productStatus': 'ACTIVE'
                    }
                },
                {
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            lookupSavedProduct,
                            { 
                                $unwind: { 
                                    path: '$savedProduct.memberData', 
                                    preserveNullAndEmptyArrays: true 
                                } 
                            },
                            {
                                $lookup: {
                                    from: 'likes',
                                    let: { productId: '$savedProduct._id' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $and: [
                                                        { $eq: ['$memberId', memberId] },
                                                        { $eq: ['$refId', '$$productId'] },
                                                        { $eq: ['$targetType', LikeTarget.PRODUCT] },
                                                        { $eq: ['$action', LikeAction.LIKE] },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'likeStatus',
                                },
                            },
                            {
                                $addFields: {
                                    'savedProduct.meLiked': {
                                        liked: { $gt: [{ $size: '$likeStatus' }, 0] },  
                                        saved: true    
                                    }
                                }
                            },
                            { $project: { likeStatus: 0 } }  
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Products = {list: [], metaCounter: data[0].metaCounter };
        result.list = data[0].list.map((ele) => ele.savedProduct);
        
        console.log('Saved Items:', result.list.length);
        return result;
    }

    public async getFavoritePosts(memberId: ObjectId, input: PostsInquiry): Promise<Posts> {
        const { page, limit } = input;
        
        const match: T = { 
            targetType: LikeTarget.POST, 
            action: LikeAction.LIKE,
            memberId 
        };

        const data: T = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'posts',
                        localField: 'refId',
                        foreignField: '_id',
                        as: 'favoritePost',
                    },
                },
                { $unwind: '$favoritePost' },
                {
                    $match: {
                        'favoritePost.postStatus': 'ACTIVE'
                    }
                },
                {
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            lookupFavoritePost,
                            { 
                                $unwind: { 
                                    path: '$favoritePost.memberData', 
                                    preserveNullAndEmptyArrays: true 
                                } 
                            },
                            {
                                $lookup: {
                                    from: 'likes',
                                    let: { postId: '$favoritePost._id' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $and: [
                                                        { $eq: ['$memberId', memberId] },
                                                        { $eq: ['$refId', '$$postId'] },
                                                        { $eq: ['$targetType', LikeTarget.POST] },
                                                        { $eq: ['$action', LikeAction.SAVE] },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'saveStatus',
                                },
                            },
                            {
                                $addFields: {
                                    'favoritePost.meLiked': {
                                        liked: true,  
                                        saved: { $gt: [{ $size: '$saveStatus' }, 0] }  
                                    }
                                }
                            },
                            { $project: { saveStatus: 0 } } 
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Posts = {list: [], metaCounter: data[0].metaCounter };
        result.list = data[0].list.map((ele) => ele.favoritePost);
        
        console.log('✅ Favorites:', result.list.length);
        return result;
    }

    public async getSavedPosts(memberId: ObjectId, input: PostsInquiry): Promise<Posts> {
        const { page, limit } = input;
        
        const match: T = { 
            targetType: LikeTarget.POST, 
            action: LikeAction.SAVE,
            memberId 
        };

        const data: T = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'posts',
                        localField: 'refId',
                        foreignField: '_id',
                        as: 'savedPost',
                    },
                },
                { $unwind: '$savedPost' },
                {
                    $match: {
                        'savedPost.postStatus': 'ACTIVE'
                    }
                },
                {
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            lookupSavedPost,
                            { 
                                $unwind: { 
                                    path: '$savedPost.memberData', 
                                    preserveNullAndEmptyArrays: true 
                                } 
                            },
                            // LIKE status lookup (ikkala holatni ham tekshirish)
                            {
                                $lookup: {
                                    from: 'likes',
                                    let: { postId: '$savedPost._id' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $and: [
                                                        { $eq: ['$memberId', memberId] },
                                                        { $eq: ['$refId', '$$postId'] },
                                                        { $eq: ['$targetType', LikeTarget.POST] },
                                                        { $eq: ['$action', LikeAction.LIKE] },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'likeStatus',
                                },
                            },
                            // MeLiked qo'shish
                            {
                                $addFields: {
                                    'savedPost.meLiked': {
                                        liked: { $gt: [{ $size: '$likeStatus' }, 0] }, 
                                        saved: true    
                                    }
                                }
                            },
                            { $project: { likeStatus: 0 } }  
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Posts = {list: [], metaCounter: data[0].metaCounter };
        result.list = data[0].list.map((ele) => ele.savedPost);
        
        console.log('Saved Items:', result.list.length);
        return result;
    }

    public async getFavoriteArticles(memberId: ObjectId, input: AllArticlesInquiry): Promise<Articles> {
        const { page, limit } = input;
        
        const match: T = { 
            targetType: LikeTarget.ARTICLE, 
            action: LikeAction.LIKE,
            memberId 
        };

        const data: T = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'articles',
                        localField: 'refId',
                        foreignField: '_id',
                        as: 'favoriteArticle',
                    },
                },
                { $unwind: '$favoriteArticle' },
                {
                    $match: {
                        'favoriteArticle.articleStatus': 'ACTIVE'
                    }
                },
                {
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            lookupFavoriteArticle,
                            { 
                                $unwind: { 
                                    path: '$favoriteArticle.memberData', 
                                    preserveNullAndEmptyArrays: true 
                                } 
                            },
                            // SAVE status lookup (ikkala holatni ham tekshirish)
                            {
                                $lookup: {
                                    from: 'likes',
                                    let: { articleId: '$favoriteArticle._id' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $and: [
                                                        { $eq: ['$memberId', memberId] },
                                                        { $eq: ['$refId', '$$articleId'] },
                                                        { $eq: ['$targetType', LikeTarget.ARTICLE] },
                                                        { $eq: ['$action', LikeAction.SAVE] },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'saveStatus',
                                },
                            },
                            // MeLiked qo'shish
                            {
                                $addFields: {
                                    'favoriteArticle.meLiked': {
                                        liked: true,  
                                        saved: { $gt: [{ $size: '$saveStatus' }, 0] }  
                                    }
                                }
                            },
                            { $project: { saveStatus: 0 } } 
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Articles = {list: [], metaCounter: data[0].metaCounter };
        result.list = data[0].list.map((ele) => ele.favoriteArticle);
        
        console.log('✅ Favorites:', result.list.length);
        return result;
    }

}