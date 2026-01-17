import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from "class-validator";
import { ObjectId } from "mongoose";
import { ProductCondition, ProductStatus, ProductType } from "../../enums/product.enum";

@InputType()
export class ProductUpdate {
@IsNotEmpty() 
@Field(()=>String)
_id: ObjectId;

@IsOptional()
@Field(()=>ProductType, {nullable: true})
productType?: ProductType;

@IsOptional()
@Field(()=>ProductStatus, {nullable: true})
productStatus?: ProductStatus;

@IsOptional()
@Field(()=>ProductCondition, {nullable: true})
productCondition?: ProductCondition;

@IsOptional()
@Length(3,100)
@Field(()=>String, {nullable: true})
productAddress?: string;

@IsOptional()
@Length(3,100)
@Field(()=>String, {nullable: true})
productName?: string;

@IsOptional()
@Field(()=>Number, {nullable: true})
productPrice?: number;

@IsOptional()
@Field(()=> [String], {nullable: true})
productImages?: string[];

@IsOptional()
@Length(5,500)
@Field(()=>String, {nullable: true})
productDesc?: string;


soldAt?: Date;
deletedAt?: Date;

}