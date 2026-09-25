import React from "react";
import { users } from "../../data/users";

const FriendRequestCard = ({
  request,
  onAccept,
  onDecline,
}) => {
  const requester = users.find(
    (user) =>
      Number(user.id) === Number(request.requesterId)
  );

  return (
    <article className="fr-card">
      <div className="fr-card-top">
        {requester?.profile_pic && (
          <img
            src={requester.profile_pic}
            alt={requester.username}
            className="fr-avatar"
          />
        )}

        <div className="fr-identity">
          <h3 className="fr-username">
            {requester?.username ??
              `User #${request.requesterId}`}
          </h3>

          <span className="fr-score-label">
            Friend Request
          </span>
        </div>
      </div>

      <p className="fr-bio">
        {requester?.bio ??
          "This user sent you a friend request."}
      </p>

      <div className="fr-actions">
        <button
          className="fr-btn-primary"
          type="button"
          onClick={() => onAccept(request.id)}
        >
          Accept
        </button>

        <button
          className="fr-btn-secondary"
          type="button"
          onClick={() => onDecline(request.id)}
        >
          Decline
        </button>
      </div>
    </article>
  );
};

export default FriendRequestCard;