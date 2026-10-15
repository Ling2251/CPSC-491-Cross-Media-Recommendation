-- Initial tag taxonomy seed data. Safe to re-run: relies on the
-- (name, category) uniqueness constraint from 0002_create_tag_taxonomy_table.sql.
-- Covers the cross-media dimensions from the Sprint 1 plan: genre, mood,
-- theme, era, style, pacing, trope, setting, instrumentation, audience.

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

INSERT INTO tag_taxonomy (name, category) VALUES
    ('1980s', 'era'),
    ('1990s', 'era'),
    ('2000s', 'era'),
    ('2010s', 'era'),
    ('Contemporary', 'era'),
    ('Futuristic', 'era')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Minimalist', 'style'),
    ('Surreal', 'style'),
    ('Noir', 'style'),
    ('Whimsical', 'style'),
    ('Gritty', 'style')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Slow Burn', 'pacing'),
    ('Fast-Paced', 'pacing'),
    ('Episodic', 'pacing'),
    ('Meandering', 'pacing')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Chosen One', 'trope'),
    ('Enemies to Lovers', 'trope'),
    ('Found Family', 'trope'),
    ('Unreliable Narrator', 'trope'),
    ('Time Loop', 'trope')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Urban', 'setting'),
    ('Rural', 'setting'),
    ('Space', 'setting'),
    ('Post-Apocalyptic', 'setting'),
    ('Small Town', 'setting')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Acoustic', 'instrumentation'),
    ('Electronic', 'instrumentation'),
    ('Orchestral', 'instrumentation'),
    ('A Cappella', 'instrumentation')
ON CONFLICT (name, category) DO NOTHING;

INSERT INTO tag_taxonomy (name, category) VALUES
    ('Children', 'audience'),
    ('Young Adult', 'audience'),
    ('Adult', 'audience'),
    ('Family-Friendly', 'audience'),
    ('Mature', 'audience')
ON CONFLICT (name, category) DO NOTHING;
