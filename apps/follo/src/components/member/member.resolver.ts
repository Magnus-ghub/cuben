import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { Member } from '../../libs/dto/member/member';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { InternalServerErrorException, UsePipes, ValidationPipe } from '@nestjs/common';

@Resolver()
export class MemberResolver {
    constructor(private readonly memberService: MemberService) {}

    @Mutation(() => Member)
    @UsePipes(ValidationPipe)
    public async signup(@Args('input') input: MemberInput): Promise<Member> {
        try {
            console.log('Mutation: signup: signup');
            return this.memberService.signup(input)
        } catch (err) {
            console.log('Error, signup:', err);
            throw new InternalServerErrorException(err);
        }
    }

    @Mutation(() => Member)
    @UsePipes(ValidationPipe)
	public async login(@Args('input') input: LoginInput): Promise<Member> {
		try {
            console.log('Mutation: login');
            return this.memberService.login(input);
        } catch (err) {
            console.log('Error, signup:', err);
            throw new InternalServerErrorException(err);
        }
	}
}
