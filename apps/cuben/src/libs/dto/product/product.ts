import { Field, Int, ObjectType } from "@nestjs/graphql";
import { ObjectId } from "mongoose";
import { ProductLocation, ProductStatus, ProductType } from "../../enums/product.enum";
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

    @Field(() => ProductLocation)
    productLocation: ProductLocation;

    @Field(() => String, { nullable: true })
    productAddress: string;

    @Field(() => String)
    productTitle: string;

    @Field(() => String, { nullable: true })
    productDesc?: string;

    @Field(() => Number)
    productPrice: number;

    @Field(() => Boolean)
    isNegotiable: boolean;

    @Field(() => Int)
    productViews: number;

    @Field(() => Int)
    productLikes: number;

    @Field(() => Int)
    productComments: number;

    @Field(() => Int)
    productRank: number;

    @Field(() => [String])
    productImages: string[];

    @Field(() => String)
    productCondition: string; 

    @Field(() => String)
    memberId: ObjectId;

    @Field(() => Int)
    reportCount: number;

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

    @Field(() => [MeLiked], {nullable: true})
    meLiked?: MeLiked[];

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
