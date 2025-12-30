import { BadGatewayException, Injectable } from '@nestjs/common';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { T } from '../../libs/types/common';
import { Message } from '../../libs/enums/common.enum';
import { Mesaved, Save } from '../../libs/dto/save/save';
import { SaveInput } from '../../libs/dto/save/save.input';

@Injectable()
export class SaveService {
    constructor(@InjectModel('Save') private readonly saveModel: Model<Save>) {}

    public async toggleSave(input: SaveInput): Promise<number> {
        const search: T = { memberId: input.memberId, saveRefId: input.saveRefId },
          exist = await this.saveModel.findOne(search).exec();
        let modifier = 1;
        
        if (exist) {
            await this.saveModel.findOneAndDelete(search).exec();
            modifier = -1;
        } else {
            try {
                await this.saveModel.create(input);
            } catch (err) {
                console.log('Error, Service.model:', err.message);
                throw new BadGatewayException(Message.CREATE_FAILED);
            }
        }
        console.log(`-Save modifier ${modifier} -`);
        return modifier;
    }

    public async checkSaveExistence(input: SaveInput): Promise<Mesaved[]> {
        const { memberId, saveRefId } = input;
        const result = await this.saveModel.findOne({ memberId: memberId, saveRefId: saveRefId }).exec();
        return result ? [{ memberId: memberId, saveRefId: saveRefId, mySaved: true }] : [];
    }
}
