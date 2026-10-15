import pytest

from app.friend_recommendation.score_storage import (
    get_ranked_similarity_scores,
    save_similarity_scores,
)


class FakeResult:
    def __init__(self, rows=None):
        self.rows = rows or []

    def fetchall(self):
        return self.rows


class FakeConnection:
    def __init__(self, rows=None, fail_on_execute=False):
        self.rows = rows or []
        self.fail_on_execute = fail_on_execute
        self.executions = []
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def execute(self, query, params):
        self.executions.append((query, params))
        if self.fail_on_execute:
            raise RuntimeError("database write failed")
        return FakeResult(self.rows)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


RANKED = [
    {
        "user_id": 8,
        "similarity_score": 0.9,
        "scores": {"overall": 0.9, "video": 1.0, "audio": 0.8, "text": 0.9},
    },
    {
        "user_id": 9,
        "similarity_score": 0.4,
        "scores": {"overall": 0.4, "video": 0.5, "audio": 0.3, "text": 0.4},
    },
]


def test_save_scores_upserts_each_candidate_and_commits():
    connection = FakeConnection()

    count = save_similarity_scores(
        7,
        RANKED,
        connection_factory=lambda: connection,
    )

    assert count == 2
    assert len(connection.executions) == 2
    assert all("ON CONFLICT" in query for query, _ in connection.executions)
    assert connection.executions[0][1] == (7, 8, 0.9, 1.0, 0.8, 0.9)
    assert connection.committed
    assert not connection.rolled_back
    assert connection.closed


def test_save_scores_rolls_back_and_reraises_database_errors():
    connection = FakeConnection(fail_on_execute=True)

    with pytest.raises(RuntimeError, match="database write failed"):
        save_similarity_scores(
            7,
            RANKED[:1],
            connection_factory=lambda: connection,
        )

    assert connection.rolled_back
    assert connection.closed


def test_get_ranked_scores_maps_rows_and_uses_limit():
    connection = FakeConnection(
        [
            (8, 0.9, 1.0, 0.8, 0.9, "timestamp"),
            (9, 0.4, 0.5, 0.3, 0.4, "timestamp"),
        ]
    )

    rows = get_ranked_similarity_scores(
        7,
        limit=2,
        connection_factory=lambda: connection,
    )

    assert rows[0]["candidate_user_id"] == 8
    assert rows[0]["overall_score"] == pytest.approx(0.9)
    assert rows[1]["video_score"] == pytest.approx(0.5)
    assert connection.executions[0][1] == (7, 2)
    assert connection.closed


@pytest.mark.parametrize(
    ("user_id", "candidate_id", "overall"),
    [
        (0, 8, 0.9),
        (7, 7, 0.9),
        (7, 8, 1.1),
    ],
)
def test_invalid_score_record_is_rejected_without_connecting(
    user_id,
    candidate_id,
    overall,
):
    def unexpected_connect():
        raise AssertionError("connection should not be opened")

    record = {
        "user_id": candidate_id,
        "similarity_score": overall,
        "scores": {"video": 0.5, "audio": 0.5, "text": 0.5},
    }
    with pytest.raises(ValueError):
        save_similarity_scores(
            user_id,
            [record],
            connection_factory=unexpected_connect,
        )


def test_empty_save_does_not_open_connection():
    def unexpected_connect():
        raise AssertionError("connection should not be opened")

    assert save_similarity_scores(
        7,
        [],
        connection_factory=unexpected_connect,
    ) == 0


def test_replacing_scores_deletes_previous_candidates_even_when_empty():
    connection = FakeConnection()

    count = save_similarity_scores(
        7,
        [],
        connection_factory=lambda: connection,
        replace_existing=True,
    )

    assert count == 0
    assert len(connection.executions) == 1
    assert "DELETE FROM friend_similarity_scores" in connection.executions[0][0]
    assert connection.executions[0][1] == (7,)
    assert connection.committed
    assert connection.closed
