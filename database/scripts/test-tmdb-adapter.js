// Tests the exact cases listed in the Sprint 2 artifact doc (Section 9:
// Expected Test Records). Normalization/mapping tests are pure and need no
// network or database; the duplicate-prevention test runs against a real
// Postgres inside a transaction that's rolled back, so it never leaves
// fixtures behind.
const assert = require('assert');
const { normalizeRecord } = require('./adapters/tmdb');
const { createPool } = require('./db');
const { insertMediaIfNew } = require('./media');

function testValidFullyPopulated() {
  const result = normalizeRecord({
    id: 361743,
    title: 'Top Gun: Maverick',
    overview: 'After thirty years, Maverick is still pushing the envelope.',
    release_date: '2022-05-24',
    poster_path: '/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
    genre_ids: [28, 18],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.media.title, 'Top Gun: Maverick');
  assert.strictEqual(result.media.externalId, '361743');
  assert.strictEqual(result.media.externalSource, 'tmdb');
  assert.strictEqual(result.media.mediaType, 'movie');
  assert.strictEqual(result.media.releaseDate, '2022-05-24');
  assert.ok(result.media.coverImageUrl.endsWith('/62HCnUTziyWcpDaBO2i1DX17ljH.jpg'));
  assert.deepStrictEqual(result.tagNames.slice().sort(), ['Action', 'Drama']);
  console.log('PASS  valid fully-populated record normalizes correctly');
}

function testValidMissingPoster() {
  const result = normalizeRecord({
    id: 123456,
    title: 'Example Indie Film',
    poster_path: null,
    genre_ids: [18],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.media.coverImageUrl, null);
  assert.deepStrictEqual(result.tagNames, ['Drama']);
  console.log('PASS  missing poster_path maps to null cover_image_url');
}

function testValidUnmappedGenre() {
  const result = normalizeRecord({
    id: 789012,
    title: 'Adventure Flick',
    genre_ids: [12, 28],
  });
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.tagNames, ['Action']);
  assert.deepStrictEqual(result.unmappedGenreIds, [12]);
  console.log('PASS  unmapped genre id is logged, not applied as a tag');
}

function testMalformedMissingTitle() {
  const result = normalizeRecord({ id: 345678, title: '', release_date: '2021-01-01' });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.includes('missing title'));
  console.log('PASS  missing title is rejected');
}

function testMalformedMissingId() {
  const result = normalizeRecord({ id: null, title: 'No ID Movie' });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.includes('missing id'));
  console.log('PASS  missing id is rejected');
}

function testBadDateFormat() {
  const result = normalizeRecord({ id: 999999, title: 'Odd Date Film', release_date: 'not-a-date' });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.media.releaseDate, null);
  console.log('PASS  unparseable release_date becomes null without rejecting the record');
}

async function testDuplicatePrevention() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const first = await insertMediaIfNew(client, {
      title: '__TestDedupeMovie__',
      mediaType: 'movie',
      externalSource: 'tmdb',
      externalId: '__test-dedupe-1__',
    });
    assert.ok(first, 'first insert should succeed');

    const second = await insertMediaIfNew(client, {
      title: '__TestDedupeMovie__ (duplicate attempt)',
      mediaType: 'movie',
      externalSource: 'tmdb',
      externalId: '__test-dedupe-1__',
    });
    assert.strictEqual(second, null, 'duplicate (external_source, external_id) should not insert a second row');

    console.log('PASS  re-importing the same (external_source, external_id) is skipped, not duplicated');

    await client.query('ROLLBACK');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  testValidFullyPopulated();
  testValidMissingPoster();
  testValidUnmappedGenre();
  testMalformedMissingTitle();
  testMalformedMissingId();
  testBadDateFormat();
  await testDuplicatePrevention();
  console.log('\nAll TMDb adapter tests passed.');
}

main().catch((err) => {
  console.error('\nTMDB ADAPTER TEST FAILURE:', err.message);
  process.exitCode = 1;
});
