
const pool = require("../db");

function validateId(value, name) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 2147483647
  ) {
    throw new Error(`Invalid ${name}`);
  }
}

function validateReview(content) {
  if (typeof content !== "string") {
    throw new Error("Review content must be text");
  }

  const trimmed = content.trim();

  if (trimmed.length < 1 || trimmed.length > 2000) {
    throw new Error(
      "Review must contain between 1 and 2000 characters"
    );
  }

  return trimmed;
}

// Create a review and its activity in one transaction.
async function createReview(userId, mediaId, content) {
  validateId(userId, "user ID");
  validateId(mediaId, "media ID");

  const validContent = validateReview(content);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Save the review.
    const reviewResult = await client.query(
      `
      INSERT INTO media_reviews
        (user_id, media_id, content)
      VALUES ($1, $2, $3)
      RETURNING
        id, user_id, media_id, content,
        created_at, updated_at
      `,
      [userId, mediaId, validContent]
    );

    const review = reviewResult.rows[0];

    // Automatically record the review activity.
    const activityResult = await client.query(
      `
      INSERT INTO activities
        (user_id, media_id, activity_type)
      VALUES ($1, $2, 'review')
      RETURNING
        id, user_id, media_id,
        activity_type, created_at
      `,
      [userId, mediaId]
    );

    const activity = activityResult.rows[0];

    await client.query("COMMIT");

    return {
      review,
      activity,
      createdActivity: true,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Review transaction rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

// Retrieve reviews for a specific media item.
async function getMediaReviews(mediaId, limit = 20) {
  validateId(mediaId, "media ID");

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Limit must be between 1 and 100");
  }

  const result = await pool.query(
    `
    SELECT
      r.id,
      r.user_id,
      u.name AS author_name,
      r.media_id,
      r.content,
      r.created_at,
      r.updated_at
    FROM media_reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.media_id = $1
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT $2
    `,
    [mediaId, limit]
  );

  return result.rows;
}

// Retrieve reviews written by a specific user.
// Only expose this through appropriately authorized routes.
async function getUserReviews(userId, limit = 20) {
  validateId(userId, "user ID");

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Limit must be between 1 and 100");
  }

  const result = await pool.query(
    `
    SELECT
      id, user_id, media_id, content,
      created_at, updated_at
    FROM media_reviews
    WHERE user_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows;
}

module.exports = {
  validateReview,
  createReview,
  getMediaReviews,
  getUserReviews,
};
