-- Stores individual pieces of media (movies, books, shows, games, music, etc.)
-- that the recommendation engine can tag and relate to one another.
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    external_source VARCHAR(50),
    external_id VARCHAR(255),
    description TEXT,
    release_date DATE,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT media_external_source_id_unique UNIQUE (external_source, external_id)
);

CREATE INDEX idx_media_media_type ON media (media_type);
