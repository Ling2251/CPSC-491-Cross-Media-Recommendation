// Mocked-API tests for pagination, rate-limiting, and retry/backoff behavior
// in the TMDb adapter. fetch and setTimeout are replaced with fakes, so this
// makes no real network calls, needs no database, and runs in milliseconds.
const assert = require('assert');
const { fetchWithRetry, fetchMoviePage } = require('./adapters/tmdb');

let passed = 0;

async function check(label, fn) {
  await fn();
  passed += 1;
  console.log(`PASS  ${label}`);
}

function fakeResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    json: async () => body,
  };
}

// Queues fake responses behind global.fetch and makes the retry backoff
// resolve instantly instead of actually sleeping, then restores both.
async function withMockedFetch(responses, testFn) {
  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;
  const calls = [];

  global.fetch = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (!next) throw new Error('mock fetch called more times than expected');
    return next;
  };
  global.setTimeout = (fn) => { fn(); return 0; };

  try {
    await testFn(calls);
  } finally {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
  }
}

async function main() {
  await check('fetchMoviePage requests the given page and returns parsed JSON', async () => {
    await withMockedFetch(
      [fakeResponse(200, { page: 2, results: [{ id: 1, title: 'A' }], total_pages: 5 })],
      async (calls) => {
        const data = await fetchMoviePage('test-key', 2);
        assert.strictEqual(data.page, 2);
        assert.strictEqual(data.total_pages, 5);
        assert.ok(calls[0].includes('page=2'), 'request URL should include the requested page');
        assert.ok(calls[0].includes('api_key=test-key'), 'request URL should include the API key');
      },
    );
  });

  await check('a 429 response is retried using the Retry-After header, then succeeds', async () => {
    await withMockedFetch(
      [
        fakeResponse(429, null, { 'retry-after': '1' }),
        fakeResponse(200, { page: 1, results: [], total_pages: 1 }),
      ],
      async (calls) => {
        const data = await fetchMoviePage('test-key', 1);
        assert.strictEqual(data.page, 1);
        assert.strictEqual(calls.length, 2, 'should have retried exactly once');
      },
    );
  });

  await check('a 500/502 response is retried with backoff, then succeeds', async () => {
    await withMockedFetch(
      [fakeResponse(500, null), fakeResponse(502, null), fakeResponse(200, { page: 1, results: [], total_pages: 1 })],
      async (calls) => {
        const data = await fetchMoviePage('test-key', 1);
        assert.strictEqual(data.page, 1);
        assert.strictEqual(calls.length, 3, 'should have retried twice before succeeding');
      },
    );
  });

  await check('a non-retryable 404 fails immediately without retrying', async () => {
    await withMockedFetch([fakeResponse(404, null)], async (calls) => {
      await assert.rejects(() => fetchWithRetry('https://example.com'), /404/);
      assert.strictEqual(calls.length, 1, 'should not retry a non-retryable status');
    });
  });

  await check('exceeding maxRetries throws instead of retrying forever', async () => {
    await withMockedFetch(
      [fakeResponse(503, null), fakeResponse(503, null)],
      async (calls) => {
        await assert.rejects(
          () => fetchWithRetry('https://example.com', { maxRetries: 1 }),
          /503/,
        );
        assert.strictEqual(calls.length, 2, 'initial attempt + 1 retry = 2 calls before giving up');
      },
    );
  });

  console.log(`\n${passed} TMDb fetch/retry tests passed`);
}

main().catch((err) => {
  console.error('\nTMDB FETCH TEST FAILURE:', err.message);
  process.exitCode = 1;
});
