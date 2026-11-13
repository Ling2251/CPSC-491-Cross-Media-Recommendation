
const express = require("express");
const jwt = require("jsonwebtoken");
const reviewService = require("../services/mediaReviewService");

const router = express.Router();

function isValidId(value) {
  return (
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0 &&
    Number(value) <= 2147483647
  );
}

function authenticateUser(req, res, next) {
  const authorization = req.headers.authorization;

  const token =
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
      ? authorization.slice(7)
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
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (!isValidId(payload.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication identity",
      });
    }

    req.reviewUserId = Number(payload.userId);
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
      message: "User or media item not found",
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      success: false,
      message: "Invalid review content",
    });
  }

  console.error("Review API error:", error);

  return res.status(500).json({
    success: false,
    message: "Review operation failed",
  });
}

// POST /api/reviews
router.post("/", authenticateUser, async (req, res) => {
  const { mediaId, content } = req.body || {};

  if (!isValidId(mediaId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid media ID",
    });
  }

  let validatedContent;

  try {
    validatedContent = reviewService.validateReview(content);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  try {
    const result = await reviewService.createReview(
      req.reviewUserId,
      Number(mediaId),
      validatedContent
    );

    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/reviews/media/:mediaId
router.get("/media/:mediaId", async (req, res) => {
  if (!isValidId(req.params.mediaId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid media ID",
    });
  }

  try {
    const reviews = await reviewService.getMediaReviews(
      Number(req.params.mediaId)
    );

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
