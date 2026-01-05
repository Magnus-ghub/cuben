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

    // Single product uchun MeLiked
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

    // ⚡ OPTIMIZED: Bir nechta productlar uchun MeLiked (bulk operation)
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

    // ❤️ MY FAVORITES - LIKE action bilan
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
                            // Member lookup
                            {
                                $lookup: {
                                    from: 'members',
                                    localField: 'favoriteProduct.memberId',
                                    foreignField: '_id',
                                    as: 'favoriteProduct.memberData',
                                },
                            },
                            { 
                                $unwind: { 
                                    path: '$favoriteProduct.memberData', 
                                    preserveNullAndEmptyArrays: true 
                                } 
                            },
                            // SAVE status lookup (ikkala holatni ham tekshirish)
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
                            // MeLiked qo'shish
                            {
                                $addFields: {
                                    'favoriteProduct.meLiked': {
                                        liked: true,  // Favorites da bor = liked true
                                        saved: { $gt: [{ $size: '$saveStatus' }, 0] }  // Save qilinganmi?
                                    }
                                }
                            },
                            { $project: { saveStatus: 0 } }  // Temporary field o'chirish
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Products = { 
            list: [], 
            metaCounter: data[0]?.metaCounter?.[0] || { total: 0 }
        };
        
        result.list = data[0]?.list.map((ele) => ele.favoriteProduct) || [];
        
        console.log('✅ Favorites:', result.list.length);
        return result;
    }

    // 💾 SAVED ITEMS - SAVE action bilan
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
                            // Member lookup
                            {
                                $lookup: {
                                    from: 'members',
                                    localField: 'savedProduct.memberId',
                                    foreignField: '_id',
                                    as: 'savedProduct.memberData',
                                },
                            },
                            { 
                                $unwind: { 
                                    path: '$savedProduct.memberData', 
                                    preserveNullAndEmptyArrays: true 
                                } 
                            },
                            // LIKE status lookup (ikkala holatni ham tekshirish)
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
                            // MeLiked qo'shish
                            {
                                $addFields: {
                                    'savedProduct.meLiked': {
                                        liked: { $gt: [{ $size: '$likeStatus' }, 0] },  // Like qilinganmi?
                                        saved: true    // Saved items da bor = saved true
                                    }
                                }
                            },
                            { $project: { likeStatus: 0 } }  // Temporary field o'chirish
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        const result: Products = { 
            list: [], 
            metaCounter: data[0]?.metaCounter?.[0] || { total: 0 }
        };
        
        result.list = data[0]?.list.map((ele) => ele.savedProduct) || [];
        
        console.log('💾 Saved Items:', result.list.length);
        return result;
    }
}