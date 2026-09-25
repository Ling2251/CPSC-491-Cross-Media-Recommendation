import type { Friendship } from "../../models/friendship";

type FriendRequestCardProps = {
  request: Friendship;
  onAccept: (requestId: number) => void;
  onDecline: (requestId: number) => void;
};

export default function FriendRequestCard({
  request,
  onAccept,
  onDecline,
}: FriendRequestCardProps) {
  return (
    <div>
      <p>
        Friend request from User #{request.requesterId}
      </p>

      <button
        type="button"
        onClick={() => onAccept(request.id)}
      >
        Accept
      </button>

      <button
        type="button"
        onClick={() => onDecline(request.id)}
      >
        Decline
      </button>
    </div>
  );
}