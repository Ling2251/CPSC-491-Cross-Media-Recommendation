import requests

from app.services.public_data import OpenLibraryCollector, TVMazeCollector


class FakeResponse:
    def __init__(self, payload, status_code=200, headers=None):
        self._payload = payload
        self.status_code = status_code
        self.headers = headers or {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            response = requests.Response()
            response.status_code = self.status_code
            raise requests.HTTPError(
                f"HTTP {self.status_code}", response=response
            )


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def get(self, url, params=None, headers=None, timeout=None):
        self.calls.append(
            {
                "url": url,
                "params": params,
                "headers": headers,
                "timeout": timeout,
            }
        )
        return self.responses.pop(0)


def test_tvmaze_collection_normalizes_to_internal_media_schema():
    session = FakeSession(
        [
            FakeResponse(
                [
                    {
                        "score": 1.0,
                        "show": {
                            "id": 123,
                            "name": "Example Show",
                            "genres": ["Drama", "Science-Fiction"],
                            "language": "English",
                            "rating": {"average": 8.4},
                            "url": "https://www.tvmaze.com/shows/123/example-show",
                        },
                    }
                ]
            )
        ]
    )

    records = TVMazeCollector(session=session, sleep_fn=lambda _: None).collect(
        query="example", limit=5
    )

    assert len(records) == 1
    media = records[0]
    assert media.title == "Example Show"
    assert media.media_type == "tv_series"
    assert media.genres == ["Drama", "Science-Fiction"]
    assert media.languages == ["English"]
    assert media.popularity_score == 8.4
    assert media.source == "tvmaze"
    assert media.source_id == "123"
    assert media.source_url.endswith("/123/example-show")
    assert media.retrieved_at is not None


def test_openlibrary_collection_normalizes_to_internal_media_schema():
    session = FakeSession(
        [
            FakeResponse(
                {
                    "docs": [
                        {
                            "key": "/works/OL123W",
                            "title": "Example Book",
                            "subject": ["Science fiction", "Space travel"],
                            "language": ["eng"],
                            "ratings_average": 4.2,
                            "edition_count": 12,
                        }
                    ]
                }
            )
        ]
    )

    records = OpenLibraryCollector(session=session, sleep_fn=lambda _: None).collect(
        query="example", limit=5
    )

    assert len(records) == 1
    media = records[0]
    assert media.title == "Example Book"
    assert media.media_type == "book"
    assert media.genres == ["Science fiction", "Space travel"]
    assert media.languages == ["English"]
    assert media.popularity_score == 8.4
    assert media.source == "openlibrary"
    assert media.source_id == "/works/OL123W"
    assert media.source_url == "https://openlibrary.org/works/OL123W"

    request_headers = session.calls[0]["headers"]
    assert request_headers is not None
    assert "User-Agent" in request_headers


def test_retryable_response_is_retried_before_success():
    session = FakeSession(
        [
            FakeResponse({}, status_code=429, headers={"Retry-After": "0"}),
            FakeResponse([]),
        ]
    )
    delays = []

    records = TVMazeCollector(
        session=session,
        max_attempts=3,
        sleep_fn=delays.append,
    ).collect(query="example", limit=5)

    assert records == []
    assert len(session.calls) == 2
    assert delays == [0.0]


def test_invalid_source_record_is_skipped():
    session = FakeSession(
        [
            FakeResponse(
                [
                    {"show": {"id": 123, "name": "", "genres": ["Drama"]}},
                    {
                        "show": {
                            "id": 456,
                            "name": "Valid Show",
                            "genres": [],
                            "language": None,
                            "rating": {"average": None},
                        }
                    },
                ]
            )
        ]
    )

    records = TVMazeCollector(session=session, sleep_fn=lambda _: None).collect(
        query="example", limit=10
    )

    assert len(records) == 1
    assert records[0].title == "Valid Show"
    assert records[0].genres == ["Unknown"]
    assert records[0].languages == ["Unknown"]
    assert records[0].popularity_score == 5.0


def test_same_source_record_gets_stable_media_id():
    show = {
        "id": 999,
        "name": "Stable ID Show",
        "genres": ["Drama"],
        "language": "English",
        "rating": {"average": 7.0},
    }

    first = TVMazeCollector._normalize_show(show)
    second = TVMazeCollector._normalize_show(show)

    assert first is not None
    assert second is not None
    assert first.media_id == second.media_id
