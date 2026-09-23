-- Many-to-many join between media and tag_taxonomy. Carries the assignment
-- metadata (confidence, source, status) needed by later sprints: automatic
-- tagging (Sprint 3) writes confidence + source=auto, and user-submitted
-- tags (Sprint 5) land here as source=user, status=pending_review.
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
