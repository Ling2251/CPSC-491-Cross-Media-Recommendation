// Boundary-value tests for the 0.72 automatic tagging confidence threshold.
// Pure logic, no database connection needed, so this also runs in CI without
// a Postgres service.
const assert = require('assert');
const {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_LOW_CONFIDENCE_THRESHOLD,
  classifyCandidate,
  selectTagsForItem,
} = require('./tagThreshold');

let passed = 0;

function check(label, fn) {
  fn();
  passed += 1;
  console.log(`PASS  ${label}`);
}

check('default threshold is 0.72', () => {
  assert.strictEqual(DEFAULT_CONFIDENCE_THRESHOLD, 0.72);
});

check('just below threshold (0.719) goes to review', () => {
  const result = classifyCandidate(0.719);
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, 'pending_review');
});

check('exactly at threshold (0.72) is accepted', () => {
  const result = classifyCandidate(0.72);
  assert.strictEqual(result.accepted, true);
  assert.strictEqual(result.status, 'approved');
});

check('just above threshold (0.721) is accepted', () => {
  assert.strictEqual(classifyCandidate(0.721).status, 'approved');
});

check('extremes 0 and 1 are handled', () => {
  assert.strictEqual(classifyCandidate(0).status, 'rejected');
  assert.strictEqual(classifyCandidate(1).status, 'approved');
});

check('default low threshold is 0.3', () => {
  assert.strictEqual(DEFAULT_LOW_CONFIDENCE_THRESHOLD, 0.3);
});

check('below the low threshold (0.29) is rejected', () => {
  const result = classifyCandidate(0.29);
  assert.strictEqual(result.accepted, false);
  assert.strictEqual(result.status, 'rejected');
});

check('exactly at the low threshold (0.3) goes to review, not rejected', () => {
  const result = classifyCandidate(0.3);
  assert.strictEqual(result.status, 'pending_review');
});

check('between the low and high threshold goes to review, not rejected', () => {
  assert.strictEqual(classifyCandidate(0.5).status, 'pending_review');
});

check('invalid confidence values go to review, never rejected outright', () => {
  for (const bad of [undefined, null, NaN, '0.9', -0.1, 1.5, Infinity]) {
    assert.strictEqual(classifyCandidate(bad).status, 'pending_review', `value: ${String(bad)}`);
  }
});

check('custom low threshold is respected', () => {
  assert.strictEqual(classifyCandidate(0.4, 0.72, 0.5).status, 'rejected');
  assert.strictEqual(classifyCandidate(0.6, 0.72, 0.5).status, 'pending_review');
});

check('item with only low-confidence candidates is rejected, still needs review', () => {
  const result = selectTagsForItem([
    { tagId: 1, confidence: 0.1 },
    { tagId: 2, confidence: 0.05 },
  ]);
  assert.strictEqual(result.needsReview, true);
  assert.ok(result.decisions.every((decision) => decision.status === 'rejected'));
});

check('auto candidates always carry source=auto', () => {
  assert.strictEqual(classifyCandidate(0.9).source, 'auto');
  assert.strictEqual(classifyCandidate(0.1).source, 'auto');
});

check('custom threshold is respected', () => {
  assert.strictEqual(classifyCandidate(0.8, 0.9).status, 'pending_review');
  assert.strictEqual(classifyCandidate(0.9, 0.9).status, 'approved');
});

check('item with a qualifying candidate does not need review', () => {
  const result = selectTagsForItem([
    { tagId: 1, confidence: 0.95 },
    { tagId: 2, confidence: 0.4 },
  ]);
  assert.strictEqual(result.needsReview, false);
  assert.strictEqual(result.decisions[0].status, 'approved');
