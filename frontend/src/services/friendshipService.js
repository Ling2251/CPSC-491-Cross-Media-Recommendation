import { users } from "../data/users";
import { FriendshipStatus } from "../models/friendship";

export class FriendshipService {
  constructor() {
    // Temporary local friendship data.
    // This will later be replaced by PostgreSQL/backend data.
    this.friendships = [
      {
        id: 1,
        requesterId: 2,
        receiverId: 1,
        status: FriendshipStatus.PENDING,
      },
    ];

    this.nextId = 2;
  }

  getAll() {
    return [...this.friendships];
  }

  getIncomingRequests(userId) {
    return this.friendships.filter(
      (friendship) =>
        Number(friendship.receiverId) === Number(userId) &&
        friendship.status === FriendshipStatus.PENDING
    );
  }

  getOutgoingRequests(userId) {
    return this.friendships.filter(
      (friendship) =>
        Number(friendship.requesterId) === Number(userId) &&
        friendship.status === FriendshipStatus.PENDING
    );
  }

  getFriends(userId) {
    return this.friendships.filter(
      (friendship) =>
        friendship.status === FriendshipStatus.ACCEPTED &&
        (
          Number(friendship.requesterId) === Number(userId) ||
          Number(friendship.receiverId) === Number(userId)
        )
    );
  }

  getOtherUserId(friendship, currentUserId) {
    if (
      Number(friendship.requesterId) === Number(currentUserId)
    ) {
      return friendship.receiverId;
    }

    return friendship.requesterId;
  }

  userExists(userId) {
    return users.some(
      (user) => Number(user.id) === Number(userId)
    );
  }

  friendshipExists(userA, userB) {
    return this.friendships.some(
      (friendship) =>
        friendship.status !== FriendshipStatus.DECLINED &&
        (
          (
            Number(friendship.requesterId) === Number(userA) &&
            Number(friendship.receiverId) === Number(userB)
          ) ||
          (
            Number(friendship.requesterId) === Number(userB) &&
            Number(friendship.receiverId) === Number(userA)
          )
        )
    );
  }

  sendRequest(requesterId, receiverId) {
    requesterId = Number(requesterId);
    receiverId = Number(receiverId);

    if (!this.userExists(requesterId)) {
      return {
        success: false,
        message: "Requester does not exist.",
      };
    }

    if (!this.userExists(receiverId)) {
      return {
        success: false,
        message: "Receiver does not exist.",
      };
    }

    if (requesterId === receiverId) {
      return {
        success: false,
        message: "You cannot send a friend request to yourself.",
      };
    }

    if (
      this.friendshipExists(
        requesterId,
        receiverId
      )
    ) {
      return {
        success: false,
        message:
          "A friend request or friendship already exists.",
      };
    }

    this.friendships.push({
      id: this.nextId++,
      requesterId,
      receiverId,
      status: FriendshipStatus.PENDING,
    });

    return {
      success: true,
      message: "Friend request sent.",
    };
  }

  acceptRequest(requestId) {
    requestId = Number(requestId);

    const request = this.friendships.find(
      (friendship) =>
        Number(friendship.id) === requestId
    );

    if (!request) {
      return {
        success: false,
        message: "Friend request does not exist.",
      };
    }

    if (
      request.status !== FriendshipStatus.PENDING
    ) {
      return {
        success: false,
        message:
          "This friend request is no longer pending.",
      };
    }

    request.status = FriendshipStatus.ACCEPTED;

    return {
      success: true,
      message: "Friend request accepted.",
    };
  }

  declineRequest(requestId) {
    requestId = Number(requestId);

    const request = this.friendships.find(
      (friendship) =>
        Number(friendship.id) === requestId
    );

    if (!request) {
      return {
        success: false,
        message: "Friend request does not exist.",
      };
    }

    if (
      request.status !== FriendshipStatus.PENDING
    ) {
      return {
        success: false,
        message:
          "This friend request is no longer pending.",
      };
    }

    request.status = FriendshipStatus.DECLINED;

    return {
      success: true,
      message: "Friend request declined.",
    };
  }

  removeFriend(friendshipId) {
    friendshipId = Number(friendshipId);

    const index = this.friendships.findIndex(
      (friendship) =>
        Number(friendship.id) === friendshipId &&
        friendship.status === FriendshipStatus.ACCEPTED
    );

    if (index === -1) {
      return {
        success: false,
        message:
          "Accepted friendship does not exist.",
      };
    }

    this.friendships.splice(index, 1);

    return {
      success: true,
      message: "Friend removed.",
    };
  }
}

export const friendshipService =
  new FriendshipService();