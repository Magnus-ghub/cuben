import { Field, InputType, Int } from "@nestjs/graphql";
import {IsIn, IsInt, IsNotEmpty, IsOptional, Length, Min} from 'class-validator';
import { ProductCondition, ProductStatus, ProductType } from "../../enums/product.enum";
import { ObjectId } from "mongoose";
import {  availableProductSorts } from "../../config";
import { Direction } from "../../enums/common.enum";

@InputType()
export class ProductInput {
  @IsNotEmpty()
  @Field(() => ProductType)
  productType: ProductType;

  @IsNotEmpty()
  @Field(() => ProductCondition)
  productCondition: ProductCondition;

  @IsOptional()
  @Field(() => String, { nullable: true })
  productAddress?: string;

  @IsNotEmpty()
  @Length(3,100)
  @Field(() => String)
  productName: string;

  @IsNotEmpty()
  @Field(() => Number)
  productPrice: number;

  @IsNotEmpty()
  @Field(() => [String])
  productImages: string[];

  @IsOptional()
  @Length(5,500)
  @Field(() => String, {nullable: true})
  productDesc?: string;

  memberId?: ObjectId;
}

@InputType()
export class PriceRange {
    @Field(()=>Int)
    start: number;

    @Field(()=>Int)
    end: number;
}

@InputType()
export class PeriodsRange {
    @Field(()=>Date)
    start: Date;

    @Field(()=>Date)
    end: Date;
}

@InputType()
export class PISearch{
  @IsOptional()
  @Field(() => String, {nullable: true})
  memberId?: ObjectId;    

  @IsOptional()
  @Field(() => [ProductType], {nullable: true})
  typeList?: ProductType[];

  @IsOptional()
  @Field(() => String, { nullable: true })
  condition?: string;

  @IsOptional()
  @Field(() => PriceRange, {nullable: true})
  pricesRange?: PriceRange;

  @IsOptional()
  @Field(() => PeriodsRange, {nullable: true})
  periodsRange?: PeriodsRange;

  @IsOptional()
  @Field(() => String, {nullable: true})
  text?: string;
}

@InputType()
export class ProductsInquiry{
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableProductSorts)
  @Field(() => String, {nullable: true})
  sort?: string;

  @IsOptional()
  @Field(() => Direction, {nullable: true})
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => PISearch) 
  search: PISearch;
}

@InputType()
class APISearch{
  @IsOptional()
  @Field(() => ProductStatus, {nullable: true})
  productStatus?: ProductStatus;
} 

@InputType()
export class AgentProductsInquiry{
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int )
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableProductSorts)
  @Field(() => String, {nullable: true})
  sort?: string;

  @IsOptional()
  @Field(()=> Direction, {nullable: true})
  direction?: Direction;

  @IsOptional()
  @Field(() => ProductStatus, { nullable: true })
  productStatus?: ProductStatus;

  @IsNotEmpty()
  @Field(() => APISearch) 
  search: APISearch;
}

@InputType()
class ALPISearch{
  @IsOptional()
  @Field(() => ProductStatus, {nullable: true})
  productStatus?: ProductStatus;
} 

@InputType()
export class AllProductsInquiry{
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int )
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableProductSorts)
  @Field(() => String, {nullable: true})
  sort?: string;

  @IsOptional()
  @Field(()=> Direction, {nullable: true})
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => ALPISearch) 
  search: ALPISearch;
}

@InputType()
export class OrdinaryInquiry{
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int )
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;
}
