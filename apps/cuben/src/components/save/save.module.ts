import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SaveService } from './save.service';
import SaveSchema from '../../schemas/Save.model';

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: 'Save',
				schema: SaveSchema,
			},
		]),
	],
	providers: [SaveService],
  exports: [SaveService],
})
export class SaveModule {}
