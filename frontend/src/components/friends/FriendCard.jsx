
const FriendCard = ({
  user,
  requestSent,
  canAddFriend = true,
  onAddFriend,
  onViewProfile,
}) => {
  const scorePct = Math.min(
    100,
    Math.max(0, Math.round(Number(user.similarity_score) * 100) || 0)
  );
  const username = user.username || "New member";

  return (
    <article className="fr-card">
      <div className="fr-card-top">
        {user.profile_pic ? (
          <img
            src={user.profile_pic}
            alt={`${username}'s profile`}
            className="fr-avatar"
          />
        ) : (
          <div aria-hidden="true" className="fr-avatar fr-avatar-fallback">
            {username.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="fr-identity">
          <h3 className="fr-username">{username}</h3>

          <span className="fr-score-label">
            {scorePct}% match
          </span>
        </div>
      </div>

      <div
        className="fr-score-bar"
        role="progressbar"
        aria-label={`${scorePct}% interest match`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={scorePct}
      >
        <div
          className="fr-score-fill"
          style={{
            width: `${scorePct}%`,
          }}
        />
      </div>

      {user.bio && <p className="fr-bio">{user.bio}</p>}

      {user.shared_tags?.length > 0 && (
        <div className="fr-tags">
          {user.shared_tags.slice(0, 4).map((tag) => (
            <span key={tag} className="fr-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="fr-actions">
        <button
          type="button"
          className="fr-btn-secondary"
          onClick={() => onViewProfile(user)}
          aria-label={`View ${username}'s profile`}
        >
          View Profile
        </button>

        {canAddFriend && (
          <button
            type="button"
            className="fr-btn-primary"
            onClick={() => onAddFriend(user)}
            disabled={requestSent}
            aria-label={
              requestSent
                ? `Sending friend request to ${username}`
                : `Add ${username} as a friend`
            }
          >
            {requestSent ? "Sending..." : "Add Friend"}
          </button>
        )}
      </div>
    </article>
  );
};

export default FriendCard;
