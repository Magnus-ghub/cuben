import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PRODUCT = 'PRODUCT',
	POST = 'POST',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
