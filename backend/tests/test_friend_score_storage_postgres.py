"""PostgreSQL integration coverage for persisted similarity scores."""

import os
import uuid

import pytest

from app.friend_recommendation.database_service import connect_database
from app.friend_recommendation.score_storage import (
    get_ranked_similarity_scores,
    save_similarity_scores,
)


pytestmark = pytest.mark.skipif(
    os.getenv("FRIEND_RECOMMENDATION_TEST_DATABASE") != "1",
    reason="requires the migrated PostgreSQL integration database",
)


def test_score_storage_round_trips_updates_and_replaces_database_rows():
    unique_id = uuid.uuid4().hex
    connection = connect_database()
    user_ids = []
    try:
        for name, email_suffix in [
            ("Integration owner", "owner"),
            ("Integration candidate one", "candidate-one"),
            ("Integration candidate two", "candidate-two"),
        ]:
            row = connection.execute(
                """
                INSERT INTO users (name, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (
                    name,
                    f"score-{email_suffix}-{unique_id}@example.test",
                    "integration-test",
                ),
            ).fetchone()
            user_ids.append(row[0])
        connection.commit()
    finally:
        connection.close()

    owner_id, candidate_one_id, candidate_two_id = user_ids
    try:
        initial_scores = [
            {
                "user_id": candidate_one_id,
                "similarity_score": 0.6,
                "scores": {"video": 0.6, "audio": 0.0, "text": 0.0},
            },
            {
                "user_id": candidate_two_id,
                "similarity_score": 0.9,
                "scores": {"video": 0.0, "audio": 0.9, "text": 0.0},
            },
        ]

        assert save_similarity_scores(owner_id, initial_scores) == 2

        ranked = get_ranked_similarity_scores(owner_id)
        assert [row["candidate_user_id"] for row in ranked] == [
            candidate_two_id,
            candidate_one_id,
        ]
        assert ranked[0]["overall_score"] == pytest.approx(0.9)
        assert ranked[0]["calculated_at"] is not None

        updated_score = {
            "user_id": candidate_one_id,
            "similarity_score": 1.0,
            "scores": {"video": 1.0, "audio": 0.0, "text": 0.0},
        }
        assert save_similarity_scores(owner_id, [updated_score]) == 1

        ranked = get_ranked_similarity_scores(owner_id)
        assert len(ranked) == 2
        assert ranked[0]["candidate_user_id"] == candidate_one_id
        assert ranked[0]["overall_score"] == pytest.approx(1.0)

        assert save_similarity_scores(
            owner_id,
            [],
            replace_existing=True,
        ) == 0
        assert get_ranked_similarity_scores(owner_id) == []
    finally:
        cleanup_connection = connect_database()
        try:
            cleanup_connection.execute(
                "DELETE FROM users WHERE id = ANY(%s)",
                (user_ids,),
            )
            cleanup_connection.commit()
        finally:
            cleanup_connection.close()
