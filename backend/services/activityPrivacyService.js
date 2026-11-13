
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

// Retrieve the user's current activity-sharing setting.
async function getActivityPrivacy(userId) {
  validateUserId(userId);

  const result = await pool.query(
    `
    SELECT id, activity_public
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  return {
    userId: result.rows[0].id,
    activityPublic: result.rows[0].activity_public,
  };
}

// Update the user's activity-sharing setting.
async function updateActivityPrivacy(userId, activityPublic) {
  validateUserId(userId);

  if (typeof activityPublic !== "boolean") {
    throw new Error("Activity privacy must be a boolean");
  }

  const result = await pool.query(
    `
    UPDATE users
    SET activity_public = $2
    WHERE id = $1
    RETURNING id, activity_public
    `,
    [userId, activityPublic]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  return {
    userId: result.rows[0].id,
    activityPublic: result.rows[0].activity_public,
  };
}

module.exports = {
  validateUserId,
  getActivityPrivacy,
  updateActivityPrivacy,
};
