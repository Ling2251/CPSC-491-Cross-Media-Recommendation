// Sprint 3: automatic tagging confidence threshold.
//
// Per the implementation plan, an automatically generated candidate tag is
// accepted when its confidence meets the default threshold of 0.72. Below
// that, a candidate is either sent to human review or auto-rejected outright,
// depending on how low its confidence is:
//   - confidence < LOW_CONFIDENCE_THRESHOLD  -> rejected (not worth a human look)
//   - LOW_CONFIDENCE_THRESHOLD <= confidence < threshold -> pending_review
//   - confidence >= threshold                 -> approved
// When a media item ends up with no approved candidate, it is flagged for
// human review.
//
// The media_tags table only allows status IN ('approved', 'pending_review',
// 'rejected'), so this covers all three.
const DEFAULT_CONFIDENCE_THRESHOLD = 0.72;
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.3;

function isValidConfidence(confidence) {
  return typeof confidence === 'number' && Number.isFinite(confidence)
    && confidence >= 0 && confidence <= 1;
}

// Decide how one candidate tag should be stored. A confidence that is missing
// or outside 0..1 is never auto-accepted or auto-rejected; it is sent to
// review instead, since we can't tell how confident the source actually was.
function classifyCandidate(
  confidence,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
  lowThreshold = DEFAULT_LOW_CONFIDENCE_THRESHOLD,
) {
  if (!isValidConfidence(confidence)) {
    return { source: 'auto', status: 'pending_review', accepted: false };
  }
  if (confidence >= threshold) {
    return { source: 'auto', status: 'approved', accepted: true };
  }
  if (confidence < lowThreshold) {
    return { source: 'auto', status: 'rejected', accepted: false };
  }
  return { source: 'auto', status: 'pending_review', accepted: false };
}

// Given all candidates for one media item ({ tagId, confidence }), return the
// tags to persist and whether the item still needs human review. Below-threshold
// candidates are kept as pending_review (or rejected, if low enough) so a
// reviewer can still see what was considered and rejected.
function selectTagsForItem(
  candidates,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
  lowThreshold = DEFAULT_LOW_CONFIDENCE_THRESHOLD,
) {
  const decisions = (candidates || []).map((candidate) => ({
    tagId: candidate.tagId,
    confidence: candidate.confidence,
    ...classifyCandidate(candidate.confidence, threshold, lowThreshold),
  }));
  const needsReview = !decisions.some((decision) => decision.accepted);
  return { decisions, needsReview };
}

module.exports = {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_LOW_CONFIDENCE_THRESHOLD,
  classifyCandidate,
  selectTagsForItem,
};
