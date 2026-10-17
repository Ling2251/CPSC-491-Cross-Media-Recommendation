import { useState } from "react";
import { users } from "../data/users";
import { FriendshipStatus } from "../models/friendship";
import { friendshipService } from "../services/friendshipService";
import FriendCard from "../components/friends/FriendCard";
import "./Friends/FriendsPage.css";
import "./FriendSuggestionsPage.css";

const CURRENT_USER_ID = 1;
const FILTERS = [
  { label: "All", value: "all" },
  { label: "Movies", value: "movies" },
  { label: "Music", value: "music" },
  { label: "Books", value: "books" },
];

function FriendSuggestionsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [relationships, setRelationships] = useState(() =>
    friendshipService.getAll()
  );
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const existingConnections = relationships.filter(
    (relationship) =>
      relationship.status !== FriendshipStatus.DECLINED &&
      (Number(relationship.requesterId) === CURRENT_USER_ID ||
        Number(relationship.receiverId) === CURRENT_USER_ID)
  );

  const eligibleUsers = users.filter((user) => {
    if (Number(user.id) === CURRENT_USER_ID) {
      return false;
    }

    const alreadyConnected = existingConnections.some(
      (relationship) =>
        Number(relationship.requesterId) === Number(user.id) ||
        Number(relationship.receiverId) === Number(user.id)
    );

    return !alreadyConnected;
  });

  const visibleUsers =
    activeFilter === "all"
      ? eligibleUsers
      : eligibleUsers.filter((user) =>
          user.media_types.includes(activeFilter)
        );

  const handleAddFriend = (user) => {
    const result = friendshipService.sendRequest(
      CURRENT_USER_ID,
      Number(user.id)
    );
    setMessage(result.message);
    setRelationships(friendshipService.getAll());
  };

  const handleRefresh = () => {
    setRelationships(friendshipService.getAll());
    setMessage("Recommendations refreshed.");
  };

  return (
    <main className="fr-page suggestions-page">
      <header className="fr-header suggestions-header">
        <div>
          <h1 className="fr-title">Friend Suggestions</h1>
          <p className="fr-subtitle">
            Discover people who share your interests across movies, music,
            and books.
          </p>
        </div>
        <div className="suggestions-header-actions">
          <a className="fr-btn-secondary" href="/manage-friends">
            Manage Friends
          </a>
          <button
            className="fr-btn-primary"
            type="button"
            onClick={handleRefresh}
          >
            Refresh Recommendations
          </button>
        </div>
      </header>

      {message && (
        <p className="suggestions-message" role="status">
          {message}
        </p>
      )}

      <nav className="suggestions-filters" aria-label="Filter suggestions">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={
              activeFilter === filter.value
                ? "suggestions-filter is-active"
                : "suggestions-filter"
            }
            aria-pressed={activeFilter === filter.value}
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {visibleUsers.length > 0 ? (
        <section aria-label="Recommended users">
          <div className="fr-grid">
            {visibleUsers.map((user) => (
              <FriendCard
                key={user.id}
                user={user}
                requestSent={false}
                onAddFriend={handleAddFriend}
                onViewProfile={setSelectedUser}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="fr-empty" aria-live="polite">
          <h2>No suggestions found</h2>
          <p>
            {eligibleUsers.length === 0
              ? "You are all caught up. Check back for more people to discover."
              : `There are no suggestions in ${FILTERS.find((filter) => filter.value === activeFilter)?.label}. Try another filter.`}
          </p>
        </section>
      )}

      {selectedUser && (
        <div
          className="suggestions-dialog-backdrop"
          onClick={() => setSelectedUser(null)}
        >
          <section
            aria-labelledby="suggestion-profile-title"
            aria-modal="true"
            className="suggestions-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close profile"
              className="suggestions-dialog-close"
              onClick={() => setSelectedUser(null)}
              type="button"
            >
              ×
            </button>
            <img
              alt=""
              className="fr-avatar"
              src={selectedUser.profile_pic}
            />
            <h2 id="suggestion-profile-title">{selectedUser.username}</h2>
            <p>{selectedUser.bio}</p>
            <p>
              {Math.round(selectedUser.similarity_score * 100)}% interest
              match
            </p>
            <div className="fr-tags">
              {selectedUser.shared_tags.map((tag) => (
                <span className="fr-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default FriendSuggestionsPage;
