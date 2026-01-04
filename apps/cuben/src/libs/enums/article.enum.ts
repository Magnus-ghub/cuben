import { registerEnumType } from '@nestjs/graphql';

export enum ArticleCategory {
	COMMUNITY = 'COMMUNITY', 
	MARKET = 'MARKET', 
	CAREER = 'CAREER', 
	KNOWLEDGE = 'KNOWLEDGE', 
	EVENTS = 'EVENTS', 
	HELP = 'HELP',
}
registerEnumType(ArticleCategory, { name: 'ArticleCategory' });

export enum ArticleStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(ArticleStatus, { name: 'ArticleStatus' });