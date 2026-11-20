
const express = require("express");
const jwt = require("jsonwebtoken");

const activityFeedService = require("../services/activityFeedService");

const router = express.Router();

function isValidId(value) {
  return (
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2147483647
  );
}

// Require authentication for the Friends Activity Feed.
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

    req.feedUserId = userId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

router.use(authenticateUser);

// GET /api/feed
// Optional query parameter: ?limit=20
router.get("/", async (req, res) => {
  const rawLimit = req.query.limit;
  const limit =
    rawLimit === undefined ? 20 : Number(rawLimit);

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
    const activities =
      await activityFeedService.getFriendsActivityFeed(
        req.feedUserId,
        limit
      );

    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Activity Feed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve activity feed",
    });
  }
});

module.exports = router;
