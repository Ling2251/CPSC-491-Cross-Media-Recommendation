
const express = require("express");
const jwt = require("jsonwebtoken");
const forumService = require("../services/mediaForumService");

const router = express.Router();

function validId(value) {
  const text = String(value);
  return (
    /^[1-9]\d*$/.test(text) &&
    Number.isSafeInteger(Number(text)) &&
    Number(text) <= 2147483647
  );
}

function authenticateUser(req, res, next) {
  const auth = req.headers.authorization;

  const token =
    typeof auth === "string" && auth.startsWith("Bearer ")
      ? auth.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Authentication is not configured",
    });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    if (!validId(payload.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication identity",
      });
    }

    req.forumUserId = Number(payload.userId);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

function handleError(res, error) {
  if (error.code === "23503") {
    return res.status(404).json({
      success: false,
      message: "Media item or forum post not found",
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      success: false,
      message: "Invalid forum content",
    });
  }

  if (error.message?.includes("not authorized")) {
    return res.status(404).json({
      success: false,
      message: "Post not found or not authorized",
    });
  }

  console.error("Media Forum error:", error);

  return res.status(500).json({
    success: false,
    message: "Forum operation failed",
  });
}

function validateContent(req, res) {
  try {
    return forumService.validateContent(req.body?.content);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return null;
  }
}

// Require authentication for all forum operations.
router.use(authenticateUser);

// GET /api/forums/media/:mediaId
router.get("/media/:mediaId", async (req, res) => {
  if (!validId(req.params.mediaId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid media ID",
    });
  }

  const limit =
    req.query.limit === undefined
      ? 20
      : Number(req.query.limit);

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Limit must be between 1 and 100",
    });
  }

  try {
    const posts = await forumService.getMediaPosts(
      Number(req.params.mediaId),
      limit
    );

    return res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/forums/media/:mediaId
router.post("/media/:mediaId", async (req, res) => {
  if (!validId(req.params.mediaId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid media ID",
    });
  }

  const content = validateContent(req, res);
  if (content === null) return;

  try {
    const post = await forumService.createPost(
      req.forumUserId,
      Number(req.params.mediaId),
      content
    );

    return res.status(201).json({
      success: true,
      message: "Forum post created",
      post,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/forums/posts/:postId/replies
router.get("/posts/:postId/replies", async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid post ID",
    });
  }

  try {
    const replies = await forumService.getPostReplies(
      Number(req.params.postId)
    );

    return res.status(200).json({
      success: true,
      replies,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/forums/posts/:postId/replies
router.post("/posts/:postId/replies", async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid post ID",
    });
  }

  const content = validateContent(req, res);
  if (content === null) return;

  try {
    const reply = await forumService.createReply(
      req.forumUserId,
      Number(req.params.postId),
      content
    );

    return res.status(201).json({
      success: true,
      message: "Reply created",
      reply,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// PATCH /api/forums/posts/:postId
router.patch("/posts/:postId", async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid post ID",
    });
  }

  const content = validateContent(req, res);
  if (content === null) return;

  try {
    const post = await forumService.editPost(
      req.forumUserId,
      Number(req.params.postId),
      content
    );

    return res.status(200).json({
      success: true,
      message: "Post updated",
      post,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// DELETE /api/forums/posts/:postId
router.delete("/posts/:postId", async (req, res) => {
  if (!validId(req.params.postId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid post ID",
    });
  }

  try {
    await forumService.deletePost(
      req.forumUserId,
      Number(req.params.postId)
    );

    return res.status(200).json({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
