import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Product, Products } from '../../libs/dto/product/product';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { OrdinaryInquiry, ProductInput, ProductsInquiry } from '../../libs/dto/product/product.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import moment from 'moment';
import { StatisticModifier, T } from '../../libs/types/common';
import { ProductStatus } from '../../libs/enums/product.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ProductUpdate } from '../../libs/dto/product/product.update';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { LikeTarget, LikeAction } from '../../libs/enums/like.enum';
import { LikeInput } from '../../libs/dto/like/like.input';

@Injectable()
export class ProductService {
    constructor(
        @InjectModel('Product') private readonly productModel: Model<Product>,
        private memberService: MemberService,
        private viewService: ViewService,
        private likeService: LikeService,
    ) {}

    public async createProduct(input: ProductInput): Promise<Product> {
        try {
            const result = await this.productModel.create(input);
            await this.memberService.memberStatsEditor({
                _id: result.memberId,
                targetKey: 'memberProducts',
                modifier: 1,
            });
            return result.toObject() as Product;
        } catch (err) {
            console.log('Error, Service.model:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    public async getProduct(memberId: ObjectId | null, productId: ObjectId): Promise<Product> {
        const search: T = {
            _id: productId,
            productStatus: ProductStatus.ACTIVE,
        };

        const targetProduct: any = await this.productModel.findOne(search).lean().exec();
        if (!targetProduct) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        // View check/create (+1)
        if (memberId) {
            const viewInput = { viewRefId: productId, viewGroup: ViewGroup.PRODUCT };
            const newView = await this.viewService.recordView({ ...viewInput, memberId });
            if (newView) {
                await this.productStatsEditor({ _id: productId, targetKey: 'productViews', modifier: 1 });
                targetProduct.productViews++;
            }
        } else {
            // Anonymous
            const viewInput = { viewRefId: productId, viewGroup: ViewGroup.PRODUCT };
            const newView = await this.viewService.recordView(viewInput);
            if (newView) {
                await this.productStatsEditor({ _id: productId, targetKey: 'productViews', modifier: 1 });
                targetProduct.productViews++;
            }
        }

        // meLiked
        if (memberId) {
            targetProduct.meLiked = await this.likeService.getMeLiked(memberId, productId, LikeTarget.PRODUCT);
        } else {
            targetProduct.meLiked = { liked: false, saved: false };
        }

        // Member data
        targetProduct.memberData = await this.memberService.getMember(null, targetProduct.memberId);
        
        return targetProduct as Product;
    }

    public async updateProduct(memberId: ObjectId, input: ProductUpdate): Promise<Product> {
        let { productStatus, soldAt, deletedAt } = input;
        const search: T = {
            _id: input._id,
            memberId: memberId,
            productStatus: ProductStatus.ACTIVE,
        };

        if (productStatus === ProductStatus.SOLD) soldAt = moment().toDate();
        else if (productStatus === ProductStatus.DELETE) deletedAt = moment().toDate();

        const result = await this.productModel.findOneAndUpdate(search, input, { new: true }).exec();
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

        if (soldAt || deletedAt) {
            await this.memberService.memberStatsEditor({
                _id: memberId,
                targetKey: 'memberProducts',
                modifier: -1,
            });
        }

        return result.toObject() as Product;
    }

    public async removeProduct(productId: ObjectId): Promise<Product> {
        const search: T = { _id: productId, productStatus: ProductStatus.ACTIVE };
        const result = await this.productModel.findOneAndDelete(search).exec();
        if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
            
        return result;
    }

    public async getProducts(memberId: ObjectId | null, input: ProductsInquiry): Promise<Products> {
        const match: T = { productStatus: ProductStatus.ACTIVE };
        const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

        this.shapeMatchQuery(match, input);
        console.log('match:', match);

        // Agar user login qilmagan bo'lsa
        if (!memberId) {
            const result = await this.productModel
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
                .exec();
            
            if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
            return result[0] as Products;
        }

        // User login qilgan bo'lsa - meLiked bilan
        const result = await this.productModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * input.limit },
                            { $limit: input.limit },
                            // LIKE lookup
                            {
                                $lookup: {
                                    from: 'likes',
                                    let: { productId: '$_id' },
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
                                    as: 'likedStatus',
                                },
                            },
                            // SAVE lookup
                            {
                                $lookup: {
                                    from: 'likes',
                                    let: { productId: '$_id' },
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
                                    as: 'savedStatus',
                                },
                            },
                            // MeLiked yaratish
                            {
                                $addFields: {
                                    meLiked: {
                                        liked: { $gt: [{ $size: '$likedStatus' }, 0] },
                                        saved: { $gt: [{ $size: '$savedStatus' }, 0] }
                                    }
                                }
                            },
                            { $project: { likedStatus: 0, savedStatus: 0 } },
                            lookupMember,
                            { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();
        
        if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
        return result[0] as Products;
    }

    // ❤️ MY FAVORITES
    public async getLikedProducts(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        console.log('📋 Getting Favorite Products (LIKED)...');
        return await this.likeService.getFavoriteProducts(memberId, input);
    }

    // 💾 SAVED ITEMS
    public async getSavedProducts(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        console.log('📋 Getting Saved Products...');
        return await this.likeService.getSavedProducts(memberId, input);
    }

    // 👁️ VISITED
    public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        return await this.viewService.getVisitedProducts(memberId, input);
    }

    private shapeMatchQuery(match: T, input: ProductsInquiry): void {
        const { memberId, typeList, periodsRange, pricesRange, text, condition } = input.search;
        
        if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
        if (typeList && typeList.length) match.productType = { $in: typeList };
        if (condition) match.productCondition = condition;
        if (pricesRange) match.productPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
        if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };

        if (text) match.$or = [
            { productName: { $regex: new RegExp(text, 'i') } },
            { productDesc: { $regex: new RegExp(text, 'i') } }
        ];
    }

    // ❤️ LIKE TOGGLE
    public async likeTargetProduct(memberId: ObjectId, likeRefId: ObjectId): Promise<Product> {
        const target: any = await this.productModel
            .findOne({ _id: likeRefId, productStatus: ProductStatus.ACTIVE })
            .exec();
        if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        const input: LikeInput = {
            refId: likeRefId,
            targetType: LikeTarget.PRODUCT,
            action: LikeAction.LIKE,
        };

        const modifier: number = await this.likeService.toggleLike(memberId, input); 
        const result = await this.productStatsEditor({ 
            _id: likeRefId, 
            targetKey: 'productLikes', 
            modifier: modifier 
        });

        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
        return result.toObject() as Product;
    }

    // 💾 SAVE TOGGLE
    public async saveTargetProduct(memberId: ObjectId, saveRefId: ObjectId): Promise<Product> {
        const target: any = await this.productModel
            .findOne({ _id: saveRefId, productStatus: ProductStatus.ACTIVE })
            .exec();
        if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        const input: LikeInput = {
            refId: saveRefId,
            targetType: LikeTarget.PRODUCT,
            action: LikeAction.SAVE,
        };

        const modifier: number = await this.likeService.toggleLike(memberId, input);
        const result = await this.productStatsEditor({ 
            _id: saveRefId, 
            targetKey: 'productSaves', 
            modifier: modifier 
        });

        if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
        return result.toObject() as Product;
    }

    public async productStatsEditor(input: StatisticModifier): Promise<any> {
        const { _id, targetKey, modifier } = input;
        return await this.productModel
            .findByIdAndUpdate(
                _id,
                { $inc: { [targetKey]: modifier } },
                { new: true }
            )
            .exec();
    }
}