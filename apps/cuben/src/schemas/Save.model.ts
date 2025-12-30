import { Schema } from 'mongoose';
import { SaveGroup } from '../libs/enums/save.enum';

const SaveSchema = new Schema(
	{
		saveGroup: {
			type: String,
			enum: SaveGroup,
			required: true,
		},

		saveRefId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		
		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'save' },
);

SaveSchema.index({ memberId: 1, saveRefId: 1 }, { unique: true });

export default SaveSchema;
