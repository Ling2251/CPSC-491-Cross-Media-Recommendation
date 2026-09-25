# Database

PostgreSQL schema for the cross-media recommendation project.

## Structure

- `migrations/` — ordered, incremental SQL files that build up the schema. This is
  the source of truth; run them in filename order against a fresh database.
- `schema/schema.sql` — a combined snapshot of the current schema (the result of
  applying every migration in order), kept for quick reference and fast local setup.
- `seed/` — sample/reference data (e.g. the initial tag taxonomy) that isn't part of
  the schema itself but is useful for development and demos.
- `scripts/` — a small Node.js CRUD/query layer over the schema (`media.js`, `tags.js`,
  `mediaTags.js`), plus a migration runner, a demo script, and automated constraint tests.

## Setup

Requires PostgreSQL 14+.

```bash
createdb cross_media_recommendation

# Apply migrations in order
for f in database/migrations/*.sql; do
  psql -d cross_media_recommendation -f "$f"
done

# Or, for a quick local setup, apply the combined schema directly:
psql -d cross_media_recommendation -f database/schema/schema.sql

# Load reference/seed data
psql -d cross_media_recommendation -f database/seed/seed_initial_tags.sql
```

### Using the migration runner and scripts instead

`scripts/` wraps the same steps in Node, and adds a CRUD layer, a demo, and
constraint tests:

```bash
cd database/scripts
npm install

# Applies any migration not yet recorded in schema_migrations
PGUSER=postgres PGPASSWORD=<password> PGDATABASE=cross_media_recommendation npm run migrate

# Loads reference/seed data (still plain SQL — see seed/ above)
PGPASSWORD=<password> psql -h localhost -U postgres -d cross_media_recommendation -f ../seed/seed_initial_tags.sql

# Inserts 3 sample media (movie/book/music) with tags, then prints each one back
# with its complete tag set — demonstrates the CRUD layer end to end. Safe to
# re-run: it deletes its own sample rows first.
PGUSER=postgres PGPASSWORD=<password> PGDATABASE=cross_media_recommendation npm run demo

# Automated constraint tests (uniqueness, FK cascade, CHECK constraints).
# Runs inside a transaction that's rolled back at the end, so it never
# leaves fixtures behind.
PGUSER=postgres PGPASSWORD=<password> PGDATABASE=cross_media_recommendation npm test
```

Connection settings come from the standard `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`
environment variables (see `scripts/db.js`), defaulting to `localhost:5432`, user `postgres`,
database `cross_media_recommendation`.

## Schema overview

| Table          | Purpose                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| `media`        | A recommendable item (movie, book, show, game, music, etc.)                               |
| `tag_taxonomy` | Controlled vocabulary of tags (genre, mood, theme, era, style, pacing, trope, setting, instrumentation, audience) |
| `media_tags`   | Many-to-many join between `media` and `tag_taxonomy`, carrying `confidence`, `source` (`external`/`auto`/`manual`/`user`), and `status` (`approved`/`pending_review`/`rejected`) |

## Adding a new migration

Add a new file to `migrations/` numbered one higher than the last
(e.g. `0004_add_something.sql`), and update `schema/schema.sql` to reflect the
resulting current-state schema.
