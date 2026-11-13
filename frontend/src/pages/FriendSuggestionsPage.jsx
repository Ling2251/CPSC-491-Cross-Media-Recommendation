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
  const [refreshing, setRefreshing] = useState(false);
  const [sendingUserId, setSendingUserId] = useState(null);
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
        userId: userId ?? result.userId,
      };
    },
    [isGuest, userId]
  );

  const loadRecommendations = useCallback(async () => {
    setRefreshing(true);
    setError("");
    setMessage("");

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
      setRefreshing(false);
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

  const eligibleUsers = recommendations
    .filter(
      (user) =>
        Number(user.user_id) !== Number(recommendationUserId) &&
        !connectedUserIds.has(Number(user.user_id))
    )
    .sort(
      (userA, userB) =>
        Number(userB.similarity_score) - Number(userA.similarity_score)
    );

  const visibleUsers =
    activeFilter === "all"
      ? eligibleUsers
      : eligibleUsers.filter((user) =>
          Array.isArray(user.media_types) &&
          user.media_types.includes(activeFilter)
        );

  const handleAddFriend = async (user) => {
    if (isGuest || sendingUserId !== null) return;

    setSendingUserId(user.user_id);
    setError("");
    setMessage("");

    try {
      const result = await friendshipApi.sendRequest(user.user_id);
      setRelationships((current) => [
        ...current,
        {
          requesterId: recommendationUserId,
          receiverId: user.user_id,
          status: FriendshipStatus.PENDING,
        },
      ]);
      setMessage(result.message || "Friend request sent.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSendingUserId(null);
    }
  };

  useEffect(() => {
    if (!selectedUser) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedUser]);

  const selectedScores = selectedUser?.scores || {};
  const scoreLabels = [
    ["video", "Movies"],
    ["audio", "Music"],
    ["text", "Books"],
  ];

  return (
    <main className="fr-page suggestions-page">
      <header className="fr-header suggestions-header">
        <div>
          <p className="suggestions-eyebrow">YOUR NEXT GREAT CONNECTION</p>
          <h1 className="fr-title">Friend Suggestions</h1>
          <p className="fr-subtitle">
            Find people who share your taste in movies, music, and books.
            Recommendations are ranked by your shared interests.
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
            disabled={refreshing || sendingUserId !== null}
            onClick={loadRecommendations}
          >
            {refreshing ? "Refreshing..." : "Refresh Recommendations"}
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

      <section
        className="suggestions-controls"
        aria-label="Recommendation controls"
      >
        <div>
          <h2 className="suggestions-section-title">People you may like</h2>
          <p className="suggestions-section-caption">
            {loading
              ? "Finding your best matches..."
              : `${visibleUsers.length} ${
                  visibleUsers.length === 1 ? "person" : "people"
                }${
                  activeFilter === "all"
                    ? ""
                    : ` in ${
                        FILTERS.find(
                          (filter) => filter.value === activeFilter
                        )?.label
                      }`
                }`}
          </p>
        </div>
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
      </section>

      {loading ? (
        <div className="suggestions-loading" role="status" aria-live="polite">
          <span className="suggestions-spinner" aria-hidden="true" />
          <span>Finding people who share your interests...</span>
        </div>
      ) : error && recommendations.length === 0 ? (
        <section className="fr-empty suggestions-failure" aria-live="polite">
          <div className="suggestions-empty-icon" aria-hidden="true">
            !
          </div>
          <h2>We couldn’t load your suggestions</h2>
          <p>Check your connection and try again.</p>
          <button
            className="fr-btn-primary"
            type="button"
            disabled={refreshing}
            onClick={loadRecommendations}
          >
            {refreshing ? "Trying again..." : "Try again"}
          </button>
        </section>
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
                requestSent={sendingUserId === user.user_id}
                canAddFriend={!isGuest}
                onAddFriend={handleAddFriend}
                onViewProfile={setSelectedUser}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="fr-empty" aria-live="polite">
          <div className="suggestions-empty-icon" aria-hidden="true">
            ✦
          </div>
          <h2>
            {eligibleUsers.length === 0
              ? "You’re all caught up"
              : "No matches in this category"}
          </h2>
          <p>
            {eligibleUsers.length === 0
              ? "There aren’t any new people to show right now. Refresh later to see new recommendations."
              : `There are no suggestions in ${FILTERS.find((filter) => filter.value === activeFilter)?.label}. Try another filter.`}
          </p>
          {activeFilter !== "all" && eligibleUsers.length > 0 && (
            <button
              className="fr-btn-secondary"
              type="button"
              onClick={() => setActiveFilter("all")}
            >
              Show all suggestions
            </button>
          )}
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
            tabIndex={-1}
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
                {(selectedUser.username || "N").slice(0, 1).toUpperCase()}
              </div>
            )}
            <h2 id="suggestion-profile-title">{selectedUser.username}</h2>
            <p className="suggestions-dialog-match">
              {Math.round(selectedUser.similarity_score * 100)}% interest match
            </p>
            <p className="suggestions-dialog-bio">
              {selectedUser.bio ||
                "This person hasn’t added a bio yet. Explore the interests you have in common below."}
            </p>
            <div className="suggestions-score-breakdown">
              {scoreLabels.map(([mediaType, label]) => (
                <div className="suggestions-score-row" key={mediaType}>
                  <span>{label}</span>
                  <div
                    className="suggestions-score-track"
                    role="progressbar"
                    aria-label={`${label} match`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(
                      Number(selectedScores[mediaType] || 0) * 100
                    )}
                  >
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            Number(selectedScores[mediaType] || 0) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <strong>
                    {Math.round(Number(selectedScores[mediaType] || 0) * 100)}%
                  </strong>
                </div>
              ))}
            </div>
            {selectedUser.shared_tags?.length > 0 && (
              <div className="fr-tags" aria-label="Shared interests">
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
