import { registerEnumType } from '@nestjs/graphql';

export enum ArticleCategory {
	CAREER = 'CAREER', 
	ANNOUNCEMENTS = 'ANNOUNCEMENTS',
	KNOWLEDGE = 'KNOWLEDGE', 
	EVENTS = 'EVENTS', 
}
registerEnumType(ArticleCategory, { name: 'ArticleCategory' });

export enum ArticleStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(ArticleStatus, { name: 'ArticleStatus' });