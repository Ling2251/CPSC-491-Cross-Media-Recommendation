
import { useState } from "react";
import { friendshipService } from "../../services/friendshipservices";

const FriendCard = ({ user }) => {
  const currentUserId = 1;

  const [requestState, setRequestState] = useState("idle");
  const [message, setMessage] = useState("");

  const handleAddFriend = () => {
    setMessage("");

    const result = friendshipService.sendRequest(
      currentUserId,
      Number(user.id)
    );

    setMessage(result.message);

    if (result.success) {
      setRequestState("sent");
    } else {
      setRequestState("idle");
    }
  };

  const scorePct = Math.round(user.similarity_score * 100);

  return (
    <article className="fr-card">
      <div className="fr-card-top">
        <img
          src={user.profile_pic}
          alt={user.username}
          className="fr-avatar"
        />

        <div className="fr-identity">
          <h3 className="fr-username">
            {user.username}
          </h3>

          <span className="fr-score-label">
            {scorePct}% match
          </span>
        </div>
      </div>

      <div className="fr-score-bar">
        <div
          className="fr-score-fill"
          style={{
            width: `${scorePct}%`,
          }}
        />
      </div>

      <p className="fr-bio">{user.bio}</p>

      <div className="fr-tags">
        {user.shared_tags.slice(0, 4).map((tag) => (
          <span key={tag} className="fr-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="fr-actions">
        <button
          type="button"
          className="fr-btn-secondary"
        >
          View Profile
        </button>

        <button
          type="button"
          className="fr-btn-primary"
          onClick={handleAddFriend}
          disabled={requestState === "sent"}
        >
          {requestState === "sent"
            ? "Request Sent ✓"
            : "Add Friend"}
        </button>
      </div>

      {message && (
        <p className="fr-subtitle" role="status">
          {message}
        </p>
      )}
    </article>
  );
};

export default FriendCard;
