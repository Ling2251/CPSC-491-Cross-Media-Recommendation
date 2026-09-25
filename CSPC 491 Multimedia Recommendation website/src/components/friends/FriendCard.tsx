import type { Friendship } from "../../models/friendship";

type FriendCardProps = {
  friendship: Friendship;
  currentUserId: number;
  onRemove: (friendshipId: number) => void;
};

export default function FriendCard({
  friendship,
  currentUserId,
  onRemove,
}: FriendCardProps) {
  const friendId =
    friendship.requesterId === currentUserId
      ? friendship.receiverId
      : friendship.requesterId;

  return (
    <div>
      <h3>User #{friendId}</h3>

      <button
        type="button"
        onClick={() => onRemove(friendship.id)}
      >
        Remove Friend
      </button>
    </div>
  );
}