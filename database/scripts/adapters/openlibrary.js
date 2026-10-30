// Open Library ETL adapter — Sprint 4 (second media provider, media_type='book').
// Mirrors adapters/tmdb.js's contract so the ingest pipeline can eventually
// treat providers interchangeably: normalizeRecord/fetchWithRetry are kept
// separate so the pure mapping logic can be unit tested without the network.
// No API key is required for Open Library's search endpoint.

const COVER_IMAGE_BASE_URL = 'https://covers.openlibrary.org/b/id';

// Open Library subject string (lowercased) -> internal tag_taxonomy (name, category).
// Only subjects with an existing seeded tag are mapped; everything else is
// left unmapped on purpose, same policy as TMDb's GENRE_MAP.
const SUBJECT_MAP = {
  'fantasy fiction': { name: 'Fantasy', category: 'genre' },
  'science fiction': { name: 'Sci-Fi', category: 'genre' },
  'mystery fiction': { name: 'Mystery', category: 'genre' },
  'detective and mystery stories': { name: 'Mystery', category: 'genre' },
  'romance fiction': { name: 'Romance', category: 'genre' },
  'horror fiction': { name: 'Horror', category: 'genre' },
  'humorous fiction': { name: 'Comedy', category: 'genre' },
  thrillers: { name: 'Thriller', category: 'genre' },
  'young adult fiction': { name: 'Young Adult', category: 'audience' },
  'juvenile fiction': { name: 'Children', category: 'audience' },
};

function mapSubjects(subjects = []) {
  const mapped = [];
  const unmapped = [];
  for (const subject of subjects) {
    const key = typeof subject === 'string' ? subject.trim().toLowerCase() : '';
    const tag = SUBJECT_MAP[key];
    if (tag) mapped.push(tag);
    else unmapped.push(subject);
  }
  return { mapped, unmapped };
}

function normalizeRecord(raw) {
  const errors = [];
  const key = raw && typeof raw.key === 'string' ? raw.key : null;
  const externalId = key ? key.replace(/^\/works\//, '') : null;
  const title = raw && typeof raw.title === 'string' ? raw.title.trim() : '';

  if (!externalId) errors.push('missing key');
  if (!title) errors.push('missing title');

  if (errors.length > 0) {
    return { valid: false, errors, raw };
  }

  let releaseDate = null;
  const year = raw.first_publish_year;
  if (Number.isFinite(year) && year > 0) {
    releaseDate = `${year}-01-01`;
  }

  const coverImageUrl = Number.isFinite(raw.cover_i)
    ? `${COVER_IMAGE_BASE_URL}/${raw.cover_i}-M.jpg`
    : null;

  const { mapped, unmapped } = mapSubjects(raw.subject);

  return {
    valid: true,
    media: {
      title,
      mediaType: 'book',
      externalSource: 'openlibrary',
      externalId,
      description: null,
      releaseDate,
      coverImageUrl,
    },
    tagNames: mapped.map((tag) => tag.name),
    tagCategories: mapped,
    unmappedSubjects: unmapped,
  };
}

async function fetchWithRetry(url, { maxRetries = 5 } = {}) {
  let attempt = 0;
  let delayMs = 1000;

  for (;;) {
    const res = await fetch(url);
    if (res.ok) return res;

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      throw new Error(`Open Library request failed: ${res.status} ${res.statusText}`);
    }

    const retryAfterHeader = res.headers.get('retry-after');
    const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : delayMs;
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    delayMs = Math.min(delayMs * 2, 30000);
    attempt += 1;
  }
}

async function fetchSearchPage(subject, page) {
  const url = `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}&page=${page}`;
  const res = await fetchWithRetry(url);
  return res.json();
}

module.exports = {
  COVER_IMAGE_BASE_URL,
  SUBJECT_MAP,
  mapSubjects,
  normalizeRecord,
  fetchWithRetry,
  fetchSearchPage,
};
