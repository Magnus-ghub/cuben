import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { View } from '../../libs/dto/view/view';
import { Model, ObjectId } from 'mongoose';
import { ViewInput } from '../../libs/dto/view/view.input';
import { T } from '../../libs/types/common';
import { OrdinaryInquiry } from '../../libs/dto/product/product.input';
import { Products } from '../../libs/dto/product/product';
import { ViewGroup } from '../../libs/enums/view.enum';
import { lookupVisit } from '../../libs/config';
import { ArticlesInquiry } from '../../libs/dto/article/article.input'; // Article uchun, agar kerak bo'lsa
import { Articles } from '../../libs/dto/article/article'; // Article uchun

@Injectable()
export class ViewService {
    constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

    // Yangilandi: memberId optional (null for anonymous), return boolean (new view yaratilganmi)
    public async recordView(input: ViewInput & { memberId?: ObjectId }): Promise<boolean> {
        const viewExist = await this.checkViewExistence(input);
        if (!viewExist) {
            console.log('- New View Insert -');
            await this.viewModel.create(input); // memberId ni qo'shish (null bo'lsa ham)
            return true; // New view yaratildi
        } else {
            return false; // Mavjud edi
        } 
    }

    // Yangilandi: Boolean qaytaradi (mavjudmi), memberId null ni handle qiladi
    private async checkViewExistence(input: ViewInput & { memberId?: ObjectId }): Promise<boolean> {
        const { memberId, viewRefId, viewGroup } = input;
        const search: T = { 
            memberId: memberId || null,  // Null bo'lsa ham search qiladi (sparse index orqali)
            viewRefId, 
            viewGroup 
        };
        const result = await this.viewModel.findOne(search).exec();
        return !!result;
    }

    // Yangilandi: Sort 'updatedAt' ga o'zgartirildi, viewGroup bilan moslashtirildi
    public async getVisitedProducts(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        const { page, limit } = input;
        const match: T = { 
            viewGroup: ViewGroup.PRODUCT, 
            memberId  // Faqat auth user uchun
        };

        const data: T = await this.viewModel
            .aggregate([
                { $match: match },
                { $sort: { updatedAt: -1 } }, // 'updateAt' → 'updatedAt'
                {
                    $lookup: {
                        from: 'products',
                        localField: 'viewRefId',
                        foreignField: '_id',
                        as: 'visitedProduct',
                    },
                },
                { $unwind: '$visitedProduct' },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * limit },
                            { $limit: limit },
                            lookupVisit, // Saqlash, agar kerak bo'lsa
                            { $unwind: { path: '$visitedProduct.memberData', preserveNullAndEmptyArrays: true } },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        console.log('Aggregate Data:', data);
        
        const result: Products = { list: [], metaCounter: data[0]?.metaCounter || [] };
        result.list = data[0]?.list.map((ele) => ele.visitedProduct) || [];

        return result;    
    }

    // Yangi: Article uchun getVisitedArticles (shunga o'xshash, article da ishlatish uchun)
    public async getVisitedArticles(memberId: ObjectId, input: OrdinaryInquiry): Promise<Articles> { // OrdinaryInquiry ni ishlatdim, lekin ArticlesInquiry ham mumkin
        const { page, limit } = input;
        const match: T = { 
            viewGroup: ViewGroup.ARTICLE, 
            memberId 
        };

        const data: T = await this.viewModel
            .aggregate([
                { $match: match },
                { $sort: { updatedAt: -1 } },
                {
                    $lookup: {
                        from: 'articles', // Collection 'articles' deb faraz
                        localField: 'viewRefId',
                        foreignField: '_id',
                        as: 'visitedArticle',
                    },
                },
                { $unwind: '$visitedArticle' },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * limit },
                            { $limit: limit },
                            lookupVisit, // Agar article uchun mos lookup bo'lsa, o'zgartiring (masalan, lookupArticle)
                            { $unwind: { path: '$visitedArticle.memberData', preserveNullAndEmptyArrays: true } },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();

        console.log('Aggregate Data for Articles:', data);
        
        const result: Articles = { list: [], metaCounter: data[0]?.metaCounter || [] };
        result.list = data[0]?.list.map((ele) => ele.visitedArticle) || [];

        return result;    
    }
}