// Sprint 3: candidate-tag generation from normalized metadata.
//
// Generates candidate tags with a confidence score, to be run through
// tagThreshold.classifyCandidate before being persisted. Kept deliberately
// rule-based and deterministic for now rather than guessing at mood/theme
// from free text, which would need real NLP to defend as accurate. Era is
// exact, derivable data, so it gets a high confidence score; this module
// grows to add more dimensions once there's a trustworthy rule for them.
//
// era_tag has no dedicated tag for the current decade yet (tag_taxonomy's
// seeded 'era' values stop at the 2010s), so anything from 2020 onward maps
// to 'Contemporary' rather than inventing an untagged bucket.
const ERA_BY_DECADE = {
  1980: '1980s',
  1990: '1990s',
  2000: '2000s',
  2010: '2010s',
};

// A release this recent is exact, verifiable metadata, not a guess -- hence
// the high confidence score attached to it.
const ERA_CONFIDENCE = 0.95;

function eraTagForYear(year) {
  if (!Number.isFinite(year)) return null;
  const decade = Math.floor(year / 10) * 10;
  if (decade >= 2020) return 'Contemporary';
  return ERA_BY_DECADE[decade] || null;
}

// Given a normalized media record ({ releaseDate, ... }), return candidate
// tags with a confidence score. Each candidate still has to pass through
// classifyCandidate() before it's trustworthy enough to persist.
function generateCandidates(media) {
  const candidates = [];

  if (media && media.releaseDate) {
    const year = new Date(media.releaseDate).getFullYear();
    const eraTag = eraTagForYear(year);
    if (eraTag) {
      candidates.push({ name: eraTag, category: 'era', confidence: ERA_CONFIDENCE });
    }
  }

  return candidates;
}

module.exports = {
  ERA_CONFIDENCE,
  eraTagForYear,
  generateCandidates,
};
