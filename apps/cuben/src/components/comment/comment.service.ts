import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MemberService } from '../member/member.service';
import { ProductService } from '../product/product.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { Model } from 'mongoose';

@Injectable()
export class CommentService {
    constructor(
        @InjectModel('Comment') private readonly commentModel: Model<null>,
        private readonly memberServise: MemberService,
        private readonly productServise: ProductService,
        private readonly boardArticleServise: BoardArticleService,
    ){}
}
