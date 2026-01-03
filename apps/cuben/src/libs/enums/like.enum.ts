import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	PRODUCT = 'PRODUCT',
	POST = 'POST',
	ARTICLE = 'ARTICLE',
	SAVE_POST = 'SAVE_POST'
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
