
const express = require("express");
const jwt = require("jsonwebtoken");

const activityService = require("../services/activityService");

const router = express.Router();

// =====================================================
// AUTHENTICATION
// =====================================================

function authenticateActivityUser(req, res, next) {
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

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      userId > 2147483647
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication identity",
      });
    }

    req.activityUserId = userId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

router.use(authenticateActivityUser);

// =====================================================
// GET CURRENT USER'S ACTIVITIES
// GET /api/activities/me
// =====================================================

router.get("/me", async (req, res) => {
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
    const activities = await activityService.getUserActivities(
      req.activityUserId,
      limit
    );

    return res.status(200).json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Activity retrieval error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve activities",
    });
  }
});

// =====================================================
// RECORD ACTIVITY - DEVELOPMENT ONLY
// POST /api/activities
// Body: { "mediaId": 5, "activityType": "rating" }
// =====================================================

router.post("/", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  const { mediaId, activityType } = req.body || {};

  if (
    !Number.isSafeInteger(mediaId) ||
    mediaId <= 0 ||
    mediaId > 2147483647
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid numeric mediaId is required",
    });
  }

  if (
    !activityService.VALID_ACTIVITY_TYPES.includes(
      activityType
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid activity type",
    });
  }

  try {
    const activity = await activityService.recordActivity(
      req.activityUserId,
      mediaId,
      activityType
    );

    return res.status(201).json({
      success: true,
      activity,
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(404).json({
        success: false,
        message: "User or media item not found",
      });
    }

    console.error("Activity creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record activity",
    });
  }
});

module.exports = router;
