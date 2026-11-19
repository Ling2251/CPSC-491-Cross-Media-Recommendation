
const pool = require("../db");

const VALID_ACTIVITY_TYPES = [
  "rating",
  "review",
  "watchlist_add",
];

function validateActivity(userId, mediaId, activityType) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
    throw new Error("Invalid media ID");
  }

  if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
    throw new Error("Invalid activity type");
  }
}

async function recordActivity(userId, mediaId, activityType) {
  validateActivity(userId, mediaId, activityType);

  const query = `
    INSERT INTO activities (user_id, media_id, activity_type)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, media_id, activity_type, created_at
  `;

  const result = await pool.query(query, [
    userId,
    mediaId,
    activityType,
  ]);

  return result.rows[0];
}

async function getUserActivities(userId, limit = 20) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }

  const query = `
    SELECT id, user_id, media_id, activity_type, created_at
    FROM activities
    WHERE user_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);

  return result.rows;
}

module.exports = {
  VALID_ACTIVITY_TYPES,
  validateActivity,
  recordActivity,
  getUserActivities,
};
