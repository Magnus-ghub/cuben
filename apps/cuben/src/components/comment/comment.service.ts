import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { ArticleService } from '../article/article.service'; // Rename
import { MemberService } from '../member/member.service';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { Comments, Comment } from '../../libs/dto/comment/comment';
import { T } from '../../libs/types/common';
import { lookupMember } from '../../libs/config';
import { ProductService } from '../product/product.service';
import { PostService } from '../post/post.service';
import { LikeService } from '../like/like.service';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		private readonly memberService: MemberService,
		private readonly productService: ProductService,
		private readonly articleService: ArticleService, // Rename
        private readonly postService: PostService,
        private readonly likeService: LikeService,
	) {}

	public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
		const fullInput = { ...input, memberId };

		let result = null;
		try {
			result = await this.commentModel.create(fullInput);
		} catch (err) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		// Counter update
		switch (input.commentGroup) {
			case CommentGroup.ARTICLE:
				await this.articleService.articleStatsEditor({ // Rename
					_id: input.commentRefId,
					targetKey: 'articleComments',
					modifier: 1,
				});
				break;
			case CommentGroup.POST:
				await this.postService.postStatsEditor({
					_id: input.commentRefId,
					targetKey: 'postComments',
					modifier: 1,
				});
				break;
		}

		if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
		return result.toObject() as Comment;
	}

	public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
		const { _id, commentStatus: newStatus } = input;
		const oldComment: any = await this.commentModel.findById(_id).exec();
		if (!oldComment) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const result = await this.commentModel
			.findOneAndUpdate(
				{
					_id: _id,
					memberId: memberId,
					commentStatus: CommentStatus.ACTIVE,
				},
				input,
				{
					new: true,
				},
			)
			.exec();

		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		// Agar status DELETE ga o'zgarsa, counter -1
		if (newStatus === CommentStatus.DELETE && oldComment.commentStatus === CommentStatus.ACTIVE) {
			switch (oldComment.commentGroup) {
				case CommentGroup.ARTICLE:
					await this.articleService.articleStatsEditor({ // Rename
						_id: oldComment.commentRefId,
						targetKey: 'articleComments',
						modifier: -1,
					});
					break;
				case CommentGroup.POST:
					await this.postService.postStatsEditor({
						_id: oldComment.commentRefId,
						targetKey: 'postComments',
						modifier: -1,
					});
					break;
			}
		}

		return result.toObject() as Comment;
	}

	public async getComments(memberId: ObjectId | null, input: CommentsInquiry): Promise<Comments> {
		const { commentRefId } = input.search;
		const match: T = { 
			commentRefId, 
			commentStatus: CommentStatus.ACTIVE 
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result: any[] = await this.commentModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0] as Comments;
	}

	public async removeCommentByAdmin(input: ObjectId): Promise<Comment> {
		const targetComment: any = await this.commentModel.findById(input).exec();
		if (!targetComment) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const result = await this.commentModel
			.findByIdAndUpdate(
				input,
				{ commentStatus: CommentStatus.DELETE },
				{ new: true }
			)
			.exec();

		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		// Counter -1
		switch (targetComment.commentGroup) {
			case CommentGroup.ARTICLE:
				await this.articleService.articleStatsEditor({ // Rename
					_id: targetComment.commentRefId,
					targetKey: 'articleComments',
					modifier: -1,
				});
				break;
			case CommentGroup.POST:
				await this.postService.postStatsEditor({
					_id: targetComment.commentRefId,
					targetKey: 'postComments',
					modifier: -1,
				});
				break;
		}

		return result.toObject() as Comment;
	}

	public async getCommentById(commentId: ObjectId): Promise<Comment | null> {
		return await this.commentModel.findById(commentId).lean().exec();
	}
}