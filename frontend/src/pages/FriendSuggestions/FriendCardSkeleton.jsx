// src/pages/FriendSuggestions/FriendCardSkeleton.jsx
import React from "react";

const FriendCardSkeleton = () => (
  <article className="fr-card fr-skeleton">
    <div className="fr-card-top">
      <div className="fr-avatar skeleton-block" />
      <div className="fr-identity">
        <div className="skeleton-line w-60" />
        <div className="skeleton-line w-30" />
      </div>
    </div>
    <div className="skeleton-line w-100" />
    <div className="skeleton-line w-80" />
    <div className="fr-tags">
      <span className="skeleton-pill" />
      <span className="skeleton-pill" />
      <span className="skeleton-pill" />
    </div>
    <div className="fr-actions">
      <div className="skeleton-btn" />
      <div className="skeleton-btn" />
    </div>
  </article>
);

export default FriendCardSkeleton;