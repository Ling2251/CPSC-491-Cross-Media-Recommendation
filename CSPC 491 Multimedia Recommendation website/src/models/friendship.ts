export type FriendshipStatus =
  | "pending"
  | "accepted"
  | "declined";

export type Friendship = {
  id: number;
  requesterId: number;
  receiverId: number;
  status: FriendshipStatus;
};
