// TMDb (The Movie Database) ETL adapter — Sprint 2.
// Pure normalization/mapping functions are exported separately from the
// network call so they can be unit tested without hitting the real API.

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// TMDb genre_id -> internal tag_taxonomy name (category='genre').
// Only genres with an existing seeded tag are mapped; everything else is
// left unmapped on purpose (see database/seed/seed_initial_tags.sql and the
// Sprint 2 artifact doc) rather than silently auto-creating new tags.
const GENRE_MAP = {
  28: 'Action',
  35: 'Comedy',
  18: 'Drama',
  27: 'Horror',
  878: 'Sci-Fi',
  14: 'Fantasy',
  10749: 'Romance',
  9648: 'Mystery',
  53: 'Thriller',
  99: 'Documentary',
};

function mapGenres(genreIds = []) {
  const mapped = [];
  const unmapped = [];
  for (const id of genreIds) {
    const name = GENRE_MAP[id];
    if (name) mapped.push(name);
    else unmapped.push(id);
  }
  return { mapped, unmapped };
}

function normalizeRecord(raw) {
  const errors = [];
  const id = raw && raw.id != null ? String(raw.id) : null;
  const title = raw && typeof raw.title === 'string' ? raw.title.trim() : '';

  if (!id) errors.push('missing id');
  if (!title) errors.push('missing title');

  if (errors.length > 0) {
    return { valid: false, errors, raw };
  }

  let releaseDate = null;
  if (raw.release_date) {
    const parsed = new Date(raw.release_date);
    if (!Number.isNaN(parsed.getTime())) {
      releaseDate = raw.release_date;
    }
  }

  const coverImageUrl = raw.poster_path ? `${TMDB_IMAGE_BASE_URL}${raw.poster_path}` : null;
  const { mapped, unmapped } = mapGenres(raw.genre_ids);

  return {
    valid: true,
    media: {
      title,
      mediaType: 'movie',
      externalSource: 'tmdb',
      externalId: id,
      description: raw.overview || null,
      releaseDate,
      coverImageUrl,
    },
    tagNames: mapped,
    unmappedGenreIds: unmapped,
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
      throw new Error(`TMDb request failed: ${res.status} ${res.statusText}`);
    }

    const retryAfterHeader = res.headers.get('retry-after');
    const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : delayMs;
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    delayMs = Math.min(delayMs * 2, 30000);
    attempt += 1;
  }
}

async function fetchMoviePage(apiKey, page) {
  const url = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey)}&page=${page}`;
  const res = await fetchWithRetry(url);
  return res.json();
}

module.exports = {
  TMDB_IMAGE_BASE_URL,
  GENRE_MAP,
  mapGenres,
  normalizeRecord,
  fetchWithRetry,
  fetchMoviePage,
};
