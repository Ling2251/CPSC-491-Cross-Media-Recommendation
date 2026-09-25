import { useState } from "react";
import { friendshipService } from "../../services/friendshipService";

type AddFriendButtonProps = {
  currentUserId: number;
  targetUserId: number;
  onFriendshipChange?: () => void;
};

export default function AddFriendButton({
  currentUserId,
  targetUserId,
  onFriendshipChange,
}: AddFriendButtonProps) {
  const [message, setMessage] = useState("");

  const relationshipExists =
    friendshipService.friendshipExists(
      currentUserId,
      targetUserId
    );

  function handleAddFriend() {
    const result =
      friendshipService.sendRequest(
        currentUserId,
        targetUserId
      );

    setMessage(result.message);

    if (result.success) {
      onFriendshipChange?.();
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAddFriend}
        disabled={relationshipExists}
      >
        {relationshipExists
          ? "Request Sent / Friends"
          : "Add Friend"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}