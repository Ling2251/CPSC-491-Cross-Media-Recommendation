-- Stores each user's recommendation preferences set during onboarding.
-- Genres are tag names from tag_taxonomy (category 'genre').
-- Languages are stored for future use; media does not yet carry language data.
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    favorite_genres TEXT[] NOT NULL DEFAULT '{}',
    preferred_languages TEXT[] NOT NULL DEFAULT '{}',
    content_types TEXT[] NOT NULL DEFAULT '{}',
    rating_threshold NUMERIC(3, 1) NOT NULL DEFAULT 5.0
        CHECK (rating_threshold >= 0 AND rating_threshold <= 10),
    discovery_interest BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_preferences_content_types_valid CHECK (
        content_types <@ ARRAY['movie', 'tv_series', 'book', 'podcast']::TEXT[]
    )
);
