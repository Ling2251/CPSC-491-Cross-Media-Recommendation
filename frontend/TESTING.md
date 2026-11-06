# Friend Suggestions UI testing

## Automated checks

Run these from `frontend/`:

```sh
npm run test:run
npm run lint
npm run build
```

The `FriendSuggestionsPage` tests verify that suggestions appear in descending
similarity order, filters change the visible recommendations, friend requests
remove a user from suggestions, profiles open and close, and refresh responds.

## Manual responsive and ordering check

Validated locally on 2026-10-16 at `/suggestions` using the Vite development
server and browser:

| Viewport | Result |
| --- | --- |
| Desktop, 1440 × 900 | Friend Suggestions page rendered two eligible cards in descending displayed match order: LoFiLuna (65%), then BookishBen (58%). The header used a horizontal layout; no horizontal page overflow was observed. |
| Mobile, 375 × 812 | Both cards remained visible in a single-column layout. The header stacked vertically, the action buttons fit within the page, and no horizontal page overflow was observed. |

The browser check uses temporary mock recommendation data. It does not validate
live recommendation results or a production database connection.

## Sprint 3 controlled ranking check

Manually ran the controlled profiles from
`backend/app/friend_recommendation/similarity_test_data.py` through
`rank_candidates` on 2026-10-29, using User A as the source and Users B, C, and D
as candidates. Expected order was B, D, C; observed order was user_b (1.000),
user_d (0.267), user_c (0.000). The observed order matched the plan.

## PostgreSQL score-storage integration

The real-database score storage test is
`../backend/tests/test_friend_score_storage_postgres.py`. It checks insert/read
ranking, an upserted score update, and replacement with an empty candidate set.
It runs in `.github/workflows/database-ci.yml` after the migrations are applied.
To run it locally, apply the database migrations, configure the standard
`PG*` connection variables, set `FRIEND_RECOMMENDATION_TEST_DATABASE=1`, and run
the test from `backend/`.

## Friend Recommendation CI test roadmap

| Sprint | Planned coverage | Current status |
| --- | --- | --- |
| 2 | Preference weighting, repeated-tag aggregation, media normalization, and missing or invalid input. | Implemented in `backend/tests/test_friend_preferences.py`; run by the Python job in `.github/workflows/friends-ci.yml`. |
| 3 | Similarity edge cases, ranking, shared interests, score persistence, retrieval, updates, and database constraints. | Implemented across `backend/tests/test_similarity.py`, `backend/tests/test_friend_similarity.py`, and score-storage tests. The friends and database workflows run the Python checks; PostgreSQL integration passed locally against a disposable migrated database. |
| 4 | Friendship and friend-request API behavior, candidate eligibility, and privacy filtering. | Route and service test files exist, but `.github/workflows/friends-ci.yml` currently checks only JavaScript syntax; it does not run those Node tests. Add automated filtering and privacy cases as those rules are implemented. |
| 5 | Recommendation API behavior and frontend/backend integration, including recommendation filters and friend-request state. | Planned; add API and integration tests when the recommendation endpoint and connected UI are implemented. |
| 6 | Full regression suite, end-to-end recommendation workflow, manual Friend Suggestions checks, and basic performance results. | Planned; consolidate stable earlier-sprint tests and record end-to-end and performance evidence. |

The main Friend Recommendation workflow is
`.github/workflows/friends-ci.yml`; database constraint and score-storage checks
also run in `.github/workflows/database-ci.yml`. Frontend tests, lint, and build
run in `.github/workflows/frontend-ci.yml` and the friends workflow. Update this
roadmap as later-sprint tests become executable in CI.
