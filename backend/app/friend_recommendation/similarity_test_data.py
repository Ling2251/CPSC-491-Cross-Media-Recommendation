# backend/app/friend_recommendation/similarity_test_data.py

"""
Controlled preference profiles for Sprint 3 similarity testing.

These profiles are intentionally simple so the expected similarity
relationships are known before implementing the similarity algorithm.
"""


USER_A = {
    "user_id": 1,
    "username": "user_a",
    "preferences": {
        "video": {
            "sci-fi": 0.8,
            "adventure": 0.6,
        },
        "audio": {
            "rock": 1.0,
        },
        "text": {
            "fantasy": 1.0,
        },
    },
}


# Identical to User A.
# Expected: very high / maximum similarity.
USER_B = {
    "user_id": 2,
    "username": "user_b",
    "preferences": {
        "video": {
            "sci-fi": 0.8,
            "adventure": 0.6,
        },
        "audio": {
            "rock": 1.0,
        },
        "text": {
            "fantasy": 1.0,
        },
    },
}


# Completely different interests from User A.
# Expected: very low / zero similarity.
USER_C = {
    "user_id": 3,
    "username": "user_c",
    "preferences": {
        "video": {
            "comedy": 1.0,
        },
        "audio": {
            "pop": 1.0,
        },
        "text": {
            "romance": 1.0,
        },
    },
}


# Shares only one important interest with User A.
# Expected: partial similarity.
USER_D = {
    "user_id": 4,
    "username": "user_d",
    "preferences": {
        "video": {
            "sci-fi": 1.0,
        },
        "audio": {
            "metal": 1.0,
        },
        "text": {
            "mystery": 1.0,
        },
    },
}


# Only video preference data.
# Expected: algorithm should work without crashing.
USER_VIDEO_ONLY = {
    "user_id": 5,
    "username": "video_only",
    "preferences": {
        "video": {
            "sci-fi": 0.8,
            "adventure": 0.6,
        },
        "audio": {},
        "text": {},
    },
}


# Only audio preference data.
USER_AUDIO_ONLY = {
    "user_id": 6,
    "username": "audio_only",
    "preferences": {
        "video": {},
        "audio": {
            "rock": 1.0,
        },
        "text": {},
    },
}


# Only text preference data.
USER_TEXT_ONLY = {
    "user_id": 7,
    "username": "text_only",
    "preferences": {
        "video": {},
        "audio": {},
        "text": {
            "fantasy": 1.0,
        },
    },
}


# No preference data.
# Expected: similarity calculation should return a safe result,
# not throw an exception.
USER_EMPTY = {
    "user_id": 8,
    "username": "empty_user",
    "preferences": {
        "video": {},
        "audio": {},
        "text": {},
    },
}


# Convenience collection for later tests.
ALL_TEST_USERS = [
    USER_A,
    USER_B,
    USER_C,
    USER_D,
    USER_VIDEO_ONLY,
    USER_AUDIO_ONLY,
    USER_TEXT_ONLY,
    USER_EMPTY,
]

EXPECTED_RELATIONSHIPS = {
    "A_vs_B": "very_high",
    "A_vs_C": "very_low",
    "A_vs_D": "partial",
    "A_vs_video_only": "partial_or_high_video",
    "A_vs_audio_only": "partial_or_high_audio",
    "A_vs_text_only": "partial_or_high_text",
    "A_vs_empty": "zero_or_safe_empty_result",
}