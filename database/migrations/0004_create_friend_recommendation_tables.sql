-- App accounts used by authentication and friend recommendations.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    account_state VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One current record per user, media item, and interaction kind.
-- Media tags and media type are obtained by joining media/media_tags/tag_taxonomy.
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

-- One relationship/request per unordered pair. A declined request can be
-- changed back to pending rather than creating a duplicate relationship row.
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
