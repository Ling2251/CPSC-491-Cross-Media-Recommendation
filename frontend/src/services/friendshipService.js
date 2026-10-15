
import { users } from "../data/users";
import { FriendshipStatus } from "../models/friendship";

export class FriendshipService {
  constructor() {
    // Temporary data until PostgreSQL is integrated.
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

  // Validate positive integer IDs or numeric strings.
  isValidId(id) {
    if (typeof id !== "number" && typeof id !== "string") {
      return false;
    }

    if (typeof id === "string" && id.trim() === "") {
      return false;
    }

    return Number.isSafeInteger(Number(id)) && Number(id) > 0;
  }

  getAll() {
    return [...this.friendships];
  }

  getIncomingRequests(userId) {
    if (!this.isValidId(userId)) return [];

    return this.friendships.filter(
      (friendship) =>
        Number(friendship.receiverId) === Number(userId) &&
        friendship.status === FriendshipStatus.PENDING
    );
  }

  getOutgoingRequests(userId) {
    if (!this.isValidId(userId)) return [];

    return this.friendships.filter(
      (friendship) =>
        Number(friendship.requesterId) === Number(userId) &&
        friendship.status === FriendshipStatus.PENDING
    );
  }

  getFriends(userId) {
    if (!this.isValidId(userId)) return [];

    return this.friendships.filter(
      (friendship) =>
        friendship.status === FriendshipStatus.ACCEPTED &&
        (Number(friendship.requesterId) === Number(userId) ||
          Number(friendship.receiverId) === Number(userId))
    );
  }

  getOtherUserId(friendship, currentUserId) {
    if (!friendship || !this.isValidId(currentUserId)) {
      return null;
    }

    if (
      Number(friendship.requesterId) === Number(currentUserId)
    ) {
      return friendship.receiverId;
    }

    if (
      Number(friendship.receiverId) === Number(currentUserId)
    ) {
      return friendship.requesterId;
    }

    return null;
  }

  userExists(userId) {
    if (!this.isValidId(userId)) return false;

    return users.some(
      (user) => Number(user.id) === Number(userId)
    );
  }

  friendshipExists(userA, userB) {
    if (!this.isValidId(userA) || !this.isValidId(userB)) {
      return false;
    }

    return this.friendships.some(
      (friendship) =>
        friendship.status !== FriendshipStatus.DECLINED &&
        ((Number(friendship.requesterId) === Number(userA) &&
          Number(friendship.receiverId) === Number(userB)) ||
          (Number(friendship.requesterId) === Number(userB) &&
            Number(friendship.receiverId) === Number(userA)))
    );
  }

  // SEND REQUEST
  sendRequest(requesterId, receiverId) {
    if (
      !this.isValidId(requesterId) ||
      !this.isValidId(receiverId)
    ) {
      return {
        success: false,
        message: "Valid user IDs are required.",
      };
    }

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

  // ACCEPT REQUEST
  acceptRequest(requestId, currentUserId) {
    if (
      !this.isValidId(requestId) ||
      !this.isValidId(currentUserId)
    ) {
      return {
        success: false,
        message: "Valid request and user IDs are required.",
      };
    }

    const request = this.friendships.find(
      (f) => Number(f.id) === Number(requestId)
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

    if (Number(request.receiverId) !== Number(currentUserId)) {
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

  // DECLINE REQUEST
  declineRequest(requestId, currentUserId) {
    if (
      !this.isValidId(requestId) ||
      !this.isValidId(currentUserId)
    ) {
      return {
        success: false,
        message: "Valid request and user IDs are required.",
      };
    }

    const request = this.friendships.find(
      (f) => Number(f.id) === Number(requestId)
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

    if (Number(request.receiverId) !== Number(currentUserId)) {
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

  // CANCEL OUTGOING REQUEST
  cancelRequest(requestId, currentUserId) {
    if (
      !this.isValidId(requestId) ||
      !this.isValidId(currentUserId)
    ) {
      return {
        success: false,
        message: "Valid request and user IDs are required.",
      };
    }

    const index = this.friendships.findIndex(
      (f) =>
        Number(f.id) === Number(requestId) &&
        f.status === FriendshipStatus.PENDING
    );

    if (index === -1) {
      return {
        success: false,
        message: "Pending friend request does not exist.",
      };
    }

    const request = this.friendships[index];

    if (Number(request.requesterId) !== Number(currentUserId)) {
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

  // REMOVE FRIEND
  removeFriend(friendshipId, currentUserId) {
    if (
      !this.isValidId(friendshipId) ||
      !this.isValidId(currentUserId)
    ) {
      return {
        success: false,
        message: "Valid friendship and user IDs are required.",
      };
    }

    const index = this.friendships.findIndex(
      (f) =>
        Number(f.id) === Number(friendshipId) &&
        f.status === FriendshipStatus.ACCEPTED
    );

    if (index === -1) {
      return {
        success: false,
        message: "Accepted friendship does not exist.",
      };
    }

    const friendship = this.friendships[index];

    if (
      Number(friendship.requesterId) !== Number(currentUserId) &&
      Number(friendship.receiverId) !== Number(currentUserId)
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
