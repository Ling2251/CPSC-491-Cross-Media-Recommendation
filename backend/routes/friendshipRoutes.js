
const express = require("express");
const jwt = require("jsonwebtoken");

const friendshipService = require("../services/friendshipService");

const router = express.Router();

// =====================================================
// AUTHENTICATION
// =====================================================

// Use the same JWT_SECRET as backend/server.js.
function authenticateFriendshipUser(req, res, next) {
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

    if (!isValidId(payload.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication identity",
      });
    }

    req.friendshipUserId = Number(payload.userId);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

// All friendship endpoints require authentication.
router.use(authenticateFriendshipUser);

// =====================================================
// HELPERS
// =====================================================

function isValidId(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  const text = String(value);

  if (!/^[1-9]\d*$/.test(text)) {
    return false;
  }

  return (
    Number.isSafeInteger(Number(text)) &&
    Number(text) <= 2147483647
  );
}

// Convert database field names to the names used
// by the existing React friendship components.
function formatFriendship(row) {
  return {
    id: row.id,
    requesterId: row.requester_id,
    receiverId: row.receiver_id,
    status: row.status.toUpperCase(),
    createdAt: row.created_at,
  };
}

function handleError(res, error) {
  // Handle known database constraint violations.
  if (error.code === "23503") {
    return res.status(404).json({
      success: false,
      message: "User does not exist",
    });
  }

  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A friendship already exists",
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      success: false,
      message: "Invalid friendship data",
    });
  }

  // Known service errors.
  const message = error.message || "";

  if (message.includes("already exists")) {
    return res.status(409).json({
      success: false,
      message,
    });
  }

  if (
    message.includes("not authorized") ||
    message.includes("not found")
  ) {
    return res.status(404).json({
      success: false,
      message: "Friendship or request not found",
    });
  }

  if (message.includes("Cannot send")) {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  console.error("Friendship API error:", error);

  return res.status(500).json({
    success: false,
    message: "Friendship operation failed",
  });
}

// =====================================================
// GET ACCEPTED FRIENDS
// GET /api/friends
// =====================================================

router.get("/", async (req, res) => {
  try {
    const friendships =
      await friendshipService.getFriends(
        req.friendshipUserId
      );

    return res.status(200).json({
      success: true,
      friendships: friendships.map(formatFriendship),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// =====================================================
// GET INCOMING REQUESTS
// GET /api/friends/requests/incoming
// =====================================================

router.get("/requests/incoming", async (req, res) => {
  try {
    const requests =
      await friendshipService.getIncomingRequests(
        req.friendshipUserId
      );

    return res.status(200).json({
      success: true,
      friendships: requests.map(formatFriendship),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// =====================================================
// GET OUTGOING REQUESTS
// GET /api/friends/requests/outgoing
// =====================================================

router.get("/requests/outgoing", async (req, res) => {
  try {
    const requests =
      await friendshipService.getOutgoingRequests(
        req.friendshipUserId
      );

    return res.status(200).json({
      success: true,
      friendships: requests.map(formatFriendship),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// =====================================================
// SEND FRIEND REQUEST
// POST /api/friends/requests
// Body: { "receiverId": 2 }
// =====================================================

router.post("/requests", async (req, res) => {
  const receiverId = req.body?.receiverId;

  if (!isValidId(receiverId)) {
    return res.status(400).json({
      success: false,
      message: "A valid receiverId is required",
    });
  }

  if (Number(receiverId) === req.friendshipUserId) {
    return res.status(400).json({
      success: false,
      message: "Cannot send a friend request to yourself",
    });
  }

  try {
    const friendship =
      await friendshipService.sendRequest(
        req.friendshipUserId,
        Number(receiverId)
      );

    return res.status(201).json({
      success: true,
      message: "Friend request sent",
      friendship: formatFriendship(friendship),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// =====================================================
// ACCEPT FRIEND REQUEST
// PATCH /api/friends/requests/:id/accept
// =====================================================

router.patch("/requests/:id/accept", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request ID",
    });
  }

  try {
    const friendship =
      await friendshipService.acceptRequest(
        Number(req.params.id),
        req.friendshipUserId
      );

    return res.status(200).json({
      success: true,
      message: "Friend request accepted",
      friendship: formatFriendship(friendship),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// =====================================================
// DECLINE FRIEND REQUEST
// PATCH /api/friends/requests/:id/decline
// =====================================================

router.patch("/requests/:id/decline", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request ID",
    });
  }

  try {
    const friendship =
      await friendshipService.declineRequest(
        Number(req.params.id),
        req.friendshipUserId
      );

    return res.status(200).json({
      success: true,
      message: "Friend request declined",
      friendship: formatFriendship(friendship),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// =====================================================
// CANCEL OUTGOING REQUEST
// DELETE /api/friends/requests/:id
// =====================================================

router.delete("/requests/:id", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request ID",
    });
  }

  try {
    await friendshipService.cancelRequest(
      Number(req.params.id),
      req.friendshipUserId
    );

    return res.status(200).json({
      success: true,
      message: "Friend request cancelled",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// =====================================================
// REMOVE ACCEPTED FRIEND
// DELETE /api/friends/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid friendship ID",
    });
  }

  try {
    await friendshipService.removeFriend(
      Number(req.params.id),
      req.friendshipUserId
    );

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
