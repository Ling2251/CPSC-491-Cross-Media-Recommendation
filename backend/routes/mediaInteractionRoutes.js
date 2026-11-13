
const express = require("express");
const jwt = require("jsonwebtoken");

const mediaInteractionService = require("../services/mediaInteractionService");

const router = express.Router();

function isValidId(value) {
  return (
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2147483647
  );
}

// Require a valid JWT for every media interaction.
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

    const userId = Number(payload.userId);

    if (!isValidId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication identity",
      });
    }

    req.mediaUserId = userId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

router.use(authenticateUser);

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
      message: "Invalid media interaction",
    });
  }

  console.error("Media interaction error:", error);

  return res.status(500).json({
    success: false,
    message: "Failed to save media interaction",
  });
}

// POST /api/media-interactions/rating
// Body: { "mediaId": 1, "rating": 5 }
router.post("/rating", async (req, res) => {
  const { mediaId, rating } = req.body || {};

  if (!isValidId(mediaId)) {
    return res.status(400).json({
      success: false,
      message: "A valid numeric mediaId is required",
    });
  }

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return res.status(400).json({
      success: false,
      message: "Rating must be between 1 and 5",
    });
  }

  try {
    const result = await mediaInteractionService.saveMediaInteraction(
      req.mediaUserId,
      mediaId,
      "rated",
      rating
    );

    return res.status(200).json({
      success: true,
      message: result.createdActivity
        ? "Rating saved and activity recorded"
        : "Rating already up to date",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/media-interactions/watchlist
// Body: { "mediaId": 1 }
router.post("/watchlist", async (req, res) => {
  const { mediaId } = req.body || {};

  if (!isValidId(mediaId)) {
    return res.status(400).json({
      success: false,
      message: "A valid numeric mediaId is required",
    });
  }

  try {
    const result = await mediaInteractionService.saveMediaInteraction(
      req.mediaUserId,
      mediaId,
      "saved"
    );

    return res.status(200).json({
      success: true,
      message: result.createdActivity
        ? "Media saved and activity recorded"
        : "Media already saved",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
