CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,

    requester_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'accepted',
                'declined'
            )
        ),

    created_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        requester_id <> receiver_id
    ),

    FOREIGN KEY (requester_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (receiver_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);