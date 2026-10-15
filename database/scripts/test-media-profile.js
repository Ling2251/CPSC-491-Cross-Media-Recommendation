// Proves getEligibleMediaProfile only ever returns approved tags -- the
// Sprint 3/5 requirement that pending_review and rejected candidates can
// never leak into a recommendation-eligible query. Runs inside a
// transaction rolled back at the end, so it never leaves fixtures behind.
const assert = require('assert');
const { createPool } = require('./db');
const { getMediaWithTags, getEligibleMediaProfile } = require('./mediaTags');

async function main() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const media = (
      await client.query(
        `INSERT INTO media (title, media_type) VALUES ('__TestProfileMovie__', 'movie') RETURNING id`,
      )
    ).rows[0];

    const approvedTag = (
      await client.query(`INSERT INTO tag_taxonomy (name, category) VALUES ('__ApprovedTag__', 'genre') RETURNING id`)
    ).rows[0];
    const pendingTag = (
      await client.query(`INSERT INTO tag_taxonomy (name, category) VALUES ('__PendingTag__', 'mood') RETURNING id`)
    ).rows[0];
    const rejectedTag = (
      await client.query(`INSERT INTO tag_taxonomy (name, category) VALUES ('__RejectedTag__', 'era') RETURNING id`)
    ).rows[0];

    await client.query(
      `INSERT INTO media_tags (media_id, tag_id, confidence, source, status) VALUES ($1, $2, 0.9, 'auto', 'approved')`,
      [media.id, approvedTag.id],
    );
    await client.query(
      `INSERT INTO media_tags (media_id, tag_id, confidence, source, status) VALUES ($1, $2, 0.5, 'auto', 'pending_review')`,
      [media.id, pendingTag.id],
    );
    await client.query(
      `INSERT INTO media_tags (media_id, tag_id, confidence, source, status) VALUES ($1, $2, 0.1, 'auto', 'rejected')`,
      [media.id, rejectedTag.id],
    );

    const eligible = await getEligibleMediaProfile(client, media.id);
    assert.strictEqual(eligible.tags.length, 1, 'only the approved tag should be returned');
    assert.strictEqual(eligible.tags[0].name, '__ApprovedTag__');
    console.log('PASS  getEligibleMediaProfile returns only approved tags');

    const full = await getMediaWithTags(client, media.id);
    assert.strictEqual(full.tags.length, 3, 'getMediaWithTags should still return every status');
    console.log('PASS  getMediaWithTags (admin/debug view) still returns every status');

    await client.query('ROLLBACK');
    console.log('\nAll media profile tests passed.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nMEDIA PROFILE TEST FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
