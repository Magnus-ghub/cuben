import { Schema } from 'mongoose';
import { PostStatus } from '../libs/enums/post.enum';

const PostSchema = new Schema(
	{
		postStatus: {
			type: String,
			enum: PostStatus,
			default: PostStatus.ACTIVE,
		},

		postTitle: {
			type: String,
			required: true,
		},

		postContent: {
			type: String,
			required: true,
		},

		postImages: {
			type: [String],
			default: [],
		},

		postLikes: {
			type: Number,
			default: 0,
		},

		postSaves: {
			type: Number,
			default: 0,
		},

		postComments: {
			type: Number,
			default: 0,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		blockedAt: { type: Date },
		deletedAt: { type: Date },
	},
	{ timestamps: true, collection: 'posts' },
);

export default PostSchema;
