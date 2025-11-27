import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class LikeService {
    constructor(@InjectModel('Like') private readonly likeModel: Model<null>) {}
}
