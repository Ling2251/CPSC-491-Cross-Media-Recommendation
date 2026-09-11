-- Initial tag taxonomy seed data. Safe to re-run: relies on the
-- (name, category) uniqueness constraint from 0002_create_tag_taxonomy_table.sql.

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Action', 'genre'),
    ('Comedy', 'genre'),
    ('Drama', 'genre'),
    ('Horror', 'genre'),
    ('Sci-Fi', 'genre'),
    ('Fantasy', 'genre'),
    ('Romance', 'genre'),
    ('Mystery', 'genre'),
    ('Thriller', 'genre'),
    ('Documentary', 'genre')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Uplifting', 'mood'),
    ('Dark', 'mood'),
    ('Relaxing', 'mood'),
    ('Intense', 'mood'),
    ('Nostalgic', 'mood')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Coming of Age', 'theme'),
    ('Redemption', 'theme'),
    ('Survival', 'theme'),
    ('Friendship', 'theme'),
    ('Betrayal', 'theme')
ON CONFLICT (name, category) DO NOTHING;
