import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberService } from '../member/member.service';
import { Direction, Message } from '../../libs/enums/common.enum';
import moment from 'moment';
import { StatisticModifier, T } from '../../libs/types/common';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { MeLiked } from '../../libs/dto/like/like';
import { Post, Posts } from '../../libs/dto/post/post';
import { AllPostsInquiry, PostInput, PostsInquiry } from '../../libs/dto/post/post.input';
import { PostUpdate } from '../../libs/dto/post/post.update';
import { PostStatus } from '../../libs/enums/post.enum';
import { LikeTarget, LikeAction } from '../../libs/enums/like.enum';
import { LikeInput } from '../../libs/dto/like/like.input';

@Injectable()
export class PostService {
  constructor(
    @InjectModel('Post') private readonly postModel: Model<any>,
    private memberService: MemberService,
    private likeService: LikeService,
  ) {}

  public async createPost(input: PostInput): Promise<Post> {
    try {
      const result = await this.postModel.create(input);
      await this.memberService.memberStatsEditor({
        _id: result.memberId,
        targetKey: 'memberPosts',
        modifier: 1,
      });
      return result.toObject();
    } catch (err) {
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }

  public async getPost(memberId: ObjectId | null, postId: ObjectId): Promise<Post> {
		const search: T = {
			_id: postId,
			postStatus: PostStatus.ACTIVE,
		};

		const targetPost: any = await this.postModel.findOne(search).lean().exec();
		if (!targetPost) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		let meLiked: MeLiked = { liked: false, saved: false };
		if (memberId) {
			const liked = await this.likeService.checkLikeExistence(memberId, {
				refId: postId,
				targetType: LikeTarget.POST,
				action: LikeAction.LIKE,
			});

			const saved = await this.likeService.checkLikeExistence(memberId, {
				refId: postId,
				targetType: LikeTarget.POST,
				action: LikeAction.SAVE,
			});

			meLiked = { liked, saved };
		}

		targetPost.meLiked = meLiked;
		targetPost.memberData = await this.memberService.getMember(null, targetPost.memberId);
		return targetPost;
	}

  public async updatePost(memberId: ObjectId, input: PostUpdate): Promise<Post> {
    const search = {
      _id: input._id,
      memberId,
      postStatus: PostStatus.ACTIVE,
    };

    const updateData = { ...input };
    if (updateData.postStatus === PostStatus.BLOCKED) {
      updateData.blockedAt = moment().toDate();
    }
    if (updateData.postStatus === PostStatus.DELETE) {
      updateData.deletedAt = moment().toDate();
    }

    const result = await this.postModel.findOneAndUpdate(search, updateData, { new: true }).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (updateData.postStatus === PostStatus.BLOCKED || updateData.postStatus === PostStatus.DELETE) {
      await this.memberService.memberStatsEditor({
        _id: memberId,
        targetKey: 'memberPosts',
        modifier: -1,
      });
    }

    return result.toObject();
  }

  public async removePost(postId: ObjectId, memberId: ObjectId): Promise<Post> {
    const result = await this.postModel.findOneAndDelete({ _id: postId, memberId }).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

    await this.memberService.memberStatsEditor({
      _id: memberId,
      targetKey: 'memberPosts',
      modifier: -1,
    });

    return result.toObject();
  }

  public async getPosts(memberId: ObjectId | null, input: PostsInquiry): Promise<Posts> {
    const match: T = { postStatus: PostStatus.ACTIVE };
    const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    this.shapeMatchQuery(match, input);

    const result = await this.postModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              {
                $lookup: {
                  from: 'likes',
                  let: { userId: memberId, postId: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ['$memberId', '$$userId'] },
                            { $eq: ['$refId', '$$postId'] },
                            { $eq: ['$targetType', LikeTarget.POST] },
                            { $eq: ['$action', LikeAction.LIKE] },
                          ],
                        },
                      },
                    },
                    { $project: { memberId: 1, refId: 1 } },
                  ],
                  as: 'tempLiked',
                },
              },
              {
                $lookup: {
                  from: 'likes',
                  let: { userId: memberId, postId: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ['$memberId', '$$userId'] },
                            { $eq: ['$refId', '$$postId'] },
                            { $eq: ['$targetType', LikeTarget.POST] },
                            { $eq: ['$action', LikeAction.SAVE] },
                          ],
                        },
                      },
                    },
                    { $project: { memberId: 1, refId: 1 } },
                  ],
                  as: 'tempSaved',
                },
              },
              {
                $addFields: {
                  meLiked: {
                    liked: { $gt: [{ $size: '$tempLiked' }, 0] },
                    saved: { $gt: [{ $size: '$tempSaved' }, 0] },
                  },
                },
              },
              { $project: { tempLiked: 0, tempSaved: 0 } },
              {
                $lookup: {
                  from: 'members',
                  localField: 'memberId',
                  foreignField: '_id',
                  as: 'memberData',
                },
              },
              { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  public async getAllPostsByAdmin(input: AllPostsInquiry): Promise<Posts> {
    const { postStatus } = input.search ?? {};
    const match: T = postStatus ? { postStatus } : {};
    const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    const result = await this.postModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              { $addFields: { meLiked: { liked: false, saved: false } } },
              {
                $lookup: {
                  from: 'members',
                  localField: 'memberId',
                  foreignField: '_id',
                  as: 'memberData',
                },
              },
              { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  public async updatePostByAdmin(input: PostUpdate): Promise<Post> {
    const result = await this.postModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (input.postStatus === PostStatus.DELETE || input.postStatus === PostStatus.BLOCKED) {
      await this.memberService.memberStatsEditor({
        _id: result.memberId,
        targetKey: 'memberPosts',
        modifier: -1,
      });
    }

    return result.toObject();
  }

  public async removePostByAdmin(postId: ObjectId): Promise<Post> {
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const result = await this.postModel.findByIdAndDelete(postId).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

    await this.memberService.memberStatsEditor({
      _id: post.memberId,
      targetKey: 'memberPosts',
      modifier: -1,
    });

    return result.toObject();
  }

  // ──────────────────────────────────────────
  //  LIKE / SAVE MANTIQLARI — AVVALGI HOLATDA QOLDI
  // ──────────────────────────────────────────

  public async likeTargetPost(memberId: ObjectId, postId: ObjectId): Promise<Post> {
    const target = await this.postModel.findOne({ _id: postId, postStatus: PostStatus.ACTIVE }).exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      refId: postId,
      targetType: LikeTarget.POST,
      action: LikeAction.LIKE,
    };

    const modifier = await this.likeService.toggleLike(memberId, input);
    return await this.postStatsEditor({ _id: postId, targetKey: 'postLikes', modifier });
  }

  public async saveTargetPost(memberId: ObjectId, postId: ObjectId): Promise<Post> {
    const target = await this.postModel.findOne({ _id: postId, postStatus: PostStatus.ACTIVE }).exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      refId: postId,
      targetType: LikeTarget.POST,
      action: LikeAction.SAVE,
    };

    const modifier = await this.likeService.toggleLike(memberId, input);
    return await this.postStatsEditor({ _id: postId, targetKey: 'postSaves', modifier });
  }

  public async getLikedPosts(memberId: ObjectId, input: PostsInquiry): Promise<Posts> {
    return await this.likeService.getFavoritePosts(memberId, input);
  }

  public async getSavedPosts(memberId: ObjectId, input: PostsInquiry): Promise<Posts> {
    return await this.likeService.getSavedPosts(memberId, input);
  }

  // ──────────────────────────────────────────
  //  YORDAMCHI METODLAR — O‘ZGARMAGAN
  // ──────────────────────────────────────────

  public async postStatsEditor(input: StatisticModifier): Promise<Post> {
    const { _id, targetKey, modifier } = input;
    const updated = await this.postModel
      .findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
      .exec();

    if (!updated) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
    return updated.toObject();
  }

  public shapeMatchQuery(match: T, input: PostsInquiry): void {
    const { text, memberId } = input.search ?? {};
    if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
    if (text) {
      match.$or = [
        { postTitle: { $regex: text, $options: 'i' } },
        { postContent: { $regex: text, $options: 'i' } },
      ];
    }
  }

  public async incrementPostComments(postId: ObjectId): Promise<Post> {
    return await this.postStatsEditor({ _id: postId, targetKey: 'postComments', modifier: 1 });
  }

  public async decrementPostComments(postId: ObjectId): Promise<Post> {
    return await this.postStatsEditor({ _id: postId, targetKey: 'postComments', modifier: -1 });
  }
}