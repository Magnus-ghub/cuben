import { Field, Int, ObjectType } from "@nestjs/graphql";
import { ObjectId } from "mongoose";
import { ProductStatus, ProductType, ProductCondition } from "../../enums/product.enum"; 
import { Member, TotalCounter } from "../member/member";
import { MeLiked } from "../like/like";

@ObjectType()
export class Product {
    @Field(() => String)
    _id: ObjectId;

    @Field(() => ProductType)
    productType: ProductType;

    @Field(() => ProductStatus)
    productStatus: ProductStatus;

    @Field(() => String, { nullable: true })
    productAddress?: string;

    @Field(() => String)
    productName: string;

    @Field(() => String, { nullable: true })
    productDesc?: string;

    @Field(() => Number)
    productPrice: number;

    @Field(() => Int)
    productViews: number;

    @Field(() => Int)
    productLikes: number;

    @Field(() => Int)
    productSaves: number;

    @Field(() => [String])
    productImages: string[];

    @Field(() => ProductCondition) 
    productCondition: ProductCondition; 

    @Field(() => String)
    memberId: ObjectId;

    @Field(() => Boolean)
    isSold: boolean;

    @Field(() => Date, { nullable: true })
    soldAt?: Date;

    @Field(() => Date, { nullable: true })
    deletedAt?: Date;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;

    /** from aggregation */
    @Field(() => MeLiked, {nullable: true}) 
    meLiked?: MeLiked;

    @Field(() => Member, { nullable: true })
    memberData?: Member;
}

@ObjectType()
export class Products {
    @Field(() => [Product])
    list: Product[];

    @Field(() => [TotalCounter], { nullable: true })
    metaCounter: TotalCounter;
}