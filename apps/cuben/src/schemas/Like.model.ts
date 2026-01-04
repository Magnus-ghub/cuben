import { Schema } from 'mongoose';
import { LikeAction, LikeTarget } from '../libs/enums/like.enum';

const LikeSchema = new Schema(
	{
		targetType: {
			type: String,
			enum: Object.values(LikeTarget),
			required: true,
		},

		action: {
			type: String,
			enum: Object.values(LikeAction),
			required: true,
		},

		refId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'likes' },
);

LikeSchema.index(
	{ memberId: 1, refId: 1, targetType: 1, action: 1 },
	{ unique: true },
);

export default LikeSchema;
