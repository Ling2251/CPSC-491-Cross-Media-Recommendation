
const pool = require("../db");

function validateId(id, name = "ID") {
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    id > 2147483647
  ) {
    throw new Error(`Invalid ${name}`);
  }
}

function validateContent(content) {
  if (typeof content !== "string") {
    throw new Error("Content must be text");
  }

  const trimmed = content.trim();

  if (trimmed.length < 1 || trimmed.length > 2000) {
    throw new Error(
      "Content must contain between 1 and 2000 characters"
    );
  }

  return trimmed;
}

// Create a forum post for a media item.
async function createPost(userId, mediaId, content) {
  validateId(userId, "user ID");
  validateId(mediaId, "media ID");

  const validContent = validateContent(content);

  const result = await pool.query(
    `
    INSERT INTO forum_posts (user_id, media_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [userId, mediaId, validContent]
  );

  return result.rows[0];
}

// Retrieve posts for one media item.
async function getMediaPosts(mediaId, limit = 20) {
  validateId(mediaId, "media ID");

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }

  const result = await pool.query(
    `
    SELECT
      p.*,
      u.name AS author_name
    FROM forum_posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.media_id = $1
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $2
    `,
    [mediaId, limit]
  );

  return result.rows;
}

// Create a reply to an existing forum post.
async function createReply(userId, postId, content) {
  validateId(userId, "user ID");
  validateId(postId, "post ID");

  const validContent = validateContent(content);

  const result = await pool.query(
    `
    INSERT INTO forum_replies (user_id, post_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [userId, postId, validContent]
  );

  return result.rows[0];
}

// Retrieve replies for a forum post.
async function getPostReplies(postId) {
  validateId(postId, "post ID");

  const result = await pool.query(
    `
    SELECT
      r.*,
      u.name AS author_name
    FROM forum_replies r
    JOIN users u ON u.id = r.user_id
    WHERE r.post_id = $1
    ORDER BY r.created_at ASC, r.id ASC
    `,
    [postId]
  );

  return result.rows;
}

// Edit a post only if the user is its author.
async function editPost(userId, postId, content) {
  validateId(userId, "user ID");
  validateId(postId, "post ID");

  const validContent = validateContent(content);

  const result = await pool.query(
    `
    UPDATE forum_posts
    SET content = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND user_id = $1
    RETURNING *
    `,
    [userId, postId, validContent]
  );

  if (result.rows.length === 0) {
    throw new Error("Post not found or not authorized");
  }

  return result.rows[0];
}

// Delete a post only if the user is its author.
async function deletePost(userId, postId) {
  validateId(userId, "user ID");
  validateId(postId, "post ID");

  const result = await pool.query(
    `
    DELETE FROM forum_posts
    WHERE id = $2 AND user_id = $1
    RETURNING id
    `,
    [userId, postId]
  );

  if (result.rows.length === 0) {
    throw new Error("Post not found or not authorized");
  }

  return true;
}

module.exports = {
  validateId,
  validateContent,
  createPost,
  getMediaPosts,
  createReply,
  getPostReplies,
  editPost,
  deletePost,
};
