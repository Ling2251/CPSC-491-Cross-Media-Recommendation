// Tests the Open Library adapter's pure normalization/mapping logic. No
// network or database needed -- mirrors test-tmdb-adapter.js's structure for
// the other provider.
const assert = require('assert');
const { normalizeRecord, mapSubjects } = require('./adapters/openlibrary');

function testValidFullyPopulated() {
  const result = normalizeRecord({
    key: '/works/OL45883W',
    title: 'The Hobbit',
    first_publish_year: 1937,
    cover_i: 258027,
    subject: ['Fantasy fiction', 'Fiction'],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.media.title, 'The Hobbit');
  assert.strictEqual(result.media.externalId, 'OL45883W');
  assert.strictEqual(result.media.externalSource, 'openlibrary');
  assert.strictEqual(result.media.mediaType, 'book');
  assert.strictEqual(result.media.releaseDate, '1937-01-01');
  assert.ok(result.media.coverImageUrl.endsWith('/258027-M.jpg'));
  assert.deepStrictEqual(result.tagNames, ['Fantasy']);
  assert.deepStrictEqual(result.unmappedSubjects, ['Fiction']);
  console.log('PASS  valid fully-populated record normalizes correctly');
}

function testValidMissingCover() {
  const result = normalizeRecord({
    key: '/works/OL123456W',
    title: 'Example Indie Novel',
    subject: ['Romance fiction'],
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.media.coverImageUrl, null);
  assert.deepStrictEqual(result.tagNames, ['Romance']);
  console.log('PASS  missing cover_i maps to null cover_image_url');
}

function testValidUnmappedSubject() {
  const result = normalizeRecord({
    key: '/works/OL789012W',
    title: 'Adventure Tale',
    subject: ['Humorous fiction', 'Swashbucklers'],
  });
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.tagNames, ['Comedy']);
  assert.deepStrictEqual(result.unmappedSubjects, ['Swashbucklers']);
  console.log('PASS  unmapped subject is logged, not applied as a tag');
}

function testMalformedMissingTitle() {
  const result = normalizeRecord({ key: '/works/OL345678W', title: '' });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.includes('missing title'));
  console.log('PASS  missing title is rejected');
}

function testMalformedMissingKey() {
  const result = normalizeRecord({ key: null, title: 'No Key Book' });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.includes('missing key'));
  console.log('PASS  missing key is rejected');
}

function testBadPublishYear() {
  const result = normalizeRecord({
    key: '/works/OL999999W',
    title: 'Undated Book',
    first_publish_year: 'not-a-year',
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.media.releaseDate, null);
  console.log('PASS  non-numeric first_publish_year becomes null without rejecting the record');
}

function testMapSubjectsCaseInsensitive() {
  const { mapped, unmapped } = mapSubjects(['SCIENCE FICTION', 'Made Up Subject']);
  assert.strictEqual(mapped.length, 1);
  assert.strictEqual(mapped[0].name, 'Sci-Fi');
  assert.deepStrictEqual(unmapped, ['Made Up Subject']);
  console.log('PASS  subject mapping is case-insensitive');
}

function testMapSubjectsEmpty() {
  assert.deepStrictEqual(mapSubjects(), { mapped: [], unmapped: [] });
  assert.deepStrictEqual(mapSubjects([]), { mapped: [], unmapped: [] });
  console.log('PASS  mapSubjects handles missing/empty input without throwing');
}

// Sprint 4: these subjects have no movie-era equivalent in
// seed_initial_tags.sql, so seed/seed_book_tags.sql adds them as new
// tag_taxonomy rows rather than reusing an unrelated genre.
function testBookSpecificSubjectsMapToNewTaxonomy() {
  const result = normalizeRecord({
    key: '/works/OL111111W',
    title: 'A Life Well Lived',
    subject: ['Biography', 'Nonfiction'],
  });
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.tagNames.slice().sort(), ['Biography', 'Non-Fiction']);
  console.log('PASS  biography/nonfiction subjects map to the new book-specific taxonomy');
}

function testSubjectAliasesNormalizeToTheSameTag() {
  const autobiography = mapSubjects(['Autobiography']);
  const nonFictionHyphenated = mapSubjects(['Non-Fiction']);
  const classics = mapSubjects(['Classics']);
  assert.strictEqual(autobiography.mapped[0].name, 'Biography');
  assert.strictEqual(nonFictionHyphenated.mapped[0].name, 'Non-Fiction');
  assert.strictEqual(classics.mapped[0].name, 'Classic Literature');
  console.log('PASS  subject aliases (autobiography/non-fiction/classics) normalize to the same tag');
}

function main() {
  testValidFullyPopulated();
  testValidMissingCover();
  testValidUnmappedSubject();
  testMalformedMissingTitle();
  testMalformedMissingKey();
  testBadPublishYear();
  testMapSubjectsCaseInsensitive();
  testMapSubjectsEmpty();
  testBookSpecificSubjectsMapToNewTaxonomy();
  testSubjectAliasesNormalizeToTheSameTag();
  console.log('\nAll Open Library adapter tests passed.');
}

main();
