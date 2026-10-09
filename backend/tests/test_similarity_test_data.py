from app.friend_recommendation.similarity_test_data import (
    USER_A,
    USER_B,
    USER_C,
    USER_D,
    USER_EMPTY,
)


def test_controlled_users_have_unique_ids():
    ids = {
        USER_A["user_id"],
        USER_B["user_id"],
        USER_C["user_id"],
        USER_D["user_id"],
        USER_EMPTY["user_id"],
    }

    assert len(ids) == 5


def test_user_a_and_b_are_identical():
    assert USER_A["preferences"] == USER_B["preferences"]


def test_user_a_and_c_have_no_shared_tags():
    for media_type in ("video", "audio", "text"):
        a_tags = set(USER_A["preferences"][media_type])
        c_tags = set(USER_C["preferences"][media_type])

        assert a_tags.isdisjoint(c_tags)


def test_user_a_and_d_share_sci_fi():
    a_video_tags = set(
        USER_A["preferences"]["video"]
    )

    d_video_tags = set(
        USER_D["preferences"]["video"]
    )

    assert "sci-fi" in (
        a_video_tags & d_video_tags
    )


def test_empty_user_has_no_preferences():
    assert USER_EMPTY["preferences"] == {
        "video": {},
        "audio": {},
        "text": {},
    }
    