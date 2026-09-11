-- Many-to-many join between media and tag_taxonomy.
CREATE TABLE media_tags (
    media_id INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag_taxonomy (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (media_id, tag_id)
);

CREATE INDEX idx_media_tags_tag_id ON media_tags (tag_id);
