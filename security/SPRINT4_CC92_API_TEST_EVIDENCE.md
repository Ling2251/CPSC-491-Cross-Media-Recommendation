# Sprint 4 CC9.2 - External API resilience checks

Scope: TMDB adapter (`database/scripts/adapters/tmdb.js`), TVMaze and Open Library collectors (`backend/ai-backend/app/services/public_data.py`). All new tests use local mocks and do not make live vendor requests.

## What changed
- TMDB: per-request abort timeout (default 10 seconds); bounded 429/5xx retries remain; malformed top-level results and invalid JSON are rejected; malformed genre arrays no longer crash normalization. Network errors no longer echo request URLs containing an API key.
- TVMaze/Open Library: top-level response shape checked; malformed entries are skipped; invalid JSON is handled with a clear error without exposing raw parser details. Existing bounded retries and 10-second request timeout remain.

## Reproduce evidence
From the repository root:

```sh
python3 -m pytest backend/ai-backend/tests -q
python3 -m unittest discover -s security/tests -p 'test_*.py' -v
node security/tests/test_tmdb_cc92.js
```

## Execution in preparation workspace
- AI backend regression: **103 passed, 1 warning** (warning pertains to a short JWT test secret in a pre-existing test; investigate separately).
- Security inventory: **5 passed**.
- TMDB security checks: **5 passed**.

## CC9.2 interpretation and remaining gaps
Passing local tests is evidence of defensive handling for selected integration failures, **not** evidence of a completed vendor assessment or SOC 2 compliance. Remaining work: review vendor risk ratings and provider documentation, perform repository secret checks and dependency scans, decide how to recover if one source fails while aggregating media, and collect an actual GitHub Actions run link.
