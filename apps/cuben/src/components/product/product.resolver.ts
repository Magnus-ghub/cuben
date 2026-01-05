import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProductService } from './product.service';
import { Product, Products } from '../../libs/dto/product/product';
import { OrdinaryInquiry, ProductInput, ProductsInquiry } from '../../libs/dto/product/product.input';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { ProductUpdate } from '../../libs/dto/product/product.update';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class ProductResolver {
    constructor(private readonly productService: ProductService) {}

    // ========== MUTATIONS ==========

    @Roles(MemberType.USER, MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Product)
    public async createProduct(
        @Args('input') input: ProductInput,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Product> {
        console.log('Mutation: createProduct');
        input.memberId = memberId;
        return await this.productService.createProduct(input);
    }

    @Roles(MemberType.USER, MemberType.ADMIN) 
    @UseGuards(RolesGuard)
    @Mutation(() => Product)
    public async updateProduct(
        @Args('input') input: ProductUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Product> {
        console.log('Mutation: updateProduct');
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.productService.updateProduct(memberId, input);
    }

    // ❤️ LIKE TOGGLE
    @UseGuards(AuthGuard)
    @Mutation(() => Product)
    public async likeTargetProduct(
        @Args('productId') input: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Product> {
        console.log('Mutation: likeTargetProduct');
        const likeRefId = shapeIntoMongoObjectId(input);
        return await this.productService.likeTargetProduct(memberId, likeRefId);
    }

    // 💾 SAVE TOGGLE
    @UseGuards(AuthGuard)
    @Mutation(() => Product)
    public async saveTargetProduct(
        @Args('productId') input: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Product> {
        console.log('Mutation: saveTargetProduct');
        const saveRefId = shapeIntoMongoObjectId(input);
        return await this.productService.saveTargetProduct(memberId, saveRefId);
    }

    // ========== QUERIES ==========

    // Single product
    @UseGuards(WithoutGuard)
    @Query(() => Product)
    public async getProduct(
        @Args('productId') input: string, 
        @AuthMember('_id') memberId: ObjectId | null,
    ): Promise<Product> {
        console.log('Query: getProduct');
        const productId = shapeIntoMongoObjectId(input);
        return await this.productService.getProduct(memberId || null, productId);
    }

    // Products list
    @UseGuards(WithoutGuard)
    @Query(() => Products)
    public async getProducts(
        @Args('input') input: ProductsInquiry,
        @AuthMember('_id') memberId: ObjectId | null,
    ): Promise<Products> {
        console.log('Query: getProducts');
        return await this.productService.getProducts(memberId || null, input);
    }

    // ❤️ MY FAVORITES (LIKED products)
    @UseGuards(AuthGuard)
    @Query(() => Products)
    public async getFavorites(
        @Args('input') input: OrdinaryInquiry,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Products> {
        console.log('Query: getFavorites (LIKED products)');
        return await this.productService.getFavorites(memberId, input);
    }

    // 💾 SAVED ITEMS (SAVED products)
    @UseGuards(AuthGuard)
    @Query(() => Products)
    public async getSavedProducts(
        @Args('input') input: OrdinaryInquiry,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Products> {
        console.log('Query: getSavedItems (SAVED products)');
        return await this.productService.getSavedProducts(memberId, input);
    }

    // 👁️ VISITED PRODUCTS
    @UseGuards(AuthGuard)
    @Query(() => Products)
    public async getVisited(
        @Args('input') input: OrdinaryInquiry,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Products> {
        console.log('Query: getVisited');
        return await this.productService.getVisited(memberId, input);
    }
}