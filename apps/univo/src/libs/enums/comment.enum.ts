import { registerEnumType } from '@nestjs/graphql';

export enum CommentStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(CommentStatus, {
	name: 'CommentStatus',
});

export enum CommentGroup {
	ARTICLE = 'ARTICLE',
	POST = 'POST',
}
registerEnumType(CommentGroup, {
	name: 'CommentGroup',
});
