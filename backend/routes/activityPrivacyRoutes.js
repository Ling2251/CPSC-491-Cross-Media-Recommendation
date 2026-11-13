
const express = require("express");
const jwt = require("jsonwebtoken");
const privacyService = require("../services/activityPrivacyService");

const router = express.Router();

function isValidId(value) {
  return (
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2147483647
  );
}

// Authenticate users through their JWT.
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
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    const userId = Number(payload.userId);

    if (!isValidId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication identity",
      });
    }

    req.privacyUserId = userId;
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
  if (error.message === "User not found") {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  console.error("Activity privacy error:", error);

  return res.status(500).json({
    success: false,
    message: "Activity privacy operation failed",
  });
}

// GET /api/privacy/activity
router.get("/activity", async (req, res) => {
  try {
    const privacy = await privacyService.getActivityPrivacy(
      req.privacyUserId
    );

    return res.status(200).json({
      success: true,
      ...privacy,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// PATCH /api/privacy/activity
// Body: { "activityPublic": true }
router.patch("/activity", async (req, res) => {
  const { activityPublic } = req.body || {};

  if (typeof activityPublic !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "activityPublic must be a boolean",
    });
  }

  try {
    const privacy = await privacyService.updateActivityPrivacy(
      req.privacyUserId,
      activityPublic
    );

    return res.status(200).json({
      success: true,
      message: "Activity privacy updated",
      ...privacy,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
