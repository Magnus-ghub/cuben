import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MemberService } from '../member/member.service';
import { ProductService } from '../product/product.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { Model, ObjectId } from 'mongoose';
import { CommentInput } from '../../libs/dto/comment/comment.input';
import { Message } from '../../libs/enums/common.enum';
import { Comment } from '../../libs/dto/comment/comment';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';

@Injectable()
export class CommentService {
    constructor(
        @InjectModel('Comment') private readonly commentModel: Model<Comment>,
        private readonly memberService: MemberService,
        private readonly productService: ProductService,
        private readonly boardArticleService: BoardArticleService,
    ){}

    public async createComment(input: CommentInput, memberId: ObjectId): Promise<Comment> {
        input.memberId = memberId;

        let result = null;
        try {
            result = await this.commentModel.create(input);
        } catch (err) {
            console.log('Error, Service.model:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }

        switch (input.commentGroup) {
            case CommentGroup.PRODUCT:
                await this.productService.productStatsEditor({
                    _id: input.commentRefId,
                    targetKey: 'productComments',
                    modifier: 1,
                });
                break;
            case CommentGroup.ARTICLE:
                await this.boardArticleService.boardArticleStatsEditor({
                    _id: input.commentRefId,
                    targetKey: 'articleComments',
                    modifier: 1,
                })
                break;
            case CommentGroup.MEMBER:
                await this.memberService.memberStatsEditor({
                    _id: input.commentRefId,
                    targetKey: 'memberComments',
                    modifier: 1,
                });
                break;
        }

        if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
        return result;
    }

    public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
            let { _id } = input;
          
            const result = await this.commentModel.findOneAndUpdate(
                {
                    _id: _id,
                    memberId: memberId,
                    commentStatus: CommentStatus.ACTIVE
                },
                input,
                {
                    new: true,
                },
            )
            .exec();
            if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
            return result;
        }
}
