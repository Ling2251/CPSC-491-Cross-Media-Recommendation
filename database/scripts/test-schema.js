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

    const user1 = (
      await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ('__TestUser1__', '__test1@example.com', 'test-hash') RETURNING id`,
      )
    ).rows[0];
    const user2 = (
      await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ('__TestUser2__', '__test2@example.com', 'test-hash') RETURNING id`,
      )
    ).rows[0];

    await expectConstraintViolation(
      client,
      'duplicate user email is rejected',
      () =>
        client.query(
          `INSERT INTO users (name, email, password_hash)
           VALUES ('__DuplicateUser__', '__test1@example.com', 'test-hash')`,
        ),
    );

    await client.query(
      `INSERT INTO user_media_interactions (user_id, media_id, interaction_type)
       VALUES ($1, $2, 'consumed')`,
      [user1.id, media.id],
    );
    await client.query(
      `INSERT INTO user_media_interactions (user_id, media_id, interaction_type, rating)
       VALUES ($1, $2, 'rated', 5)`,
      [user2.id, media.id],
    );
    console.log('PASS  valid user_media_interactions inserts succeed');

    await expectConstraintViolation(
      client,
      'duplicate user/media/interaction is rejected',
      () =>
        client.query(
          `INSERT INTO user_media_interactions (user_id, media_id, interaction_type)
           VALUES ($1, $2, 'consumed')`,
          [user1.id, media.id],
        ),
    );

    await expectConstraintViolation(
      client,
      'rated interaction without a valid rating is rejected',
      () =>
        client.query(
          `INSERT INTO user_media_interactions (user_id, media_id, interaction_type)
           VALUES ($1, $2, 'rated')`,
          [user1.id, media.id],
        ),
    );

    await expectConstraintViolation(
      client,
      'rating on a non-rated interaction is rejected',
      () =>
        client.query(
          `INSERT INTO user_media_interactions (user_id, media_id, interaction_type, rating)
           VALUES ($1, $2, 'saved', 4)`,
          [user1.id, media.id],
        ),
    );

    await client.query(
      `INSERT INTO friendships (requester_id, receiver_id, status)
       VALUES ($1, $2, 'pending')`,
      [user1.id, user2.id],
    );
    console.log('PASS  valid friendship insert succeeds');

    await expectConstraintViolation(
      client,
      'duplicate friendship in reverse direction is rejected',
      () =>
        client.query(
          `INSERT INTO friendships (requester_id, receiver_id, status)
           VALUES ($1, $2, 'pending')`,
          [user2.id, user1.id],
        ),
    );

    await expectConstraintViolation(
      client,
      'self friendship is rejected',
      () =>
        client.query(
          `INSERT INTO friendships (requester_id, receiver_id)
           VALUES ($1, $1)`,
          [user1.id],
        ),
    );

    await client.query(
        `INSERT INTO friend_similarity_scores
           (user_id, candidate_user_id, overall_score, video_score, audio_score, text_score)
         VALUES ($1, $2, 0.75, 0.8, 0.7, 0.75)`,
        [user1.id, user2.id],
    );
    console.log('PASS  valid friend similarity score insert succeeds');

    await expectConstraintViolation(
        client,
        'duplicate user/candidate similarity score is rejected',
        () =>
          client.query(
            `INSERT INTO friend_similarity_scores
               (user_id, candidate_user_id, overall_score, video_score, audio_score, text_score)
             VALUES ($1, $2, 0.5, 0.5, 0.5, 0.5)`,
            [user1.id, user2.id],
          ),
    );

    await expectConstraintViolation(
        client,
        'self similarity score is rejected',
        () =>
          client.query(
            `INSERT INTO friend_similarity_scores
               (user_id, candidate_user_id, overall_score, video_score, audio_score, text_score)
             VALUES ($1, $1, 0.5, 0.5, 0.5, 0.5)`,
            [user1.id],
          ),
    );

    await expectConstraintViolation(
        client,
        'out-of-range similarity score is rejected',
        () =>
          client.query(
            `INSERT INTO friend_similarity_scores
               (user_id, candidate_user_id, overall_score, video_score, audio_score, text_score)
             VALUES ($1, $2, 1.1, 0.5, 0.5, 0.5)`,
            [user2.id, user1.id],
          ),
    );

    await client.query(
        `INSERT INTO friend_similarity_scores
           (user_id, candidate_user_id, overall_score, video_score, audio_score, text_score)
         VALUES ($1, $2, 0.9, 0.9, 0.9, 0.9)
         ON CONFLICT (user_id, candidate_user_id)
         DO UPDATE SET overall_score = EXCLUDED.overall_score,
                       video_score = EXCLUDED.video_score,
                       audio_score = EXCLUDED.audio_score,
                       text_score = EXCLUDED.text_score,
                       calculated_at = now()`,
        [user1.id, user2.id],
    );
    const updatedScore = await client.query(
        `SELECT overall_score FROM friend_similarity_scores
         WHERE user_id = $1 AND candidate_user_id = $2`,
        [user1.id, user2.id],
    );
    assert.strictEqual(Number(updatedScore.rows[0].overall_score), 0.9);
    console.log('PASS  similarity score upsert updates the existing record');

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
