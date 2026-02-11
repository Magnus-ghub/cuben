import { Schema } from 'mongoose';
import { MemberAuthType, MemberStatus, MemberType } from '../libs/enums/member.enum';

export interface MemberDocument extends Document {
	memberType: string;
	memberStatus: string;
	memberAuthType: string;
	memberPhone?: string;
	memberEmail?: string;
	memberNick: string;
	memberPassword?: string;
	memberFullName?: string;
	memberImage?: string;
}

const MemberSchema = new Schema(
	{
		memberType: {
			type: String,
			enum: MemberType,
			default: MemberType.USER,
		},

		memberStatus: {
			type: String,
			enum: MemberStatus,
			default: MemberStatus.ACTIVE,
		},

		memberAuthType: {
			type: String,
			enum: MemberAuthType,
			default: MemberAuthType.PHONE,
		},

		memberPhone: {
			type: String,
			index: { unique: true, sparse: true },
			required: function (this: any) {
				return this.memberAuthType === MemberAuthType.PHONE;
			},
		},

		memberNick: {
			type: String,
			index: { unique: true, sparse: true },
			required: true,
		},

		memberPassword: {
			type: String,
			select: false,
			required: function (this: any) {
				return this.memberAuthType === MemberAuthType.PHONE;
			},
		},

		memberEmail: {
			type: String,
			index: { unique: true, sparse: true },
		},

		memberFullName: {
			type: String,
		},

		memberImage: {
			type: String,
			default: '',
		},

		memberAddress: String,
		memberDesc: String,

		memberProducts: { type: Number, default: 0 },
		memberPosts: { type: Number, default: 0 },
		memberArticles: { type: Number, default: 0 },
		memberFollowers: { type: Number, default: 0 },
		memberFollowings: { type: Number, default: 0 },
		memberPoints: { type: Number, default: 0 },
		memberLikes: { type: Number, default: 0 },
		memberViews: { type: Number, default: 0 },
		memberComments: { type: Number, default: 0 },
		memberRank: { type: Number, default: 0 },
		memberWarnings: { type: Number, default: 0 },
		memberBlocks: { type: Number, default: 0 },

		deletedAt: Date,
	},
	{ timestamps: true, collection: 'members' },
);

export default MemberSchema;
