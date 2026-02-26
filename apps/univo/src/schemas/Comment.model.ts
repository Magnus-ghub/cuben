import { Schema } from 'mongoose';
import { CommentGroup, CommentStatus } from '../libs/enums/comment.enum';

const CommentSchema = new Schema(
	{
		commentStatus: {
			type: String,
			enum: Object.values(CommentStatus),
			default: CommentStatus.ACTIVE,
		},

		commentGroup: {
			type: String,
			enum: Object.values(CommentGroup),
			required: true,
		},

		commentContent: {
			type: String,
			required: true,
		},

		commentRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
	},
	{ timestamps: true, collection: 'comments' },
);

CommentSchema.index({ commentGroup: 1, commentRefId: 1, commentStatus: 1, createdAt: -1 });

export default CommentSchema;
