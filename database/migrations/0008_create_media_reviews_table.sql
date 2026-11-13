
-- Sprint 3: Media Reviews
-- Stores written reviews associated with users and media.

CREATE TABLE IF NOT EXISTS media_reviews (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    media_id INTEGER NOT NULL
        REFERENCES media(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT media_reviews_content_valid
        CHECK (
            length(btrim(content)) BETWEEN 1 AND 2000
        )
);

CREATE INDEX IF NOT EXISTS idx_media_reviews_media
    ON media_reviews(media_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_reviews_user
    ON media_reviews(user_id, created_at DESC);
