
const pool = require("../db");

function validateUserId(userId) {
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    userId > 2147483647
  ) {
    throw new Error("Invalid user ID");
  }
}

async function getFriendsActivityFeed(userId, limit = 20) {
  validateUserId(userId);

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Limit must be between 1 and 100");
  }

  const query = `
    SELECT
      a.id,
      a.user_id,
      u.name AS user_name,
      a.media_id,
      m.title AS media_title,
      m.media_type,
      a.activity_type,
      a.created_at
    FROM activities a
    JOIN users u ON u.id = a.user_id
    JOIN media m ON m.id = a.media_id
    WHERE u.activity_public = TRUE
      AND a.user_id <> $1
      AND EXISTS (
        SELECT 1
        FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = $1 AND f.receiver_id = a.user_id)
            OR
            (f.receiver_id = $1 AND f.requester_id = a.user_id)
          )
      )
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);

  return result.rows;
}

module.exports = {
  validateUserId,
  getFriendsActivityFeed,
};
