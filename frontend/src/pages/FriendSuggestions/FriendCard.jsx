// src/pages/FriendSuggestions/FriendCard.jsx
import React, { useState } from "react";

const FriendCard = ({ user }) => {
  const [requestState, setRequestState] = useState("idle"); // idle | pending | sent

  const handleAddFriend = async () => {
    setRequestState("pending");
    try {
      // await api.post('/friends/request', { target_user_id: user.id });
      await new Promise((r) => setTimeout(r, 500)); // mock
      setRequestState("sent");
    } catch {
      setRequestState("idle");
    }
  };

  const scorePct = Math.round(user.similarity_score * 100);

  return (
    <article className="fr-card">
      {/* Top row: avatar + name */}
      <div className="fr-card-top">
        <img
          src={user.profile_pic}
          alt={user.username}
          className="fr-avatar"
        />
        <div className="fr-identity">
          <h3 className="fr-username">{user.username}</h3>
          <span className="fr-score-label">
            {scorePct}% match
          </span>
        </div>
      </div>

      {/* Similarity bar */}
      <div className="fr-score-bar">
        <div
          className="fr-score-fill"
          style={{ width: `${scorePct}%` }}
        />
      </div>

      {/* Bio */}
      <p className="fr-bio">{user.bio}</p>

      {/* Shared tags */}
      <div className="fr-tags">
        {user.shared_tags.slice(0, 4).map((tag) => (
          <span key={tag} className="fr-tag">
            {tag}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div className="fr-actions">
        <button className="fr-btn-secondary">View Profile</button>
        <button
          className="fr-btn-primary"
          onClick={handleAddFriend}
          disabled={requestState !== "idle"}
        >
          {requestState === "idle" && "Add Friend"}
          {requestState === "pending" && "Sending…"}
          {requestState === "sent" && "Request Sent ✓"}
        </button>
      </div>
    </article>
  );
};

export default FriendCard;