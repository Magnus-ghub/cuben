import { Injectable } from '@nestjs/common';
import { MemberService } from '../member/member.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class FollowService {
    constructor(
        @InjectModel('Follow') private readonly followModel: Model<null | null>,
        private readonly memberService: MemberService,
    ) {}
}
