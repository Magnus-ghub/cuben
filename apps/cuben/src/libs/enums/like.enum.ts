import { registerEnumType } from '@nestjs/graphql';

export enum LikeTarget {
	MEMBER = 'MEMBER',
	POST = 'POST',
	PRODUCT = 'PRODUCT',
	ARTICLE = 'ARTICLE',
}
registerEnumType(LikeTarget, {
	name: 'LikeTarget',
});

export enum LikeAction {
	LIKE = 'LIKE',
	SAVE = 'SAVE',
}
registerEnumType(LikeAction, {
	name: 'LikeAction',
});
