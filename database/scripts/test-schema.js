// Automated constraint tests for the Sprint 1 schema. Everything runs inside
// one transaction that is rolled back at the end, so it never leaves test
// fixtures behind in the database it's pointed at.
const assert = require('assert');
const { createPool } = require('./db');

async function withSavepoint(client, fn) {
  await client.query('SAVEPOINT sp');
  try {
    await fn();
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT sp');
  }
}

async function expectConstraintViolation(client, label, fn) {
  let threw = false;
  await withSavepoint(client, async () => {
    try {
      await fn();
    } catch (err) {
      threw = true;
    }
  });
  assert.ok(threw, `expected a constraint violation for: ${label}`);
  console.log(`PASS  ${label}`);
}

async function main() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const media = (
      await client.query(
        `INSERT INTO media (title, media_type, external_source, external_id)
         VALUES ('__TestMovie__', 'movie', 'tmdb', 'test-1') RETURNING id`,
      )
    ).rows[0];

    const tag1 = (
      await client.query(
        `INSERT INTO tag_taxonomy (name, category) VALUES ('__TestTag1__', 'genre') RETURNING id`,
      )
    ).rows[0];

    const tag2 = (
      await client.query(
        `INSERT INTO tag_taxonomy (name, category) VALUES ('__TestTag2__', 'mood') RETURNING id`,
      )
    ).rows[0];

    await expectConstraintViolation(
      client,
      'duplicate tag_taxonomy(name, category) is rejected',
      () => client.query(`INSERT INTO tag_taxonomy (name, category) VALUES ('__TestTag1__', 'genre')`),
    );

    await expectConstraintViolation(
      client,
      'duplicate media(external_source, external_id) is rejected',
      () =>
        client.query(
          `INSERT INTO media (title, media_type, external_source, external_id)
           VALUES ('__TestMovie2__', 'movie', 'tmdb', 'test-1')`,
        ),
    );

    await client.query(
      `INSERT INTO media_tags (media_id, tag_id, confidence, source, status)
       VALUES ($1, $2, 0.9, 'auto', 'approved')`,
      [media.id, tag1.id],
    );
    console.log('PASS  valid media_tags insert succeeds');

    await expectConstraintViolation(
      client,
      'duplicate media_tags(media_id, tag_id) is rejected',
      () =>
        client.query(`INSERT INTO media_tags (media_id, tag_id, source) VALUES ($1, $2, 'manual')`, [
          media.id,
          tag1.id,
        ]),
    );

    await expectConstraintViolation(
      client,
      'invalid media_tags.source value is rejected',
      () =>
        client.query(`INSERT INTO media_tags (media_id, tag_id, source) VALUES ($1, $2, 'bogus')`, [
          media.id,
          tag2.id,
        ]),
    );

    await expectConstraintViolation(
      client,
      'invalid media_tags.status value is rejected',
      () =>
        client.query(
          `INSERT INTO media_tags (media_id, tag_id, source, status) VALUES ($1, $2, 'manual', 'bogus')`,
          [media.id, tag2.id],
        ),
    );

    await expectConstraintViolation(
      client,
      'out-of-range media_tags.confidence is rejected',
      () =>
        client.query(
          `INSERT INTO media_tags (media_id, tag_id, confidence, source) VALUES ($1, $2, 1.5, 'auto')`,
          [media.id, tag2.id],
        ),
    );

    await client.query('DELETE FROM media WHERE id = $1', [media.id]);
    const remaining = await client.query('SELECT * FROM media_tags WHERE media_id = $1', [media.id]);
    assert.strictEqual(remaining.rowCount, 0, 'expected media_tags rows to cascade-delete with their media');
    console.log('PASS  deleting media cascades to media_tags');

    await client.query('ROLLBACK');
    console.log('\nAll schema constraint tests passed.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nSCHEMA TEST FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
