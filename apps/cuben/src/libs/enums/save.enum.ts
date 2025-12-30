import { registerEnumType } from '@nestjs/graphql';

export enum SaveGroup {
	PRODUCT = 'PRODUCT',
	POST = 'POST',
	ARTICLE = 'ARTICLE',
}
registerEnumType(SaveGroup, {
	name: 'SaveGroup',
});
