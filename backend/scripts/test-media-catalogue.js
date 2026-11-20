// Proves listMediaWithEligibleTagFilter -- the query backing GET /api/media --
// filters by media_type correctly and, like getEligibleMediaProfile, only
// ever matches approved tags. Runs inside a transaction rolled back at the
// end, so it never leaves fixtures behind.
const assert = require('assert');
const { createPool } = require('./db');
const { listMediaWithEligibleTagFilter } = require('./mediaTags');

async function main() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const book = (
      await client.query(
        `INSERT INTO media (title, media_type) VALUES ('__TestCatalogBook__', 'book') RETURNING id`,
      )
    ).rows[0];
    const movie = (
      await client.query(
        `INSERT INTO media (title, media_type) VALUES ('__TestCatalogMovie__', 'movie') RETURNING id`,
      )
    ).rows[0];

    const approvedTag = (
      await client.query(`INSERT INTO tag_taxonomy (name, category) VALUES ('__CatalogApprovedTag__', 'genre') RETURNING id`)
    ).rows[0];
    const pendingTag = (
      await client.query(`INSERT INTO tag_taxonomy (name, category) VALUES ('__CatalogPendingTag__', 'genre') RETURNING id`)
    ).rows[0];

    await client.query(
      `INSERT INTO media_tags (media_id, tag_id, confidence, source, status) VALUES ($1, $2, 0.9, 'manual', 'approved')`,
      [book.id, approvedTag.id],
    );
    await client.query(
      `INSERT INTO media_tags (media_id, tag_id, confidence, source, status) VALUES ($1, $2, 0.5, 'auto', 'pending_review')`,
      [movie.id, pendingTag.id],
    );

    const books = await listMediaWithEligibleTagFilter(client, { mediaType: 'book' });
    assert.ok(books.some((m) => m.id === book.id), 'book should be in the book-filtered results');
    assert.ok(!books.some((m) => m.id === movie.id), 'movie should not be in the book-filtered results');
    console.log('PASS  mediaType filter only returns matching media_type');

    const taggedApproved = await listMediaWithEligibleTagFilter(client, { tagName: '__CatalogApprovedTag__' });
    assert.ok(taggedApproved.some((m) => m.id === book.id), 'book should match its approved tag');
    console.log('PASS  tag filter returns media with an approved matching tag');

    const taggedPending = await listMediaWithEligibleTagFilter(client, { tagName: '__CatalogPendingTag__' });
    assert.ok(!taggedPending.some((m) => m.id === movie.id), 'a pending_review tag must not satisfy the filter');
    console.log('PASS  tag filter excludes media whose matching tag is not approved');

    const combined = await listMediaWithEligibleTagFilter(client, { mediaType: 'movie', tagName: '__CatalogApprovedTag__' });
    assert.ok(!combined.some((m) => m.id === book.id), 'mediaType + tag filters should combine with AND');
    console.log('PASS  mediaType and tag filters combine with AND');

    await client.query('ROLLBACK');
    console.log('\nAll media catalog tests passed.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nMEDIA CATALOG TEST FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
