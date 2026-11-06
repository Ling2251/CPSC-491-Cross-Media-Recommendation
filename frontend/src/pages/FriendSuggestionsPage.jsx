import { useCallback, useEffect, useState } from "react";
import { FriendshipStatus } from "../models/friendship";
import { friendRecommendationApi } from "../services/friendRecommendationApi";
import { friendshipApi } from "../services/friendshipApi";
import FriendCard from "../components/friends/FriendCard";
import "./Friends/FriendsPage.css";
import "./FriendSuggestionsPage.css";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Movies", value: "movies" },
  { label: "Music", value: "music" },
  { label: "Books", value: "books" },
];

function FriendSuggestionsPage({ userId }) {
  const isGuest = !localStorage.getItem("token");
  const [activeFilter, setActiveFilter] = useState("all");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationUserId, setRecommendationUserId] = useState(
    userId ?? null
  );
  const [relationships, setRelationships] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchSuggestions = useCallback(
    async () => {
      const result = await friendRecommendationApi.getRecommendations();
      const relationships = isGuest
        ? []
        : await Promise.all([
            friendshipApi.getFriends(),
            friendshipApi.getIncomingRequests(),
            friendshipApi.getOutgoingRequests(),
          ]).then(([friends, incoming, outgoing]) => [
            ...friends,
            ...incoming,
            ...outgoing,
          ]);

      return {
        recommendations: result.recommendations,
        relationships,
        userId: isGuest ? result.userId : userId,
      };
    },
    [isGuest, userId]
  );

  const loadRecommendations = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const result = await fetchSuggestions();
      setRecommendations(result.recommendations);
      setRelationships(result.relationships);
      setRecommendationUserId(result.userId);
      setMessage("Recommendations refreshed.");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, [fetchSuggestions]);

  useEffect(() => {
    let cancelled = false;

    fetchSuggestions()
      .then((result) => {
        if (cancelled) return;
        setRecommendations(result.recommendations);
        setRelationships(result.relationships);
        setRecommendationUserId(result.userId);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSuggestions]);

  const existingConnections = relationships.filter(
    (relationship) =>
      relationship.status !== FriendshipStatus.DECLINED &&
      (Number(relationship.requesterId) === Number(recommendationUserId) ||
        Number(relationship.receiverId) === Number(recommendationUserId))
  );
  const connectedUserIds = new Set(
    existingConnections.map((relationship) =>
      Number(relationship.requesterId) === Number(recommendationUserId)
        ? Number(relationship.receiverId)
        : Number(relationship.requesterId)
    )
  );

  const eligibleUsers = recommendations.filter(
    (user) =>
      Number(user.user_id) !== Number(recommendationUserId) &&
      !connectedUserIds.has(Number(user.user_id))
  );

  const visibleUsers =
    activeFilter === "all"
      ? eligibleUsers
      : eligibleUsers.filter((user) =>
          user.media_types.includes(activeFilter)
        );

  const handleAddFriend = async (user) => {
    if (isGuest) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await friendshipApi.sendRequest(user.user_id);
      setRelationships((current) => [
        ...current,
        {
          requesterId: userId,
          receiverId: user.user_id,
          status: FriendshipStatus.PENDING,
        },
      ]);
      setMessage(result.message || "Friend request sent.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
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
          {!isGuest && (
            <a className="fr-btn-secondary" href="/manage-friends">
              Manage Friends
            </a>
          )}
          <button
            className="fr-btn-primary"
            type="button"
            disabled={busy}
            onClick={loadRecommendations}
          >
            {busy ? "Loading..." : "Refresh Recommendations"}
          </button>
        </div>
      </header>

      {message && (
        <p className="suggestions-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="suggestions-error" role="alert">
          {error}
        </p>
      )}
      {isGuest && recommendationUserId && (
        <p className="suggestions-message">
          Guest preview as user #{recommendationUserId}. Sign in later to use
          your own recommendations and send friend requests.
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

      {loading ? (
        <p role="status">Loading recommendations...</p>
      ) : visibleUsers.length > 0 ? (
        <section aria-label="Recommended users">
          <div className="fr-grid">
            {visibleUsers.map((user) => (
              <FriendCard
                key={user.user_id}
                user={{
                  ...user,
                  id: user.user_id,
                  profile_pic: user.profile_pic,
                  bio: user.bio,
                  shared_tags: user.shared_tags || [],
                }}
                requestSent={busy}
                canAddFriend={!isGuest}
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
            {selectedUser.profile_pic ? (
              <img
                alt=""
                className="fr-avatar"
                src={selectedUser.profile_pic}
              />
            ) : (
              <div aria-hidden="true" className="fr-avatar fr-avatar-fallback">
                {selectedUser.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <h2 id="suggestion-profile-title">{selectedUser.username}</h2>
            {selectedUser.bio && <p>{selectedUser.bio}</p>}
            <p>
              {Math.round(selectedUser.similarity_score * 100)}% interest
              match
            </p>
            {selectedUser.shared_tags?.length > 0 && (
              <div className="fr-tags">
                {selectedUser.shared_tags.map((tag) => (
                  <span className="fr-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default FriendSuggestionsPage;
