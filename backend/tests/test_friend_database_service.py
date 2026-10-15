import pytest

from app.friend_recommendation.database_service import (
    UserNotFoundError,
    build_user_preference_profile,
    load_user_interactions,
)


class FakeResult:
    def __init__(self, row=None, rows=None):
        self.row = row
        self.rows = rows or []

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class FakeConnection:
    def __init__(self, interactions, user_exists=True):
        self.interactions = interactions
        self.user_exists = user_exists
        self.queries = []
        self.closed = False

    def execute(self, query, params):
        self.queries.append((query, params))
        if "FROM users" in query:
            return FakeResult(row=(params[0],) if self.user_exists else None)
        return FakeResult(rows=self.interactions)

    def close(self):
        self.closed = True


def test_load_user_interactions_maps_database_rows_and_closes_connection():
    connection = FakeConnection(
        [
            (10, "video", "rated", 5, ["Sci-Fi", "Space"]),
            (11, "audio", "saved", None, None),
        ]
    )

    interactions = load_user_interactions(
        7,
        connection_factory=lambda: connection,
    )

    assert len(interactions) == 2
    assert interactions[0].media_id == 10
    assert interactions[0].media_type == "video"
    assert interactions[0].interaction_type == "rated"
    assert interactions[0].rating == 5
    assert interactions[0].tags == ["Sci-Fi", "Space"]
    assert interactions[1].tags == []
    assert connection.closed
    assert len(connection.queries) == 2


def test_database_profile_uses_preference_calculator():
    connection = FakeConnection(
        [
            (10, "video", "consumed", None, ["Sci-Fi"]),
            (11, "video", "saved", None, ["Sci-Fi"]),
        ]
    )

    profile = build_user_preference_profile(
        7,
        connection_factory=lambda: connection,
    )

    assert profile["video"]["sci-fi"] == pytest.approx(1.0)
    assert profile["audio"] == {}
    assert profile["text"] == {}


def test_missing_or_inactive_user_raises_and_closes_connection():
    connection = FakeConnection([], user_exists=False)

    with pytest.raises(UserNotFoundError):
        load_user_interactions(
            999,
            connection_factory=lambda: connection,
        )

    assert connection.closed
    assert len(connection.queries) == 1


@pytest.mark.parametrize("user_id", [0, -1, True, "7"])
def test_invalid_user_id_is_rejected(user_id):
    with pytest.raises(ValueError):
        load_user_interactions(user_id)
