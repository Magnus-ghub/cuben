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
import { lookupFavorite } from '../../libs/config'; // Agar kerak bo'lsa, yangi lookup'lar qo'shish mumkin

@Injectable()
export class LikeService {
    constructor(@InjectModel('Like') private readonly likeModel: Model<Like>) {}

    // Yangilandi: memberId alohida, input da refId + targetType + action
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
                const fullInput = { ...input, memberId }; // memberId ni qo'shish
                await this.likeModel.create(fullInput);
            } catch (err) {
                console.log('Error, Service.model:', err.message);
                throw new BadGatewayException(Message.CREATE_FAILED);
            }
        }
        console.log(`-Like modifier ${modifier} -`);
        return modifier;
    }

    // Yangilandi: Ma'lum action uchun boolean qaytaradi (LIKE yoki SAVE)
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

    // Yangi: MeLiked uchun (ikkala action ni check qilish)
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

    // Yangilandi: Old LikeGroup o'rniga targetType va action
    public async getFavoriteProducts(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        const { page, limit } = input;
        const match: T = { 
            targetType: LikeTarget.PRODUCT, 
            action: LikeAction.SAVE, 
            memberId 
        };

        const data: T = await this.likeModel
            .aggregate([
                { $match: match },
                { $sort: { updatedAt: -1 } },
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
                    $facet: {
                        list: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit },
                            lookupFavorite, // Agar bu favorite uchun kerak bo'lsa, saqlash
                            { $unwind: { path: '$favoriteProduct.memberData', preserveNullAndEmptyArrays: true } },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        console.log('Aggregate Data:', data);
        
        const result: Products = { list: [], metaCounter: data[0]?.metaCounter || [] };
        result.list = data[0]?.list.map((ele) => ele.favoriteProduct) || [];

        return result;    
    }
}