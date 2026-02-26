import { Schema } from 'mongoose';
import { ViewGroup } from '../libs/enums/view.enum';

const ViewSchema = new Schema(
	{
		viewGroup: {
			type: String,
			enum: Object.values(ViewGroup),
			required: true,
		},

		viewRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
			required: false,
		},
	},
	{ timestamps: true, collection: 'views' },
);

ViewSchema.index(
	{ memberId: 1, viewRefId: 1, viewGroup: 1 },
	{ unique: true, sparse: true },
);

export default ViewSchema;
