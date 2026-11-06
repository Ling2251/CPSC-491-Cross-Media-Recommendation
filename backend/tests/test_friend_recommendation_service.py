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
    def __init__(
        self,
        user_ids=None,
        interactions=None,
        friend_ids=None,
        friendships=None,
    ):
        self.user_ids = user_ids
        self.interactions = interactions
        self.friend_ids = friend_ids or []
        self.friendships = friendships
        self.queries = []
        self.closed = False

    def execute(self, query, params=None):
        self.queries.append(query)
        if "FROM friendships" in query:
            if self.friendships is not None:
                user_id = params[0]
                return FakeResult(
                    [
                        (
                            receiver_id
                            if requester_id == user_id
                            else requester_id,
                        )
                        for requester_id, receiver_id, status in self.friendships
                        if (
                            status == "accepted"
                            and user_id in (requester_id, receiver_id)
                        )
                        or (
                            status == "pending"
                            and user_id in (requester_id, receiver_id)
                        )
                    ]
                )
            return FakeResult([(user_id,) for user_id in self.friend_ids])
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
    friendship_connection = FakeLoadConnection(friend_ids=[])
    save_connection = FakeSaveConnection()
    connections = iter(
        [load_connection, friendship_connection, save_connection]
    )

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
    assert friendship_connection.closed
    assert all(
        query.lstrip().upper().startswith("SELECT")
        for query in friendship_connection.queries
    )
    assert save_connection.committed
    assert save_connection.closed


def test_recalculate_excludes_accepted_friends_without_changing_friendships():
    load_connection = FakeLoadConnection(
        [7, 8, 9, 10],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["sci-fi"]),
            (9, 3, "video", "consumed", None, ["cooking"]),
        ],
    )
    friendship_connection = FakeLoadConnection(
        friendships=[(7, 8, "accepted")]
    )
    save_connection = FakeSaveConnection()
    connections = iter(
        [load_connection, friendship_connection, save_connection]
    )

    ranked = recalculate_friend_recommendations(
        7,
        connection_factory=lambda: next(connections),
    )

    assert [candidate["user_id"] for candidate in ranked] == [9, 10]
    saved_candidate_ids = [
        params[1]
        for query, params in save_connection.executions
        if len(params) == 6
    ]
    assert saved_candidate_ids == [9, 10]
    assert len(friendship_connection.queries) == 1
    assert "status = 'accepted'" in friendship_connection.queries[0]
    assert friendship_connection.queries[0].lstrip().upper().startswith("SELECT")


def test_recalculate_excludes_multiple_accepted_friends():
    load_connection = FakeLoadConnection(
        [7, 8, 9, 10],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["sci-fi"]),
            (9, 3, "video", "consumed", None, ["sci-fi"]),
            (10, 4, "video", "consumed", None, ["cooking"]),
        ],
    )
    friendship_connection = FakeLoadConnection(
        friendships=[
            (7, 8, "accepted"),
            (9, 7, "accepted"),
        ]
    )
    save_connection = FakeSaveConnection()
    connections = iter(
        [load_connection, friendship_connection, save_connection]
    )

    ranked = recalculate_friend_recommendations(
        7,
        connection_factory=lambda: next(connections),
    )

    assert [candidate["user_id"] for candidate in ranked] == [10]
    assert ranked[0]["similarity_score"] == pytest.approx(0.0)


def test_filtering_does_not_change_scores_for_remaining_candidates():
    interactions = [
        (7, 1, "video", "consumed", None, ["sci-fi"]),
        (8, 2, "video", "consumed", None, ["sci-fi"]),
        (9, 3, "video", "consumed", None, ["rock"]),
        (10, 4, "video", "consumed", None, ["sci-fi"]),
        (11, 5, "video", "consumed", None, ["cooking"]),
    ]

    def run_recommendations(friendships):
        load_connection = FakeLoadConnection(
            [7, 8, 9, 10, 11],
            interactions,
        )
        friendship_connection = FakeLoadConnection(friendships=friendships)
        save_connection = FakeSaveConnection()
        connections = iter(
            [load_connection, friendship_connection, save_connection]
        )
        ranked = recalculate_friend_recommendations(
            7,
            connection_factory=lambda: next(connections),
        )
        return {
            candidate["user_id"]: candidate["similarity_score"]
            for candidate in ranked
        }

    unfiltered_scores = run_recommendations([])
    filtered_scores = run_recommendations(
        [
            (7, 8, "accepted"),
            (9, 7, "accepted"),
        ]
    )

    assert set(filtered_scores) == {10, 11}
    assert filtered_scores == {
        candidate_id: unfiltered_scores[candidate_id]
        for candidate_id in (10, 11)
    }


def test_recalculate_excludes_supplied_opt_out_users_without_changing_scores():
    interactions = [
        (7, 1, "video", "consumed", None, ["sci-fi"]),
        (8, 2, "video", "consumed", None, ["sci-fi"]),
        (9, 3, "video", "consumed", None, ["rock"]),
        (10, 4, "video", "consumed", None, ["fantasy"]),
        (11, 5, "video", "consumed", None, ["cooking"]),
    ]

    def run_recommendations(opted_out_user_ids):
        load_connection = FakeLoadConnection(
            [7, 8, 9, 10, 11],
            interactions,
        )
        friendship_connection = FakeLoadConnection(friend_ids=[])
        save_connection = FakeSaveConnection()
        connections = iter(
            [load_connection, friendship_connection, save_connection]
        )
        ranked = recalculate_friend_recommendations(
            7,
            connection_factory=lambda: next(connections),
            opted_out_user_ids=opted_out_user_ids,
        )
        return {
            candidate["user_id"]: candidate["similarity_score"]
            for candidate in ranked
        }

    eligible_scores = run_recommendations([])
    filtered_scores = run_recommendations([8, 9])

    assert set(filtered_scores) == {10, 11}
    assert filtered_scores == {
        candidate_id: eligible_scores[candidate_id]
        for candidate_id in (10, 11)
    }


@pytest.mark.parametrize("opted_out_user_ids", [None, []])
def test_recalculate_handles_empty_opt_out_set_without_filtering_candidates(
    opted_out_user_ids,
):
    load_connection = FakeLoadConnection(
        [7, 8, 9],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["rock"]),
        ],
    )
    friendship_connection = FakeLoadConnection(friend_ids=[])
    save_connection = FakeSaveConnection()
    connections = iter(
        [load_connection, friendship_connection, save_connection]
    )

    ranked = recalculate_friend_recommendations(
        7,
        connection_factory=lambda: next(connections),
        opted_out_user_ids=opted_out_user_ids,
    )

    assert [candidate["user_id"] for candidate in ranked] == [8, 9]


@pytest.mark.parametrize("opted_out_user_ids", [[0], [-1], [True], ["8"]])
def test_recalculate_rejects_invalid_opt_out_user_ids(
    opted_out_user_ids,
):
    with pytest.raises(ValueError, match="opted_out_user_ids"):
        recalculate_friend_recommendations(
            7,
            opted_out_user_ids=opted_out_user_ids,
        )


def test_recalculate_excludes_pending_outgoing_request_recipients():
    load_connection = FakeLoadConnection(
        [7, 8, 9, 10],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["sci-fi"]),
            (9, 3, "video", "consumed", None, ["cooking"]),
        ],
    )
    friendship_connection = FakeLoadConnection(
        friendships=[
            (7, 8, "pending"),
            (7, 10, "declined"),
        ]
    )
    save_connection = FakeSaveConnection()
    connections = iter(
        [load_connection, friendship_connection, save_connection]
    )

    ranked = recalculate_friend_recommendations(
        7,
        connection_factory=lambda: next(connections),
    )

    assert [candidate["user_id"] for candidate in ranked] == [9, 10]
    assert "status = 'pending'" in friendship_connection.queries[0]
    assert "requester_id = %s" in friendship_connection.queries[0]
    assert "receiver_id = %s" in friendship_connection.queries[0]
    assert friendship_connection.queries[0].lstrip().upper().startswith("SELECT")
    assert friendship_connection.queries[0].count("%s") == 5
    assert len(friendship_connection.queries) == 1


def test_recalculate_excludes_pending_incoming_request_senders():
    load_connection = FakeLoadConnection(
        [7, 8, 9, 10],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["sci-fi"]),
            (9, 3, "video", "consumed", None, ["cooking"]),
        ],
    )
    friendship_connection = FakeLoadConnection(
        friendships=[
            (8, 7, "pending"),
            (9, 10, "pending"),
            (7, 10, "declined"),
        ]
    )
    save_connection = FakeSaveConnection()
    connections = iter(
        [load_connection, friendship_connection, save_connection]
    )

    ranked = recalculate_friend_recommendations(
        7,
        connection_factory=lambda: next(connections),
    )

    assert [candidate["user_id"] for candidate in ranked] == [9, 10]
    assert "status = 'pending'" in friendship_connection.queries[0]
    assert "requester_id = %s" in friendship_connection.queries[0]
    assert "receiver_id = %s" in friendship_connection.queries[0]


def test_recalculate_excludes_multiple_pending_requests_in_both_directions():
    load_connection = FakeLoadConnection(
        [7, 8, 9, 10, 11, 12],
        [
            (7, 1, "video", "consumed", None, ["sci-fi"]),
            (8, 2, "video", "consumed", None, ["sci-fi"]),
            (9, 3, "video", "consumed", None, ["rock"]),
            (10, 4, "video", "consumed", None, ["fantasy"]),
            (11, 5, "video", "consumed", None, ["cooking"]),
        ],
    )
    friendship_connection = FakeLoadConnection(
        friendships=[
            (7, 8, "pending"),
            (7, 9, "pending"),
            (10, 7, "pending"),
            (11, 7, "pending"),
            (7, 12, "declined"),
        ]
    )
    save_connection = FakeSaveConnection()
    connections = iter(
        [load_connection, friendship_connection, save_connection]
    )

    ranked = recalculate_friend_recommendations(
        7,
        connection_factory=lambda: next(connections),
    )

    assert {candidate["user_id"] for candidate in ranked} == {12}
    assert all(
        candidate["user_id"] not in {8, 9, 10, 11}
        for candidate in ranked
    )


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
    initial_friendships = FakeLoadConnection(friend_ids=[])
    updated_friendships = FakeLoadConnection(friend_ids=[])
    updated_save = FakeSaveConnection()
    connections = iter(
        [
            initial_load,
            initial_friendships,
            initial_save,
            updated_load,
            updated_friendships,
            updated_save,
        ]
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