from pprint import pprint

from .preference_service import (
    build_preference_profile,
    build_raw_preference_profile,
)

from .sample_data import (
    SAMPLE_USER_INTERACTIONS,
)


def main():
    raw_profile = build_raw_preference_profile(
        SAMPLE_USER_INTERACTIONS
    )

    normalized_profile = build_preference_profile(
        SAMPLE_USER_INTERACTIONS
    )

    print("\nRaw Preference Profile")
    print("----------------------")
    pprint(raw_profile)

    print("\nNormalized Preference Profile")
    print("-----------------------------")
    pprint(normalized_profile)


if __name__ == "__main__":
    main()