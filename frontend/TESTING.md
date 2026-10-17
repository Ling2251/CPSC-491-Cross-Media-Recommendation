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

## PostgreSQL score-storage integration

The real-database score storage test is
`../backend/tests/test_friend_score_storage_postgres.py`. It checks insert/read
ranking, an upserted score update, and replacement with an empty candidate set.
It runs in `.github/workflows/database-ci.yml` after the migrations are applied.
To run it locally, apply the database migrations, configure the standard
`PG*` connection variables, set `FRIEND_RECOMMENDATION_TEST_DATABASE=1`, and run
the test from `backend/`.
