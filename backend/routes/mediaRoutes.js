const express = require("express");

// Reuses the same pure, already-tested database-layer functions the
// database/scripts/ ingestion and tagging pipeline uses -- these only need
// a pg Pool-shaped object (anything with .query()), so backend/db.js's pool
// works here without any adapter code.
const { getMediaById } = require("../../database/scripts/media");
const {
  getEligibleMediaProfile,
  listMediaWithEligibleTagFilter,
} = require("../../database/scripts/mediaTags");

const pool = require("../db");

const router = express.Router();

function isValidId(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return false;
  }
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) {
    return false;
  }
  return Number.isSafeInteger(Number(text)) && Number(text) <= 2147483647;
}

// =====================================================
// LIST MEDIA (catalog)
// GET /api/media
// Optional query params: ?mediaType=book  ?tag=Fantasy
// Public/read-only: no authentication required, same policy as /api/interests.
// =====================================================

router.get("/", async (req, res) => {
  const { mediaType, tag } = req.query;

  try {
    const media = await listMediaWithEligibleTagFilter(pool, {
      mediaType: typeof mediaType === "string" ? mediaType : undefined,
      tagName: typeof tag === "string" ? tag : undefined,
    });

    return res.status(200).json({
      success: true,
      media,
    });
  } catch (error) {
    console.error("Media list error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve media",
    });
  }
});

// =====================================================
// GET MEDIA DETAIL + APPROVED TAGS
// GET /api/media/:id
// Deliberately uses getEligibleMediaProfile, not getMediaWithTags, so a
// pending_review or rejected tag can never be shown to an end user here.
// =====================================================

router.get("/:id", async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid media ID",
    });
  }

  try {
    const mediaId = Number(req.params.id);
    const exists = await getMediaById(pool, mediaId);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    const profile = await getEligibleMediaProfile(pool, mediaId);

    return res.status(200).json({
      success: true,
      media: profile,
    });
  } catch (error) {
    console.error("Media detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve media detail",
    });
  }
});

module.exports = router;
