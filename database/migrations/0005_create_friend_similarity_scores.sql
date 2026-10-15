-- Directional score rows support efficient retrieval of candidates for one user.
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
