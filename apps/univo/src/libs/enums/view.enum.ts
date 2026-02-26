import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	ARTICLE = 'ARTICLE',
	PRODUCT = 'PRODUCT',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
