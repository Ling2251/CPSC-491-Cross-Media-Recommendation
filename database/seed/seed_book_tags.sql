-- Sprint 4: tag_taxonomy additions for the Open Library (book) provider.
-- None of the genre values seeded for movies in seed_initial_tags.sql cover
-- non-fiction or literary-form categories common in book subjects, so the
-- Open Library adapter's SUBJECT_MAP had unmapped subjects with no tag to
-- land on. Safe to re-run: relies on the same (name, category) uniqueness
-- constraint from 0002_create_tag_taxonomy_table.sql.

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Non-Fiction', 'genre'),
    ('Biography', 'genre'),
    ('Poetry', 'genre'),
    ('Classic Literature', 'genre')
ON CONFLICT (name, category) DO NOTHING;
