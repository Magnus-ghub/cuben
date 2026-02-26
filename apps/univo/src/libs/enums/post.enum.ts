import { registerEnumType } from '@nestjs/graphql';


export enum PostStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
	BLOCKED = 'BLOCKED',
}
registerEnumType(PostStatus, {
	name: 'PostStatus',
});




