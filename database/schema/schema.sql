-- Combined current-state schema for reference.
-- This is a snapshot of applying every file in database/migrations/ in order;
-- it is not run directly. Update it whenever a new migration is added.

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

CREATE TABLE tag_taxonomy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    parent_tag_id INTEGER REFERENCES tag_taxonomy (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_taxonomy_name_category_unique UNIQUE (name, category)
);

CREATE INDEX idx_tag_taxonomy_category ON tag_taxonomy (category);

CREATE TABLE media_tags (
    media_id INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag_taxonomy (id) ON DELETE CASCADE,
    confidence NUMERIC(4, 3) CHECK (confidence >= 0 AND confidence <= 1),
    source VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (source IN ('external', 'auto', 'manual', 'user')),
    status VARCHAR(20) NOT NULL DEFAULT 'approved'
        CHECK (status IN ('approved', 'pending_review', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (media_id, tag_id)
);

CREATE INDEX idx_media_tags_tag_id ON media_tags (tag_id);
CREATE INDEX idx_media_tags_status ON media_tags (status);
