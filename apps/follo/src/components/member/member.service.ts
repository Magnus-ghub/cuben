import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Member } from '../../libs/dto/member/member';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberStatus } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';
import { T } from '../../libs/types/common';

@Injectable()
export class MemberService {
    constructor(
        @InjectModel('Member') private readonly memberModel: Model<Member>,
        private authService: AuthService,
    ) {}

    public async signup(input: MemberInput): Promise<Member> {
        input.memberPassword = await this.authService.hashPassword(input.memberPassword);    
        try {
            const result = await this.memberModel.create(input);
            result.accessToken = await this.authService.createToken(result);
            return result;
        } catch (err) {
            console.log('Error, Service.model:', err.message);
            throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
        }
    }

    public async login(input: LoginInput): Promise<Member> {
        const { memberNick, memberPassword } = input;
        const response: any = await this.memberModel
           .findOne({ memberNick: memberNick})
           .select('+memberPassword')
           .exec();

           if(!response || response.memberStatus === MemberStatus.DELETE) {
             throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
           } else if (response.memberStatus === MemberStatus.BLOCK) {
             throw new InternalServerErrorException(Message.BLOCKED_USER);
           }

           const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword)
           if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);
           response.accessToken = await this.authService.createToken(response);
        
           return response;   
    }

    public async getMember(memberId: ObjectId, targetId: ObjectId): Promise<Member> {
        const search: T = {
            _id: targetId,
            memberStatus: {
                $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
            },
        };
        const targetMember = await this.memberModel.findOne(search).lean().exec();
        if(!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);


        return targetMember;
    }
}
