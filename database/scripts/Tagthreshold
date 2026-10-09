// Sprint 3: automatic tagging confidence threshold.
//
// Per the implementation plan, an automatically generated candidate tag is
// accepted when its confidence meets the default threshold of 0.72. When no
// candidate for a media item qualifies, the item is flagged for human review.
//
// The media_tags table only allows status IN ('approved', 'pending_review',
// 'rejected'), so "needs review" is stored as 'pending_review'.
const DEFAULT_CONFIDENCE_THRESHOLD = 0.72;

function isValidConfidence(confidence) {
  return typeof confidence === 'number' && Number.isFinite(confidence)
    && confidence >= 0 && confidence <= 1;
}

// Decide how one candidate tag should be stored. A confidence that is missing
// or outside 0..1 is never auto-accepted; it is sent to review instead.
function classifyCandidate(confidence, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  if (!isValidConfidence(confidence)) {
    return { source: 'auto', status: 'pending_review', accepted: false };
  }
  const accepted = confidence >= threshold;
  return {
    source: 'auto',
    status: accepted ? 'approved' : 'pending_review',
    accepted,
  };
}

// Given all candidates for one media item ({ tagId, confidence }), return the
// tags to persist and whether the item still needs human review. Below-threshold
// candidates are kept as pending_review so a reviewer can still see them.
function selectTagsForItem(candidates, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  const decisions = (candidates || []).map((candidate) => ({
    tagId: candidate.tagId,
    confidence: candidate.confidence,
    ...classifyCandidate(candidate.confidence, threshold),
  }));
  const needsReview = !decisions.some((decision) => decision.accepted);
  return { decisions, needsReview };
}

module.exports = {
  DEFAULT_CONFIDENCE_THRESHOLD,
  classifyCandidate,
  selectTagsForItem,
};
