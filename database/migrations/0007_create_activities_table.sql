-- Records ratings, reviews, and watchlist additions.

CREATE TABLE IF NOT EXISTS activities (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    media_id INTEGER NOT NULL
        REFERENCES media(id) ON DELETE CASCADE,

    activity_type VARCHAR(30) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_activity_type
        CHECK (activity_type IN (
            'rating',
            'review',
            'watchlist_add'
        ))
);

CREATE INDEX IF NOT EXISTS idx_activities_user_created
    ON activities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_created
    ON activities(created_at DESC);
