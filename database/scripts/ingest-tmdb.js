// Orchestrates a TMDb import: paginates through /discover/movie, normalizes
// and inserts each record, applies mapped genre tags, and reports the
// fetched/inserted/skipped/rejected/failed metrics required by Sprint 2.
const { createPool } = require('./db');
const { insertMediaIfNew } = require('./media');
const { getTagByNameAndCategory } = require('./tags');
const { assignTag } = require('./mediaTags');
const { normalizeRecord, fetchMoviePage } = require('./adapters/tmdb');

async function ingest({ pool, apiKey, maxPages = 3 }) {
  const metrics = { fetched: 0, inserted: 0, skipped: 0, rejected: 0, failed: 0 };
  const unmappedGenres = new Set();

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    let data;
    try {
      data = await fetchMoviePage(apiKey, page);
    } catch (err) {
      console.error(`Page ${page} failed after retries: ${err.message}`);
      metrics.failed += 1;
      page += 1;
      continue;
    }

    totalPages = data.total_pages || 1;

    for (const raw of data.results || []) {
      metrics.fetched += 1;
      const normalized = normalizeRecord(raw);

      if (!normalized.valid) {
        metrics.rejected += 1;
        console.warn(`Rejected record (${normalized.errors.join(', ')}):`, JSON.stringify(raw).slice(0, 200));
        continue;
      }

      const inserted = await insertMediaIfNew(pool, normalized.media);
      if (!inserted) {
        metrics.skipped += 1;
        continue;
      }

      metrics.inserted += 1;

      for (const tagName of normalized.tagNames) {
        const tag = await getTagByNameAndCategory(pool, tagName, 'genre');
        if (!tag) continue; // seed data not loaded for this tag; skip rather than fail the import
        await assignTag(pool, {
          mediaId: inserted.id,
          tagId: tag.id,
          confidence: 1.0,
          source: 'external',
        });
      }

      normalized.unmappedGenreIds.forEach((id) => unmappedGenres.add(id));
    }

    page += 1;
  }

  return { metrics, unmappedGenres: Array.from(unmappedGenres) };
}

if (require.main === module) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY environment variable is required.');
    process.exit(1);
  }

  const pool = createPool();
  ingest({ pool, apiKey })
    .then(({ metrics, unmappedGenres }) => {
      console.log('--- TMDb ingestion metrics ---');
      console.log(metrics);
      if (unmappedGenres.length) {
        console.log('Unmapped TMDb genre IDs encountered:', unmappedGenres);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { ingest };
