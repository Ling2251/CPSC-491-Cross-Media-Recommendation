const assert = require('node:assert/strict');
const { fetchWithRetry, fetchMoviePage, normalizeRecord } = require('../../database/scripts/adapters/tmdb');

async function main() {
  const aborting = (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('abort'), { name: 'AbortError' })));
  });
  await assert.rejects(() => fetchWithRetry('https://example.test', { fetchFn: aborting, timeoutMs: 5 }), /timed out/);
  console.log('PASS TMDB timed-out request is aborted');

  let calls = 0;
  const unavailable = async () => { calls++; return { ok: false, status: 503, statusText: 'Unavailable', headers: { get: () => null } }; };
  await assert.rejects(() => fetchWithRetry('https://example.test', { fetchFn: unavailable, maxRetries: 2, sleepFn: async () => {} }), /503/);
  assert.equal(calls, 3);
  console.log('PASS TMDB 503 is bounded to 3 attempts');

  await assert.rejects(() => fetchMoviePage('test-token', 1, { fetchFn: async () => ({ ok: true, json: async () => ({ results: {} }) }) }), /malformed/);
  console.log('PASS TMDB malformed payload rejected');

  await assert.rejects(() => fetchMoviePage('test-token', 1, { fetchFn: async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json'); } }) }), /invalid JSON/);
  console.log('PASS TMDB invalid JSON rejected');

  assert.deepEqual(normalizeRecord({ id: 7, title: 'Valid', genre_ids: 'invalid' }).tagNames, []);
  console.log('PASS TMDB malformed genre ids handled');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
