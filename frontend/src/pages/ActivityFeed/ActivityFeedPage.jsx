
import { useEffect, useState } from "react";
import { getFriendsActivityFeed } from "../../services/activityFeedApi";
import {
  getActivityPrivacy,
  updateActivityPrivacy,
} from "../../services/activityPrivacyApi";

import "./ActivityFeedPage.css";

const activityLabels = {
  rating: "rated",
  review: "reviewed",
  watchlist_add: "added to their watchlist",
};

function ActivityFeedPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activityPublic, setActivityPublic] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState("");
  const [privacyMessage, setPrivacyMessage] = useState("");

  async function loadActivities() {
    setLoading(true);
    setError("");

    try {
      const data = await getFriendsActivityFeed();
      setActivities(data);
    } catch (err) {
      setError(err.message || "Failed to load activity feed.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPrivacy() {
    setPrivacyLoading(true);
    setPrivacyError("");

    try {
      const data = await getActivityPrivacy();
      setActivityPublic(data.activityPublic);
    } catch (err) {
      setPrivacyError(
        err.message || "Failed to load privacy settings."
      );
    } finally {
      setPrivacyLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
    loadPrivacy();
  }, []);

  async function handlePrivacyChange(event) {
    const newValue = event.target.checked;

    setPrivacySaving(true);
    setPrivacyError("");
    setPrivacyMessage("");

    try {
      const result = await updateActivityPrivacy(newValue);

      setActivityPublic(result.activityPublic);
      setPrivacyMessage("Activity sharing updated successfully.");
    } catch (err) {
      setPrivacyError(
        err.message || "Failed to update privacy settings."
      );
    } finally {
      setPrivacySaving(false);
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  return (
    <main className="activity-feed-page">
      <div className="activity-feed-header">
        <h1>Friends Activity Feed</h1>
        <p>
          Discover what your friends are watching,
          rating, and reviewing.
        </p>

        <button
          type="button"
          onClick={loadActivities}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh Feed"}
        </button>
      </div>

      <section className="activity-privacy-panel">
        <h2>Activity Privacy</h2>
        <p>
          Control whether your friends can see your
          ratings, reviews, and watchlist additions.
        </p>

        {privacyLoading ? (
          <p role="status">Loading privacy settings...</p>
        ) : (
          <label className="activity-privacy-toggle">
            <input
              type="checkbox"
              checked={activityPublic}
              onChange={handlePrivacyChange}
              disabled={privacySaving || Boolean(privacyError)}
            />
            <span>Share my activity with friends</span>
          </label>
        )}

        {privacySaving && <p>Saving privacy settings...</p>}

        {privacyMessage && (
          <p role="status" className="activity-privacy-success">
            {privacyMessage}
          </p>
        )}

        {privacyError && (
          <div role="alert" className="activity-privacy-error">
            <p>{privacyError}</p>
            <button type="button" onClick={loadPrivacy}>
              Retry Privacy Settings
            </button>
          </div>
        )}
      </section>

      {loading && (
        <p role="status">Loading your friends' activities...</p>
      )}

      {!loading && error && (
        <div role="alert" className="activity-feed-error">
          <p>{error}</p>
          <button type="button" onClick={loadActivities}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="activity-feed-empty">
          <h2>No activities yet</h2>
          <p>
            When your friends rate, review, or save media,
            their shared activities will appear here.
          </p>
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="activity-feed-list">
          {activities.map((activity) => (
            <article className="activity-card" key={activity.id}>
              <div className="activity-card-header">
                <strong>{activity.user_name}</strong>
                <time dateTime={activity.created_at}>
                  {formatDate(activity.created_at)}
                </time>
              </div>

              <p>
                {activityLabels[activity.activity_type] ||
                  "interacted with"}{" "}
                <strong>{activity.media_title}</strong>
              </p>

              <span className="activity-media-type">
                {activity.media_type}
              </span>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default ActivityFeedPage;
