-- Defines the controlled vocabulary of tags (genres, moods, themes, etc.)
-- that media items are classified with. Tags can nest under a parent tag
-- (e.g. "Space Opera" under "Sci-Fi") to support hierarchical browsing.
CREATE TABLE tag_taxonomy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    parent_tag_id INTEGER REFERENCES tag_taxonomy (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_taxonomy_name_category_unique UNIQUE (name, category)
);

CREATE INDEX idx_tag_taxonomy_category ON tag_taxonomy (category);
