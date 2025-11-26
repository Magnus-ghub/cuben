import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ProductService } from './product.service';
import { Product } from '../../libs/dto/product/product';
import { ProductInput } from '../../libs/dto/product/product.input';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';

@Resolver()
export class ProductResolver {
    constructor(private readonly productService: ProductService) {}

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
}
