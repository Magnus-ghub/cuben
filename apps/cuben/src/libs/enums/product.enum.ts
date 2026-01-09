import { registerEnumType } from '@nestjs/graphql';

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

export enum ProductLocation {
	DORMITORY = 'DORMITORY',
	MAIN_GATE = 'MAIN_GATE',
	LIBRARY = 'LIBRARY',
	CAFETERIA = 'CAFETERIA',
	SPORT_CENTER = 'SPORT_CENTER',
	STUDENT_CENTER = 'STUDENT_CENTER',
	BUS_STOP = 'BUS_STOP',
	OTHER = 'OTHER',
}
registerEnumType(ProductLocation, {
	name: 'ProductLocation',
});
