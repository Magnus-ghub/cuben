import { registerEnumType } from '@nestjs/graphql';

export enum ProductType {
	BOOK = 'BOOK',
	NOTE = 'NOTE',
	ELECTRONIC = 'ELECTRONIC',
	FASHION = 'FASHION',
	ACCESSORY = 'ACCESSORY',
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
