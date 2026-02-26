import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { T } from '../../libs/types/common';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Member } from '../../libs/dto/member/member';
import { MemberDocument } from '../../schemas/Member.model';

@Injectable()
export class AuthService {
	constructor(
		private readonly jwtService: JwtService,

		@InjectModel('Member')
		private readonly memberModel: Model<MemberDocument>,
	) {}

	// ================= PASSWORD =================

	public async hashPassword(memberPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt(10);
		return await bcrypt.hash(memberPassword, salt);
	}

	public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	// ================= JWT =================

	public async createToken(member: Member): Promise<string> {
		const payload: T = {};

		const source = member['_doc'] ? member['_doc'] : member;

		Object.keys(source).forEach((key) => {
			payload[key] = source[key];
		});

		delete payload.memberPassword;

		return await this.jwtService.signAsync(payload);
	}

	public async verifyToken(token: string): Promise<Member> {
		const member = await this.jwtService.verifyAsync(token);
		member._id = shapeIntoMongoObjectId(member._id);
		return member;
	}
}
