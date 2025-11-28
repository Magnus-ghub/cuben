import { registerEnumType } from '@nestjs/graphql';

export enum BoardArticleCategory {
	COMMUNITY = 'COMMUNITY', 
	MARKET = 'MARKET', 
	CAREER = 'CAREER', 
	KNOWLEDGE = 'KNOWLEDGE', 
	EVENTS = 'EVENTS', 
	HELP = 'HELP',
}
registerEnumType(BoardArticleCategory, {
	name: 'BoardArticleCategory',
});

export enum BoardArticleStatus {
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(BoardArticleStatus, {
	name: 'BoardArticleStatus',
});
