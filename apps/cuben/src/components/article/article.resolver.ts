import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ArticleService } from './article.service'; // Rename
import { AuthGuard } from '../auth/guards/auth.guard';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Article, Articles } from '../../libs/dto/article/article'; // Rename DTO
import { AllArticlesInquiry, ArticleInput, ArticlesInquiry } from '../../libs/dto/article/article.input'; // Rename
import { ArticleUpdate } from '../../libs/dto/article/article.update'; // Rename
import { LikeAction, LikeTarget } from '../../libs/enums/like.enum'; // Qo'shildi
import { CommentGroup } from '../../libs/enums/comment.enum'; // Comment uchun
import { ViewGroup } from '../../libs/enums/view.enum'; // View uchun

@Resolver()
export class ArticleResolver {
    constructor(private readonly articleService: ArticleService) {} // Rename

    @UseGuards(AuthGuard)
    @Mutation(() => Article)
    public async createArticle(
        @Args('input') input: ArticleInput,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: createArticle');
        return await this.articleService.createArticle(memberId, input)
    }

    @UseGuards(WithoutGuard)
    @Query(() => Article)
    public async getArticle(
        @Args('articleId') input: string, 
        @AuthMember('_id') memberId: ObjectId | null, // Nullable
    ): Promise<Article> {
        console.log('Query: getArticle'); // Mutation emas, Query
        const articleId = shapeIntoMongoObjectId(input);
        return await this.articleService.getArticle(memberId || null, articleId);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Article)
    public async updateArticle(
        @Args('input') input: ArticleUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: updateArticle');
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.articleService.updateArticle(memberId, input);
    }

    @UseGuards(WithoutGuard)
    @Query(() => Articles)
    public async getArticles(
        @Args('input') input: ArticlesInquiry, 
        @AuthMember('_id') memberId: ObjectId | null, // Nullable
    ): Promise<Articles> {
        console.log('Query: getArticles');
        return await this.articleService.getArticles(memberId || null, input)
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Article)
    public async likeTargetArticle(
        @Args('articleId') input: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: likeTargetArticle');
        const likeRefId = shapeIntoMongoObjectId(input);
        return await this.articleService.likeTargetArticle(memberId, likeRefId);
    }

    // Yangi: Save mutation
    @UseGuards(AuthGuard)
    @Mutation(() => Article)
    public async saveTargetArticle(
        @Args('articleId') input: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: saveTargetArticle');
        const saveRefId = shapeIntoMongoObjectId(input);
        return await this.articleService.saveTargetArticle(memberId, saveRefId);
    }

    // Yangi: Comment qo'shish
    @UseGuards(AuthGuard)
    @Mutation(() => Article)
    public async addCommentToArticle(
        @Args('articleId') articleId: string,
        @Args('commentContent') commentContent: string, // Simple string
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: addCommentToArticle');
        const refId = shapeIntoMongoObjectId(articleId);
        return await this.articleService.addCommentToArticle(memberId, refId, commentContent);
    }

    // Yangi: Comment o'chirish
    @UseGuards(AuthGuard)
    @Mutation(() => Article)
    public async deleteCommentFromArticle(
        @Args('commentId') commentId: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: deleteCommentFromArticle');
        const commentRefId = shapeIntoMongoObjectId(commentId);
        return await this.articleService.deleteCommentFromArticle(memberId, commentRefId);
    }

    // Yangi: View mutation (ixtiyoriy)
    @UseGuards(WithoutGuard)
    @Mutation(() => Article)
    public async viewArticle(
        @Args('articleId') input: string,
        @AuthMember('_id') memberId: ObjectId | null,
    ): Promise<Article> {
        console.log('Mutation: viewArticle');
        const viewRefId = shapeIntoMongoObjectId(input);
        return await this.articleService.viewArticle(memberId || null, viewRefId);
    }

    /** ADMIN **/
    @Roles(MemberType.ADMIN) 
    @UseGuards(RolesGuard)
    @Query(() => Articles)
    public async getAllArticlesByAdmin(
        @Args('input') input: AllArticlesInquiry,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Articles> {
        console.log('Query: getAllArticlesByAdmin');
        return await this.articleService.getAllArticlesByAdmin(input);
    }
    
    @Roles(MemberType.ADMIN)  
    @UseGuards(RolesGuard)
    @Mutation(() => Article)
    public async updateArticleByAdmin(
        @Args('input') input: ArticleUpdate,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: updateArticleByAdmin'); // Query emas
        input._id = shapeIntoMongoObjectId(input._id);
        return await this.articleService.updateArticleByAdmin(input);
    }
    
    @Roles(MemberType.ADMIN)  
    @UseGuards(RolesGuard)
    @Mutation(() => Article)
    public async removeArticleByAdmin(
        @Args('articleId') input: string,
        @AuthMember('_id') memberId: ObjectId,
    ): Promise<Article> {
        console.log('Mutation: removeArticleByAdmin'); // Query emas
        const articleId = shapeIntoMongoObjectId(input);
        return await this.articleService.removeArticleByAdmin(articleId);
    }
}