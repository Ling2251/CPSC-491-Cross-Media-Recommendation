
const pool = require("../db");

// Validate PostgreSQL integer IDs.
function validateId(value, name) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 2147483647
  ) {
    throw new Error(`Invalid ${name}`);
  }
}

// Save a rating or watchlist addition.
// Automatically create an activity when the interaction changes.
async function saveMediaInteraction(
  userId,
  mediaId,
  interactionType,
  rating = null
) {
  validateId(userId, "user ID");
  validateId(mediaId, "media ID");

  if (!["rated", "saved"].includes(interactionType)) {
    throw new Error("Invalid interaction type");
  }

  if (
    interactionType === "rated" &&
    (!Number.isInteger(rating) || rating < 1 || rating > 5)
  ) {
    throw new Error("Rating must be between 1 and 5");
  }

  if (interactionType === "saved" && rating !== null) {
    throw new Error("Saved interactions cannot have ratings");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let interaction;
    let shouldRecordActivity = false;

    if (interactionType === "rated") {
      // Insert a new rating or update an existing rating.
      const result = await client.query(
        `
        INSERT INTO user_media_interactions
          (user_id, media_id, interaction_type, rating)
        VALUES ($1, $2, 'rated', $3)
        ON CONFLICT (user_id, media_id, interaction_type)
        DO UPDATE SET rating = EXCLUDED.rating
        WHERE user_media_interactions.rating
          IS DISTINCT FROM EXCLUDED.rating
        RETURNING *
        `,
        [userId, mediaId, rating]
      );

      if (result.rows.length > 0) {
        interaction = result.rows[0];
        shouldRecordActivity = true;
      } else {
        // Rating already exists with the same value.
        const existing = await client.query(
          `
          SELECT *
          FROM user_media_interactions
          WHERE user_id = $1
            AND media_id = $2
            AND interaction_type = 'rated'
          `,
          [userId, mediaId]
        );

        interaction = existing.rows[0];
      }
    } else {
      // Save media to the user's watchlist.
      const result = await client.query(
        `
        INSERT INTO user_media_interactions
          (user_id, media_id, interaction_type, rating)
        VALUES ($1, $2, 'saved', NULL)
        ON CONFLICT (user_id, media_id, interaction_type)
        DO NOTHING
        RETURNING *
        `,
        [userId, mediaId]
      );

      if (result.rows.length > 0) {
        interaction = result.rows[0];
        shouldRecordActivity = true;
      } else {
        // Media is already saved.
        const existing = await client.query(
          `
          SELECT *
          FROM user_media_interactions
          WHERE user_id = $1
            AND media_id = $2
            AND interaction_type = 'saved'
          `,
          [userId, mediaId]
        );

        interaction = existing.rows[0];
      }
    }

    let activity = null;

    if (shouldRecordActivity) {
      const activityType =
        interactionType === "rated"
          ? "rating"
          : "watchlist_add";

      const result = await client.query(
        `
        INSERT INTO activities
          (user_id, media_id, activity_type)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [userId, mediaId, activityType]
      );

      activity = result.rows[0];
    }

    await client.query("COMMIT");

    return {
      interaction,
      activity,
      createdActivity: shouldRecordActivity,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Transaction rollback failed:", rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  saveMediaInteraction,
};
