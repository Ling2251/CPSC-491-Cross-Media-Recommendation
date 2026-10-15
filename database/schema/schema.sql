-- Combined current-state schema for reference.
-- This is a snapshot of applying every file in database/migrations/ in order;
-- it is not run directly. Update it whenever a new migration is added.

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    account_state VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE user_media_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL
        CHECK (interaction_type IN ('consumed', 'saved', 'rated')),
    rating INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_media_interactions_rating_valid CHECK (
        (interaction_type = 'rated' AND rating BETWEEN 1 AND 5)
        OR (interaction_type IN ('consumed', 'saved') AND rating IS NULL)
    ),
    CONSTRAINT user_media_interactions_unique
        UNIQUE (user_id, media_id, interaction_type)
);

CREATE INDEX idx_user_media_interactions_media_id
    ON user_media_interactions (media_id);

CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT friendships_no_self CHECK (requester_id <> receiver_id)
);

CREATE UNIQUE INDEX friendships_user_pair_unique
    ON friendships (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id));
CREATE INDEX idx_friendships_requester_id ON friendships (requester_id);
CREATE INDEX idx_friendships_receiver_id ON friendships (receiver_id);

CREATE TABLE friend_similarity_scores (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    candidate_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    overall_score NUMERIC(6, 5) NOT NULL
        CHECK (overall_score >= 0 AND overall_score <= 1),
    video_score NUMERIC(6, 5) NOT NULL
        CHECK (video_score >= 0 AND video_score <= 1),
    audio_score NUMERIC(6, 5) NOT NULL
        CHECK (audio_score >= 0 AND audio_score <= 1),
    text_score NUMERIC(6, 5) NOT NULL
        CHECK (text_score >= 0 AND text_score <= 1),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT friend_similarity_scores_distinct_users
        CHECK (user_id <> candidate_user_id),
    CONSTRAINT friend_similarity_scores_user_pair_unique
        UNIQUE (user_id, candidate_user_id)
);

CREATE INDEX idx_friend_similarity_scores_ranked
    ON friend_similarity_scores (user_id, overall_score DESC, candidate_user_id);
CREATE INDEX idx_friend_similarity_scores_candidate
    ON friend_similarity_scores (candidate_user_id);
