import pytest

from app.friend_recommendation.database_service import UserNotFoundError
from app.friend_recommendation.recommendation_service import (
    recalculate_friend_recommendations,
)


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def fetchall(self):
        return self.rows


class FakeLoadConnection:
    def __init__(self, user_ids, interactions):
        self.user_ids = user_ids
        self.interactions = interactions
        self.queries = []
        self.closed = False

    def execute(self, query, params=None):
        self.queries.append(query)
        if "SELECT id" in query:
            return FakeResult([(user_id,) for user_id in self.user_ids])
        return FakeResult(self.interactions)

    def close(self):
        self.closed = True


class FakeSaveConnection:
    def __init__(self):
        self.executions = []
        self.committed = False
        self.closed = False

    def execute(self, query, params):
        self.executions.append((query, params))

    def commit(self):
        self.committed = True

    def rollback(self):
        raise AssertionError("unexpected rollback")

    def close(self):
        self.closed = True


def test_recalculate_loads_profiles_ranks_and_persists_scores():
    load_connection = FakeLoadConnection(
        [7, 8, 9, 10],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["sci-fi"]),
            (9, 3, "video", "consumed", None, ["cooking"]),
        ],
    )
    save_connection = FakeSaveConnection()
    connections = iter([load_connection, save_connection])

    ranked = recalculate_friend_recommendations(
        7,
        connection_factory=lambda: next(connections),
    )

    assert [candidate["user_id"] for candidate in ranked] == [8, 9, 10]
    assert ranked[0]["similarity_score"] == pytest.approx(1.0)
    assert ranked[1]["similarity_score"] == pytest.approx(0.0)
    assert len(save_connection.executions) == 4
    assert "DELETE FROM friend_similarity_scores" in save_connection.executions[0][0]
    assert save_connection.executions[1][1] == (7, 8, 1.0, 1.0, 0.0, 0.0)
    assert load_connection.closed
    assert save_connection.committed
    assert save_connection.closed


def test_recalculate_updates_scores_after_preferences_change():
    initial_load = FakeLoadConnection(
        [7, 8],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["sci-fi"]),
        ],
    )
    initial_save = FakeSaveConnection()
    updated_load = FakeLoadConnection(
        [7, 8],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["cooking"]),
        ],
    )
    updated_save = FakeSaveConnection()
    connections = iter(
        [initial_load, initial_save, updated_load, updated_save]
    )
    connection_factory = lambda: next(connections)

    initial_ranking = recalculate_friend_recommendations(
        7,
        connection_factory=connection_factory,
    )
    updated_ranking = recalculate_friend_recommendations(
        7,
        connection_factory=connection_factory,
    )

    assert initial_ranking[0]["similarity_score"] == pytest.approx(1.0)
    assert updated_ranking[0]["similarity_score"] == pytest.approx(0.0)
    assert "DELETE FROM friend_similarity_scores" in updated_save.executions[0][0]
    assert updated_save.executions[1][1] == (7, 8, 0.0, 0.0, 0.0, 0.0)


def test_recalculate_raises_for_missing_or_inactive_requesting_user():
    load_connection = FakeLoadConnection([8], [])

    with pytest.raises(UserNotFoundError, match="Active user 7"):
        recalculate_friend_recommendations(
            7,
            connection_factory=lambda: load_connection,
        )

    assert load_connection.closed


@pytest.mark.parametrize("user_id", [0, -1, True, "7"])
def test_recalculate_rejects_invalid_user_id_before_connecting(user_id):
    def unexpected_connect():
        raise AssertionError("connection should not be opened")

    with pytest.raises(ValueError, match="positive integer"):
        recalculate_friend_recommendations(
            user_id,
            connection_factory=unexpected_connect,
        )