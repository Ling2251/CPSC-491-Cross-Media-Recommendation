// Sprint 4 (IMPL-233): end-to-end test of the Open Library provider through
// the full existing pipeline -- normalizeRecord -> insertMediaIfNew ->
// subject-tag assignment -> era-candidate generation/classification ->
// getEligibleMediaProfile -- proving a second media provider flows through
// the same storage/tagging architecture TMDb already uses, with no provider
// -specific code anywhere downstream of the adapter. Runs inside a
// transaction rolled back at the end, so it never leaves fixtures behind.
const assert = require('assert');
const { createPool } = require('./db');
const { insertMediaIfNew } = require('./media');
const { getTagByNameAndCategory } = require('./tags');
const { assignTag, getEligibleMediaProfile } = require('./mediaTags');
const { normalizeRecord } = require('./adapters/openlibrary');
const { generateCandidates } = require('./adapters/candidateGenerator');
const { classifyCandidate } = require('./tagThreshold');

// A realistic Open Library search result for a 1990s fantasy novel.
const RAW_BOOK_RECORD = {
  key: '/works/OL1168083W',
  title: '__TestIntegrationBook__',
  first_publish_year: 1996,
  cover_i: 12345,
  subject: ['Fantasy fiction', 'Epic'],
};

async function main() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const normalized = normalizeRecord(RAW_BOOK_RECORD);
    assert.strictEqual(normalized.valid, true, 'a well-formed Open Library record should normalize successfully');
    assert.strictEqual(normalized.media.mediaType, 'book');
    console.log('PASS  Open Library record normalizes to a valid book media record');

    const inserted = await insertMediaIfNew(client, normalized.media);
    assert.ok(inserted, 'insertMediaIfNew should insert the book as a new media row');
    assert.strictEqual(inserted.media_type, 'book');
    console.log(`PASS  book inserted as media #${inserted.id} via the same insertMediaIfNew used for movies`);

    const duplicateAttempt = await insertMediaIfNew(client, normalized.media);
    assert.strictEqual(duplicateAttempt, null, 're-importing the same (external_source, external_id) should be skipped');
    console.log('PASS  re-importing the same Open Library work is skipped, not duplicated');

    let subjectTagsAssigned = 0;
    for (const tagName of normalized.tagNames) {
      const tagCategory = normalized.tagCategories.find((t) => t.name === tagName).category;
      const tag = await getTagByNameAndCategory(client, tagName, tagCategory);
      assert.ok(tag, `expected a seeded tag for "${tagName}" (${tagCategory})`);
      await assignTag(client, {
        mediaId: inserted.id,
        tagId: tag.id,
        confidence: 1.0,
        source: 'external',
      });
      subjectTagsAssigned += 1;
    }
    assert.strictEqual(subjectTagsAssigned, 1, 'only the mapped subject ("Fantasy fiction") should be assigned; "Epic" has no seeded tag');
    console.log('PASS  mapped subject tag ("Fantasy") assigned as source=external, approved, same as a TMDb genre tag');

    const candidates = generateCandidates(normalized.media);
    assert.strictEqual(candidates.length, 1);
    assert.strictEqual(candidates[0].name, '1990s');
    for (const candidate of candidates) {
      const tag = await getTagByNameAndCategory(client, candidate.name, candidate.category);
      assert.ok(tag, `expected a seeded tag for era candidate "${candidate.name}"`);
      const decision = classifyCandidate(candidate.confidence);
      await assignTag(client, {
        mediaId: inserted.id,
        tagId: tag.id,
        confidence: candidate.confidence,
        source: decision.source,
        status: decision.status,
      });
      assert.strictEqual(decision.status, 'approved', 'era candidate confidence (0.95) should clear the 0.72 auto-approval threshold');
    }
    console.log('PASS  era candidate ("1990s") generated and auto-approved through the same threshold logic as TMDb imports');

    const profile = await getEligibleMediaProfile(client, inserted.id);
    assert.strictEqual(profile.tags.length, 2, 'both the subject tag and the era candidate should be eligible');
    const tagNames = profile.tags.map((t) => t.name).sort();
    assert.deepStrictEqual(tagNames, ['1990s', 'Fantasy']);
    console.log('PASS  getEligibleMediaProfile returns the book\'s full approved tag set, same contract as for movies');

    await client.query('ROLLBACK');
    console.log('\nAll book import/tagging integration tests passed.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\nBOOK IMPORT INTEGRATION TEST FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
