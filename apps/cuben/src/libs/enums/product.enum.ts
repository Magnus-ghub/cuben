import { registerEnumType } from '@nestjs/graphql';
import { error } from 'console';

export enum ProductType {
	EDU = 'EDU', 
	TECH = 'TECH',
	STYLE = 'STYLE',
	HOME = 'HOME',
	SERVICE = 'SERVICE',
	OTHER = 'OTHER',
}
registerEnumType(ProductType, {
	name: 'ProductType',
});

export enum ProductStatus {
	ACTIVE = 'ACTIVE',
	RESERVED = 'RESERVED',
	SOLD = 'SOLD',
	DELETE = 'DELETE',
}
registerEnumType(ProductStatus, {
	name: 'ProductStatus',
});

export enum ProductCondition {
	NEW = 'NEW',
	LIKE_NEW = 'LIKE_NEW',
	GOOD = 'GOOD',
	USED = 'USED',
	BAD = 'BAD',
}
registerEnumType(ProductCondition, {
	name: 'ProductCondition',
});