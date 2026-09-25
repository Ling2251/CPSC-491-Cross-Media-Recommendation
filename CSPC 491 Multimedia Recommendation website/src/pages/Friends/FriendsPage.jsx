import React, {
  useEffect,
  useState,
} from "react";

import { friendshipService } from "../../services/friendshipservices";
import { users } from "../../data/users";

import FriendRequestCard from "./FriendRequestCard";
import "../FriendSuggestions/FriendSuggestions.css";

const FriendsPage = () => {
  const currentUserId = 1;

  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] =
    useState([]);
  const [outgoingRequests, setOutgoingRequests] =
    useState([]);
  const [message, setMessage] = useState("");

  const refreshFriendships = () => {
    setFriends(
      friendshipService.getFriends(currentUserId)
    );

    setIncomingRequests(
      friendshipService.getIncomingRequests(
        currentUserId
      )
    );

    setOutgoingRequests(
      friendshipService.getOutgoingRequests(
        currentUserId
      )
    );
  };

  useEffect(() => {
    refreshFriendships();
  }, []);

  const handleAccept = (requestId) => {
    const result =
      friendshipService.acceptRequest(requestId);

    setMessage(result.message);

    if (result.success) {
      refreshFriendships();
    }
  };

  const handleDecline = (requestId) => {
    const result =
      friendshipService.declineRequest(requestId);

    setMessage(result.message);

    if (result.success) {
      refreshFriendships();
    }
  };

  const handleRemove = (friendshipId) => {
    const result =
      friendshipService.removeFriend(friendshipId);

    setMessage(result.message);

    if (result.success) {
      refreshFriendships();
    }
  };

  const getUser = (userId) =>
    users.find(
      (user) =>
        Number(user.id) === Number(userId)
    );

  return (
    <div className="fr-page">
      <header className="fr-header">
        <div>
          <h1 className="fr-title">
            Friends
          </h1>

          <p className="fr-subtitle">
            Manage your friends and friend requests.
          </p>
        </div>
      </header>

      {message && (
        <div className="fr-empty">
          <p>{message}</p>
        </div>
      )}

      <section>
        <h2 className="fr-title">
          Friend Requests
        </h2>

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

      <section>
        <h2 className="fr-title">
          Your Friends
        </h2>

        <div className="fr-grid">
          {friends.length === 0 ? (
            <div className="fr-empty">
              <h3>No friends yet</h3>
              <p>
                Add someone from Friend Suggestions to get started.
              </p>
            </div>
          ) : (
            friends.map((friendship) => {
              const friendId =
                friendshipService.getOtherUserId(
                  friendship,
                  currentUserId
                );

              const friend = getUser(friendId);

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
            outgoingRequests.map((request) => {
              const receiver =
                getUser(request.receiverId);

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

                  {receiver?.bio && (
                    <p className="fr-bio">
                      {receiver.bio}
                    </p>
                  )}
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