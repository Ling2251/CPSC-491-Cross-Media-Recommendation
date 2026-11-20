// Tests for rule-based candidate-tag generation. Pure logic, no database
// connection needed.
const assert = require('assert');
const { ERA_CONFIDENCE, eraTagForYear, generateCandidates } = require('./adapters/candidateGenerator');

let passed = 0;

function check(label, fn) {
  fn();
  passed += 1;
  console.log(`PASS  ${label}`);
}

check('1980s decade maps correctly', () => {
  assert.strictEqual(eraTagForYear(1985), '1980s');
});

check('decade boundary years map to that decade', () => {
  assert.strictEqual(eraTagForYear(1990), '1990s');
  assert.strictEqual(eraTagForYear(1999), '1990s');
});

check('2000s and 2010s map correctly', () => {
  assert.strictEqual(eraTagForYear(2005), '2000s');
  assert.strictEqual(eraTagForYear(2015), '2010s');
});

check('2020 and later maps to Contemporary (no dedicated tag yet)', () => {
  assert.strictEqual(eraTagForYear(2020), 'Contemporary');
  assert.strictEqual(eraTagForYear(2026), 'Contemporary');
});

check('years before the 1980s have no era tag', () => {
  assert.strictEqual(eraTagForYear(1975), null);
});

check('invalid years return null instead of throwing', () => {
  assert.strictEqual(eraTagForYear(NaN), null);
  assert.strictEqual(eraTagForYear(undefined), null);
});

check('generateCandidates produces an era candidate from releaseDate', () => {
  const candidates = generateCandidates({ releaseDate: '2022-05-24' });
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].name, 'Contemporary');
  assert.strictEqual(candidates[0].category, 'era');
  assert.strictEqual(candidates[0].confidence, ERA_CONFIDENCE);
});

check('generateCandidates produces nothing without a releaseDate', () => {
  assert.deepStrictEqual(generateCandidates({}), []);
  assert.deepStrictEqual(generateCandidates(null), []);
});

// Sprint 4 (IMPL-232): generateCandidates only ever reads media.releaseDate,
// so it should work identically for a book as for a movie without any code
// change. These tests prove that generalization explicitly, using the exact
// shape the Open Library adapter's normalizeRecord() produces (mediaType
// 'book', releaseDate as 'YYYY-01-01').
check('generateCandidates produces a correct era candidate for a book', () => {
  const bookMedia = {
    title: 'The Hobbit',
    mediaType: 'book',
    externalSource: 'openlibrary',
    externalId: 'OL45883W',
    releaseDate: '1990-01-01',
  };
  const candidates = generateCandidates(bookMedia);
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].name, '1990s');
  assert.strictEqual(candidates[0].category, 'era');
  assert.strictEqual(candidates[0].confidence, ERA_CONFIDENCE);
});

check('a book and a movie with the same release year produce the same era candidate', () => {
  const movieCandidates = generateCandidates({ mediaType: 'movie', releaseDate: '2022-05-24' });
  const bookCandidates = generateCandidates({ mediaType: 'book', releaseDate: '2022-01-01' });
  assert.strictEqual(movieCandidates[0].name, bookCandidates[0].name);
  assert.strictEqual(movieCandidates[0].confidence, bookCandidates[0].confidence);
});

check('a book published before the 1980s correctly produces no era candidate', () => {
  const candidates = generateCandidates({ mediaType: 'book', releaseDate: '1937-01-01' });
  assert.deepStrictEqual(candidates, []);
});

console.log(`\n${passed} candidate generator tests passed`);
