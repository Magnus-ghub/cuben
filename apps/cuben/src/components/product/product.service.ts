import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Product } from '../../libs/dto/product/product';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { ProductInput } from '../../libs/dto/product/product.input';
import { Message } from '../../libs/enums/common.enum';
import moment from 'moment';
import { StatisticModifier, T } from '../../libs/types/common';
import { ProductStatus } from '../../libs/enums/product.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ProductUpdate } from '../../libs/dto/product/product.update';

@Injectable()
export class ProductService {
    constructor(
        @InjectModel('Product') private readonly productModel: Model<Product>,
        private memberService: MemberService,
        private viewService: ViewService,
        //like service
    ) {}

    public async createProduct(input: ProductInput): Promise<Product> {
        try {
            const result = await this.productModel.create(input);
            await this.memberService.memberStatsEditor({
                _id: result.memberId,
                targetKey: 'memberProducts',
                modifier: 1,
            });
            return result;
        } catch (err) {
            console.log('Error, Service.model:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    public async getProduct(memberId: ObjectId, productId: ObjectId): Promise<Product> {
        const search: T = {
            _id: productId,
            productStatus: ProductStatus.ACTIVE,
        };

        const targetProduct: Product = await this.productModel.findOne(search).lean().exec();
        if(!targetProduct) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        targetProduct.memberData = await this.memberService.getMember(null, targetProduct.memberId);
        return targetProduct;
    }
    
    public async updateProduct(memberId: ObjectId, input: ProductUpdate): Promise<Product> {
        let { productStatus, soldAt, deletedAt } = input;
        const search: T =  {
            _id: input._id,
            memberId: memberId,
            propertyStatus: ProductStatus.ACTIVE,
        };

        if (productStatus === ProductStatus.SOLD) soldAt = moment().toDate();
        else if (productStatus === ProductStatus.DELETE) deletedAt = moment().toDate();

        const result = await this.productModel
            .findOneAndUpdate(search, input, { new: true, })
            .exec();
        if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        
        if(soldAt || deletedAt) {
            await this.memberService.memberStatsEditor({
                _id: memberId,
                targetKey: 'memberProducts',
                modifier: -1,
            });
        }

     return result;
    }


    public async productStatsEditor(input: StatisticModifier): Promise<Product> {
        const { _id, targetKey, modifier } = input;
        return await this.productModel
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
