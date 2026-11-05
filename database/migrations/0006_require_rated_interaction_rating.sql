ALTER TABLE user_media_interactions
    DROP CONSTRAINT user_media_interactions_rating_valid;

ALTER TABLE user_media_interactions
    ADD CONSTRAINT user_media_interactions_rating_valid CHECK (
        (
            interaction_type = 'rated'
            AND rating IS NOT NULL
            AND rating BETWEEN 1 AND 5
        )
        OR (interaction_type IN ('consumed', 'saved') AND rating IS NULL)
    );
