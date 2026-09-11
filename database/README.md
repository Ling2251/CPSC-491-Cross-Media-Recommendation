# Database

PostgreSQL schema for the cross-media recommendation project.

## Structure

- `migrations/` — ordered, incremental SQL files that build up the schema. This is
  the source of truth; run them in filename order against a fresh database.
- `schema/schema.sql` — a combined snapshot of the current schema (the result of
  applying every migration in order), kept for quick reference and fast local setup.
- `seed/` — sample/reference data (e.g. the initial tag taxonomy) that isn't part of
  the schema itself but is useful for development and demos.

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

## Schema overview

| Table          | Purpose                                                         |
| -------------- | ---------------------------------------------------------------- |
| `media`        | A recommendable item (movie, book, show, game, music, etc.)     |
| `tag_taxonomy` | Controlled vocabulary of tags (genre, mood, theme, ...)          |
| `media_tags`   | Many-to-many join between `media` and `tag_taxonomy`             |

## Adding a new migration

Add a new file to `migrations/` numbered one higher than the last
(e.g. `0004_add_something.sql`), and update `schema/schema.sql` to reflect the
resulting current-state schema.
