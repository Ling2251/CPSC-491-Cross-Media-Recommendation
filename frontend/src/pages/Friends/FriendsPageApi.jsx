
import { useCallback, useEffect, useState } from "react";
import { friendshipApi } from "../../services/friendshipApi";
import "./FriendsPage.css";

// Backend API address
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// ==========================================
// HELPER: GET OTHER USER IN A FRIENDSHIP
// ==========================================

function getOtherUserId(friendship, currentUserId) {
  if (
    Number(friendship.requesterId) ===
    Number(currentUserId)
  ) {
    return friendship.receiverId;
  }

  if (
    Number(friendship.receiverId) ===
    Number(currentUserId)
  ) {
    return friendship.requesterId;
  }

  return null;
}

// ==========================================
// REUSABLE USER CARD
// ==========================================

function UserCard({ userId, subtitle, children }) {
  return (
    <article className="fr-card">
      <div className="fr-card-top">
        <div className="fr-identity">
          <h3 className="fr-username">
            {userId == null
              ? "Unknown User"
              : `User #${userId}`}
          </h3>

          <span className="fr-score-label">
            {subtitle}
          </span>
        </div>
      </div>

      {children}
    </article>
  );
}

// ==========================================
// FRIENDS PAGE - API VERSION
// ==========================================

export default function FriendsPageApi() {
  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] =
    useState([]);
  const [outgoingRequests, setOutgoingRequests] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================
  // LOAD FRIENDSHIPS FROM API
  // ==========================================

  const loadFriendships = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error(
        "Please log in before accessing your friends."
      );
    }

    // Retrieve authenticated user information.
    const profileResponse = await fetch(
      `${API_BASE_URL}/api/profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!profileResponse.ok) {
      if (profileResponse.status === 401) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      throw new Error(
        "Could not load your profile."
      );
    }

    const profileData = await profileResponse.json();
    const userId = Number(profileData.user?.id);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "Invalid user information."
      );
    }

    // Retrieve accepted and pending friendships.
    const [accepted, incoming, outgoing] =
      await Promise.all([
        friendshipApi.getFriends(),
        friendshipApi.getIncomingRequests(),
        friendshipApi.getOutgoingRequests(),
      ]);

    return {
      userId,
      accepted,
      incoming,
      outgoing,
    };
  }, []);

  // ==========================================
  // REFRESH FRIENDSHIP LISTS
  // ==========================================

  const refreshFriendships = useCallback(async () => {
    const data = await loadFriendships();

    setCurrentUserId(data.userId);
    setFriends(data.accepted);
    setIncomingRequests(data.incoming);
    setOutgoingRequests(data.outgoing);
  }, [loadFriendships]);

  // ==========================================
  // LOAD DATA WHEN PAGE OPENS
  // ==========================================

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const data = await loadFriendships();

        if (!active) return;

        setCurrentUserId(data.userId);
        setFriends(data.accepted);
        setIncomingRequests(data.incoming);
        setOutgoingRequests(data.outgoing);
        setError("");
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load friendships."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [loadFriendships]);

  // ==========================================
  // PERFORM FRIENDSHIP ACTION
  // ==========================================

  async function performAction(action, successMessage) {
    if (busy) return;

    setBusy(true);
    setMessage("");
    setError("");

    try {
      await action();
      await refreshFriendships();
      setMessage(successMessage);
    } catch (err) {
      setError(
        err.message || "Friendship operation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // ==========================================
  // FRIENDSHIP BUTTON HANDLERS
  // ==========================================

  function handleAccept(requestId) {
    return performAction(
      () => friendshipApi.acceptRequest(requestId),
      "Friend request accepted."
    );
  }

  function handleDecline(requestId) {
    return performAction(
      () => friendshipApi.declineRequest(requestId),
      "Friend request declined."
    );
  }

  function handleCancel(requestId) {
    return performAction(
      () => friendshipApi.cancelRequest(requestId),
      "Friend request cancelled."
    );
  }

  function handleRemove(friendshipId) {
    return performAction(
      () => friendshipApi.removeFriend(friendshipId),
      "Friend removed."
    );
  }

  // ==========================================
  // RETRY LOADING
  // ==========================================

  async function handleRetry() {
    if (loading || busy) return;

    setLoading(true);
    setError("");

    try {
      await refreshFriendships();
    } catch (err) {
      setError(
        err.message || "Unable to load friendships."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="fr-page">
      {/* PAGE HEADER */}
      <header className="fr-header">
        <div>
          <h1 className="fr-title">Friends</h1>

          <p className="fr-subtitle">
            Manage your friends and friend requests.
          </p>
        </div>
      </header>

      {/* LOADING MESSAGE */}
      {loading && (
        <div className="fr-empty" role="status">
          <p>Loading your friendships...</p>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="fr-empty" role="alert">
          <p>{error}</p>

          <button
            type="button"
            className="fr-btn-secondary"
            disabled={loading || busy}
            onClick={handleRetry}
          >
            Try Again
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {message && (
        <div className="fr-empty" role="status">
          <p>{message}</p>
        </div>
      )}

      {!loading && currentUserId !== null && (
        <>
          {/* ===================================
              INCOMING FRIEND REQUESTS
          =================================== */}
          <section>
            <h2 className="fr-title">
              Friend Requests
            </h2>

            <div className="fr-grid">
              {incomingRequests.length === 0 ? (
                <div className="fr-empty">
                  <h3>No pending requests</h3>

                  <p>
                    You do not have any incoming
                    friend requests.
                  </p>
                </div>
              ) : (
                incomingRequests.map((request) => (
                  <UserCard
                    key={request.id}
                    userId={request.requesterId}
                    subtitle="Friend Request"
                  >
                    <div className="fr-actions">
                      <button
                        type="button"
                        className="fr-btn-primary"
                        disabled={busy}
                        onClick={() =>
                          handleAccept(request.id)
                        }
                      >
                        Accept
                      </button>

                      <button
                        type="button"
                        className="fr-btn-secondary"
                        disabled={busy}
                        onClick={() =>
                          handleDecline(request.id)
                        }
                      >
                        Decline
                      </button>
                    </div>
                  </UserCard>
                ))
              )}
            </div>
          </section>

          {/* ===================================
              ACCEPTED FRIENDSHIPS
          =================================== */}
          <section>
            <h2 className="fr-title">
              Your Friends
            </h2>

            <div className="fr-grid">
              {friends.length === 0 ? (
                <div className="fr-empty">
                  <h3>No friends yet</h3>

                  <p>
                    Accept a friend request to add
                    someone to your friends.
                  </p>
                </div>
              ) : (
                friends.map((friendship) => {
                  const friendId = getOtherUserId(
                    friendship,
                    currentUserId
                  );

                  return (
                    <UserCard
                      key={friendship.id}
                      userId={friendId}
                      subtitle="Friend"
                    >
                      <div className="fr-actions">
                        <button
                          type="button"
                          className="fr-btn-secondary"
                          disabled={busy}
                          onClick={() =>
                            handleRemove(friendship.id)
                          }
                        >
                          Remove Friend
                        </button>
                      </div>
                    </UserCard>
                  );
                })
              )}
            </div>
          </section>

          {/* ===================================
              OUTGOING FRIEND REQUESTS
          =================================== */}
          <section>
            <h2 className="fr-title">
              Sent Requests
            </h2>

            <div className="fr-grid">
              {outgoingRequests.length === 0 ? (
                <div className="fr-empty">
                  <p>
                    You have no pending outgoing requests.
                  </p>
                </div>
              ) : (
                outgoingRequests.map((request) => (
                  <UserCard
                    key={request.id}
                    userId={request.receiverId}
                    subtitle="Request Pending"
                  >
                    <div className="fr-actions">
                      <button
                        type="button"
                        className="fr-btn-secondary"
                        disabled={busy}
                        onClick={() =>
                          handleCancel(request.id)
                        }
                      >
                        Cancel Request
                      </button>
                    </div>
                  </UserCard>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
