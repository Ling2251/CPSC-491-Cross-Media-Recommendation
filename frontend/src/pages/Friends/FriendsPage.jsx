
import { useState } from "react";
import "./FriendsPage.css";

import { friendshipService } from "../../services/friendshipService.js";
import {
  canViewUserActivity,
  getUserById,
} from "../../services/privacyService";

import FriendRequestCard from "./FriendRequestCard";

const FriendsPage = () => {
  // Temporary logged-in user.
  // Replace with authenticated user later.
  const currentUserId = 1;

  const [friends, setFriends] = useState(() =>
    friendshipService.getFriends(currentUserId)
  );

  const [incomingRequests, setIncomingRequests] = useState(() =>
    friendshipService.getIncomingRequests(currentUserId)
  );

  const [outgoingRequests, setOutgoingRequests] = useState(() =>
    friendshipService.getOutgoingRequests(currentUserId)
  );

  const [message, setMessage] = useState("");

  // Refresh friendship data after an operation.
  const refreshFriendships = () => {
    setFriends(friendshipService.getFriends(currentUserId));
    setIncomingRequests(
      friendshipService.getIncomingRequests(currentUserId)
    );
    setOutgoingRequests(
      friendshipService.getOutgoingRequests(currentUserId)
    );
  };

  // Accept an incoming friend request.
  const handleAccept = (requestId) => {
    const result = friendshipService.acceptRequest(
      requestId,
      currentUserId
    );

    setMessage(result.message);

    if (result.success) {
      refreshFriendships();
    }
  };

  // Decline an incoming friend request.
  const handleDecline = (requestId) => {
    const result = friendshipService.declineRequest(
      requestId,
      currentUserId
    );

    setMessage(result.message);

    if (result.success) {
      refreshFriendships();
    }
  };

  // Remove an accepted friend.
  const handleRemove = (friendshipId) => {
    const result = friendshipService.removeFriend(
      friendshipId,
      currentUserId
    );

    setMessage(result.message);

    if (result.success) {
      refreshFriendships();
    }
  };

  // NEW: Cancel an outgoing friend request.
  const handleCancel = (requestId) => {
    const result = friendshipService.cancelRequest(
      requestId,
      currentUserId
    );

    setMessage(result.message);

    if (result.success) {
      refreshFriendships();
    }
  };

  return (
    <div className="fr-page">
      <header className="fr-header">
        <div>
          <h1 className="fr-title">Friends</h1>
          <p className="fr-subtitle">
            Manage your friends and friend requests.
          </p>
        </div>
        <a className="fr-btn-primary" href="/suggestions">
          Find Friends
        </a>
      </header>

      {message && (
        <div className="fr-empty" role="status">
          <p>{message}</p>
        </div>
      )}

      {/* INCOMING REQUESTS */}
      <section>
        <h2 className="fr-title">Friend Requests</h2>

        <div className="fr-grid">
          {incomingRequests.length === 0 ? (
            <div className="fr-empty">
              <h3>No pending requests</h3>
              <p>
                You do not have any incoming friend requests.
              </p>
            </div>
          ) : (
            incomingRequests.map((request) => (
              <FriendRequestCard
                key={request.id}
                request={request}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))
          )}
        </div>
      </section>

      {/* ACCEPTED FRIENDS */}
      <section>
        <h2 className="fr-title">Your Friends</h2>

        <div className="fr-grid">
          {friends.length === 0 ? (
            <div className="fr-empty">
              <h3>No friends yet</h3>
              <p>
                Accept a friend request to add someone to
                your friends.
              </p>
            </div>
          ) : (
            friends.map((friendship) => {
              const friendId =
                friendshipService.getOtherUserId(
                  friendship,
                  currentUserId
                );

              const friend = getUserById(friendId);

              const canViewActivity = canViewUserActivity(
                currentUserId,
                friendId
              );

              return (
                <article
                  key={friendship.id}
                  className="fr-card"
                >
                  <div className="fr-card-top">
                    {friend?.profile_pic && (
                      <img
                        src={friend.profile_pic}
                        alt={friend.username}
                        className="fr-avatar"
                      />
                    )}

                    <div className="fr-identity">
                      <h3 className="fr-username">
                        {friend?.username ??
                          `User #${friendId}`}
                      </h3>

                      <span className="fr-score-label">
                        Friend
                      </span>
                    </div>
                  </div>

                  {friend?.bio && (
                    <p className="fr-bio">
                      {friend.bio}
                    </p>
                  )}

                  <div className="fr-tags">
                    {canViewActivity ? (
                      <span className="fr-tag">
                        Public Activity
                      </span>
                    ) : (
                      <span className="fr-tag">
                        Private Activity
                      </span>
                    )}
                  </div>

                  {!canViewActivity && (
                    <p className="fr-subtitle">
                      This user's activity is private.
                      Their ratings, reviews, and
                      watchlist activity will not appear
                      in your activity feed.
                    </p>
                  )}

                  <div className="fr-actions">
                    <button
                      type="button"
                      className="fr-btn-secondary"
                      onClick={() =>
                        handleRemove(friendship.id)
                      }
                    >
                      Remove Friend
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* OUTGOING REQUESTS */}
      <section>
        <h2 className="fr-title">Sent Requests</h2>

        <div className="fr-grid">
          {outgoingRequests.length === 0 ? (
            <div className="fr-empty">
              <p>
                You have no pending outgoing requests.
              </p>
            </div>
          ) : (
            outgoingRequests.map((request) => {
              const receiver = getUserById(
                request.receiverId
              );

              return (
                <article
                  key={request.id}
                  className="fr-card"
                >
                  <div className="fr-card-top">
                    {receiver?.profile_pic && (
                      <img
                        src={receiver.profile_pic}
                        alt={receiver.username}
                        className="fr-avatar"
                      />
                    )}

                    <div className="fr-identity">
                      <h3 className="fr-username">
                        {receiver?.username ??
                          `User #${request.receiverId}`}
                      </h3>

                      <span className="fr-score-label">
                        Request Pending
                      </span>
                    </div>
                  </div>

                  {/* NEW: Cancel Request button */}
                  <div className="fr-actions">
                    <button
                      type="button"
                      className="fr-btn-secondary"
                      onClick={() =>
                        handleCancel(request.id)
                      }
                    >
                      Cancel Request
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default FriendsPage;
