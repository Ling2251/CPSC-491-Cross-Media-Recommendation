
-- Sprint 4: Media Discussion Forums
-- Creates persistent forum posts and replies.

CREATE TABLE IF NOT EXISTS forum_posts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    media_id INTEGER NOT NULL
        REFERENCES media(id) ON DELETE CASCADE,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT forum_post_content_valid
        CHECK (length(btrim(content)) BETWEEN 1 AND 2000)
);

CREATE TABLE IF NOT EXISTS forum_replies (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    post_id INTEGER NOT NULL
        REFERENCES forum_posts(id) ON DELETE CASCADE,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT forum_reply_content_valid
        CHECK (length(btrim(content)) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_media
    ON forum_posts(media_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post
    ON forum_replies(post_id, created_at ASC);
