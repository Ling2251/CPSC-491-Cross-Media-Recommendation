import type { Friendship } from "../models/friendship";
import { users } from "../data/users";

// basic friendship logic
export class FriendshipService {
  private friendships: Friendship[] = [
    {
      id: 1,
      requesterId: 2,
      receiverId: 1,
      status: "pending",
    },
  ];

  private nextId = 2;

  getAll(): Friendship[] {
    return this.friendships;
  }

  getIncomingRequests(userId: number): Friendship[] {
    return this.friendships.filter(
      (friendship) =>
        friendship.receiverId === userId &&
        friendship.status === "pending"
    );
  }

  acceptRequest(
  requestId: number
): { success: boolean; message: string } {

  const request = this.friendships.find(
    (friendship) => friendship.id === requestId
  );

  if (!request) {
    return {
      success: false,
      message: "Friend request does not exist.",
    };
  }

  if (request.status !== "pending") {
    return {
      success: false,
      message: "This friend request is no longer pending.",
    };
  }

  request.status = "accepted";

  return {
    success: true,
    message: "Friend request accepted.",
  };
}

  getFriends(userId: number): Friendship[] {
    return this.friendships.filter(
      (friendship) =>
        friendship.status === "accepted" &&
        (
          friendship.requesterId === userId ||
          friendship.receiverId === userId
        )
    );
  }
  private userExists(userId: number): boolean {
    return users.some((user) => user.id === userId);
  }
  friendshipExists(
    userA: number,
    userB: number
  ): boolean {
    return this.friendships.some(
      (friendship) =>
        (
          friendship.requesterId === userA &&
          friendship.receiverId === userB
        ) ||
        (
          friendship.requesterId === userB &&
          friendship.receiverId === userA
        )
    );
  }

  sendRequest(
  requesterId: number,
  receiverId: number
): { success: boolean; message: string } {

  // Make sure requester exists
  if (!this.userExists(requesterId)) {
    return {
      success: false,
      message: "Requester does not exist.",
    };
  }

  // Make sure receiver exists
  if (!this.userExists(receiverId)) {
    return {
      success: false,
      message: "Receiver does not exist.",
    };
  }

  // Cannot friend yourself
  if (requesterId === receiverId) {
    return {
      success: false,
      message: "You cannot send a friend request to yourself.",
    };
  }

  // Check for existing relationship
  if (this.friendshipExists(requesterId, receiverId)) {
    return {
      success: false,
      message: "A friend request or friendship already exists.",
    };
  }

  // Create request
  this.friendships.push({
    id: this.nextId++,
    requesterId,
    receiverId,
    status: "pending",
  });

  return {
    success: true,
    message: "Friend request sent.",
  };
}

  declineRequest(
  requestId: number
): { success: boolean; message: string } {

  const request = this.friendships.find(
    (friendship) => friendship.id === requestId
  );

  if (!request) {
    return {
      success: false,
      message: "Friend request does not exist.",
    };
  }

  if (request.status !== "pending") {
    return {
      success: false,
      message: "This friend request is no longer pending.",
    };
  }

  request.status = "declined";

  return {
    success: true,
    message: "Friend request declined.",
  };
}

  removeFriend(
  friendshipId: number
): { success: boolean; message: string } {

  const index = this.friendships.findIndex(
    (friendship) =>
      friendship.id === friendshipId &&
      friendship.status === "accepted"
  );

  if (index === -1) {
    return {
      success: false,
      message: "Accepted friendship does not exist.",
    };
  }

  this.friendships.splice(index, 1);

  return {
    success: true,
    message: "Friend removed.",
  };
}
}