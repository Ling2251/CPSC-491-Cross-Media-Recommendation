
import { users } from "../data/users";
import { FriendshipStatus } from "../models/friendship";

export class FriendshipService {
  constructor() {
    // Temporary local data until PostgreSQL is integrated.
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
        (Number(friendship.requesterId) === Number(userId) ||
          Number(friendship.receiverId) === Number(userId))
    );
  }

  getOtherUserId(friendship, currentUserId) {
    if (Number(friendship.requesterId) === Number(currentUserId)) {
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
        ((Number(friendship.requesterId) === Number(userA) &&
          Number(friendship.receiverId) === Number(userB)) ||
          (Number(friendship.requesterId) === Number(userB) &&
            Number(friendship.receiverId) === Number(userA)))
    );
  }

  // Send a new friend request
  sendRequest(requesterId, receiverId) {
    requesterId = Number(requesterId);
    receiverId = Number(receiverId);

    if (
      !Number.isSafeInteger(requesterId) ||
      requesterId <= 0 ||
      !Number.isSafeInteger(receiverId) ||
      receiverId <= 0
    ) {
      return {
        success: false,
        message: "Valid user IDs are required.",
      };
    }

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

    if (this.friendshipExists(requesterId, receiverId)) {
      return {
        success: false,
        message: "A friend request or friendship already exists.",
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

  // Accept an incoming friend request
  acceptRequest(requestId, currentUserId) {
    requestId = Number(requestId);
    currentUserId = Number(currentUserId);

    const request = this.friendships.find(
      (friendship) => Number(friendship.id) === requestId
    );

    if (!request) {
      return {
        success: false,
        message: "Friend request does not exist.",
      };
    }

    if (request.status !== FriendshipStatus.PENDING) {
      return {
        success: false,
        message: "This friend request is no longer pending.",
      };
    }

    if (Number(request.receiverId) !== currentUserId) {
      return {
        success: false,
        message: "Only the receiver can accept this request.",
      };
    }

    request.status = FriendshipStatus.ACCEPTED;

    return {
      success: true,
      message: "Friend request accepted.",
    };
  }

  // Decline an incoming friend request
  declineRequest(requestId, currentUserId) {
    requestId = Number(requestId);
    currentUserId = Number(currentUserId);

    const request = this.friendships.find(
      (friendship) => Number(friendship.id) === requestId
    );

    if (!request) {
      return {
        success: false,
        message: "Friend request does not exist.",
      };
    }

    if (request.status !== FriendshipStatus.PENDING) {
      return {
        success: false,
        message: "This friend request is no longer pending.",
      };
    }

    if (Number(request.receiverId) !== currentUserId) {
      return {
        success: false,
        message: "Only the receiver can decline this request.",
      };
    }

    request.status = FriendshipStatus.DECLINED;

    return {
      success: true,
      message: "Friend request declined.",
    };
  }

  // Cancel an outgoing friend request
  cancelRequest(requestId, currentUserId) {
    requestId = Number(requestId);
    currentUserId = Number(currentUserId);

    const index = this.friendships.findIndex(
      (friendship) =>
        Number(friendship.id) === requestId &&
        friendship.status === FriendshipStatus.PENDING
    );

    if (index === -1) {
      return {
        success: false,
        message: "Pending friend request does not exist.",
      };
    }

    const request = this.friendships[index];

    if (Number(request.requesterId) !== currentUserId) {
      return {
        success: false,
        message: "Only the sender can cancel this request.",
      };
    }

    this.friendships.splice(index, 1);

    return {
      success: true,
      message: "Friend request cancelled.",
    };
  }

  // Remove an existing friendship
  removeFriend(friendshipId, currentUserId) {
    friendshipId = Number(friendshipId);
    currentUserId = Number(currentUserId);

    const index = this.friendships.findIndex(
      (friendship) =>
        Number(friendship.id) === friendshipId &&
        friendship.status === FriendshipStatus.ACCEPTED
    );

    if (index === -1) {
      return {
        success: false,
        message: "Accepted friendship does not exist.",
      };
    }

    const friendship = this.friendships[index];

    if (
      Number(friendship.requesterId) !== currentUserId &&
      Number(friendship.receiverId) !== currentUserId
    ) {
      return {
        success: false,
        message: "You are not part of this friendship.",
      };
    }

    this.friendships.splice(index, 1);

    return {
      success: true,
      message: "Friend removed.",
    };
  }
}

export const friendshipService = new FriendshipService();
