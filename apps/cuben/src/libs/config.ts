import { ObjectId } from 'bson';

export const availableAgentSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];

export const availableProductSorts = [
	'createdAt',
	'updatedAt',
	'productLikes',
	'productViews',
	'productPrice',
];

export const availableArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
export const availablePostSorts = ['createdAt', 'updatedAt', 'postLikes'];
export const  availableCommentSorts = ['createdAt', 'updatedAt']

// IMAGE CONFIGURATION (config.js)
import { uuidv7 } from 'uuidv7';
import * as path from 'path';
import { T } from './types/common';

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return uuidv7() + ext;
};

export const shapeIntoMongoObjectId = (target: any) => {
    return typeof target === 'string' ? new ObjectId(target) : target;
};

export const lookupAuthMemberLiked = (memberId: T, targetRefId: string = '$_id') => {
	return {
		$lookup: {
			from: 'likes',
			let: {
				localLikeRefId: targetRefId,
				localMemberId: memberId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$likeRefId', '$$localLikeRefId']}, { $eq: ['$memberId', '$$localMemberId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						memberId: 1,
						likeRefId: 1,
						myFavorite: '$$localMyFavorite',
					},
				},
			],
			as: 'meLiked',
		},
	};
};

interface LookupAuthMemberFollowed {
	followerId: T;
	followingId: string;
}

export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
	const { followerId, followingId } = input;
	return {
		$lookup: {
			from: 'follows',
			let: {
				localFollowerId: followerId,
				localFollowingId: followingId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$followerId', '$$localFollowerId']}, { $eq: ['$followingId', '$$localFollowingId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						followerId: 1,
						followingId: 1,
						myFollowing: '$$localMyFavorite',
					},
				},
			],
			as: 'meFollowed',
		},
	};
};

export const lookupMember = {
	$lookup: {
		from: 'members',
		localField: 'memberId',
		foreignField: '_id',
		as: 'memberData',
	},
};

export const lookupFollowingData = {
	$lookup: {
		from: 'members',
		localField: 'followingId',
		foreignField: '_id',
		as: 'followingData',
	},
};

export const lookupFollowerData = {
	$lookup: {
		from: 'members',
		localField: 'followerId',
		foreignField: '_id',
		as: 'followerData',
	},
};

export const lookupFavoriteProduct = {
	$lookup: {
		from: 'members',
		localField: 'favoriteProduct.memberId',
		foreignField: '_id',
		as: 'favoriteProduct.memberData',
	},
};

export const lookupFavoriteArticle = {
	$lookup: {
		from: 'members',
		localField: 'favoriteArticle.memberId',
		foreignField: '_id',
		as: 'favoriteArticle.memberData',
	},
};

export const lookupFavoritePost = {
	$lookup: {
		from: 'members',
		localField: 'favoritePost.memberId',
		foreignField: '_id',
		as: 'favoritePost.memberData',
	},
};

export const lookupSavedProduct = {
	$lookup: {
		from: 'members',
		localField: 'savedProduct.memberId',
		foreignField: '_id',
		as: 'savedProduct.memberData',
	},
};

export const lookupSavedArticle = {
	$lookup: {
		from: 'members',
		localField: 'savedArticle.memberId',
		foreignField: '_id',
		as: 'savedArticle.memberData',
	},
};

export const lookupSavedPost = {
	$lookup: {
		from: 'members',
		localField: 'savedPost.memberId',
		foreignField: '_id',
		as: 'savedPost.memberData',
	},
};

export const lookupVisit = {
	$lookup: {
		from: 'members',
		localField: 'visitedProduct.memberId',
		foreignField: '_id',
		as: 'visitedProduct.memberData',
	},
};