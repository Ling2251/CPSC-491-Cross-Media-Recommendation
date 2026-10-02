import logging
import time
import zlib
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

import requests

from app.models import Media

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _stable_media_id(source: str, source_id: str) -> int:
    """Create a deterministic positive integer ID from source provenance."""
    value = zlib.crc32(f"{source}:{source_id}".encode("utf-8")) & 0x7FFFFFFF
    return value or 1


def _clamp_score(value: float) -> float:
    return round(max(0.0, min(10.0, value)), 2)


def _language_name(code: str) -> str:
    language_map = {
        "eng": "English",
        "en": "English",
        "spa": "Spanish",
        "es": "Spanish",
        "fre": "French",
        "fra": "French",
        "fr": "French",
        "ger": "German",
        "deu": "German",
        "de": "German",
        "jpn": "Japanese",
        "ja": "Japanese",
        "kor": "Korean",
        "ko": "Korean",
    }
    cleaned = (code or "").strip().lower()
    return language_map.get(cleaned, code.strip() if code else "Unknown")


class PublicDataCollector:
    """Shared retry/logging behavior for public-source collectors."""

    def __init__(
        self,
        session: Optional[requests.Session] = None,
        max_attempts: int = 3,
        backoff_seconds: float = 1.0,
        sleep_fn: Callable[[float], None] = time.sleep,
    ) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be at least 1")
        self.session = session or requests.Session()
        self.max_attempts = max_attempts
        self.backoff_seconds = backoff_seconds
        self.sleep_fn = sleep_fn

    def _request_json(
        self,
        url: str,
        *,
        params: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
    ) -> Any:
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_attempts + 1):
            try:
                logger.info("Requesting public data: %s (attempt %s/%s)", url, attempt, self.max_attempts)
                response = self.session.get(
                    url,
                    params=params,
                    headers=headers,
                    timeout=10,
                )

                if response.status_code in RETRYABLE_STATUS_CODES:
                    if attempt == self.max_attempts:
                        response.raise_for_status()

                    retry_after = response.headers.get("Retry-After")
                    try:
                        delay = float(retry_after) if retry_after else self.backoff_seconds * (2 ** (attempt - 1))
                    except ValueError:
                        delay = self.backoff_seconds * (2 ** (attempt - 1))

                    logger.warning(
                        "Retryable response %s from %s; retrying in %.2f seconds",
                        response.status_code,
                        url,
                        delay,
                    )
                    self.sleep_fn(delay)
                    continue

                response.raise_for_status()
                return response.json()

            except requests.RequestException as exc:
                last_error = exc
                if attempt == self.max_attempts:
                    logger.error("Public data request failed after %s attempts: %s", self.max_attempts, exc)
                    raise

                delay = self.backoff_seconds * (2 ** (attempt - 1))
                logger.warning("Public data request error: %s; retrying in %.2f seconds", exc, delay)
                self.sleep_fn(delay)

        if last_error:
            raise last_error
        raise RuntimeError("Public data request failed without an exception")


class TVMazeCollector(PublicDataCollector):
    BASE_URL = "https://api.tvmaze.com/search/shows"

    def collect(self, query: str = "star", limit: int = 10) -> List[Media]:
        if limit < 1:
            return []

        payload = self._request_json(self.BASE_URL, params={"q": query})
        records: List[Media] = []

        for result in payload[:limit]:
            show = result.get("show") or {}
            normalized = self._normalize_show(show)
            if normalized:
                records.append(normalized)

        logger.info("TVMaze collection complete: %s normalized records", len(records))
        return records

    @staticmethod
    def _normalize_show(show: Dict[str, Any]) -> Optional[Media]:
        source_id = show.get("id")
        title = (show.get("name") or "").strip()
        if source_id is None or not title:
            logger.warning("Skipping TVMaze record missing id/title")
            return None

        genres = [g.strip() for g in (show.get("genres") or []) if isinstance(g, str) and g.strip()]
        if not genres:
            genres = ["Unknown"]

        language = (show.get("language") or "Unknown").strip() or "Unknown"
        rating = (show.get("rating") or {}).get("average")
        popularity_score = _clamp_score(float(rating)) if rating is not None else 5.0

        source_url = show.get("url") or f"https://www.tvmaze.com/shows/{source_id}"

        return Media(
            media_id=_stable_media_id("tvmaze", str(source_id)),
            title=title,
            media_type="tv_series",
            genres=genres,
            languages=[language],
            popularity_score=popularity_score,
            source="tvmaze",
            source_id=str(source_id),
            source_url=source_url,
            retrieved_at=datetime.now(timezone.utc),
        )


class OpenLibraryCollector(PublicDataCollector):
    BASE_URL = "https://openlibrary.org/search.json"
    DEFAULT_FIELDS = "key,title,subject,language,ratings_average,edition_count"

    def __init__(
        self,
        *args: Any,
        user_agent: str = "CPSC491-Cross-Media-Recommendation/1.0 (student project)",
        **kwargs: Any,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.user_agent = user_agent

    def collect(self, query: str = "science fiction", limit: int = 10) -> List[Media]:
        if limit < 1:
            return []

        payload = self._request_json(
            self.BASE_URL,
            params={
                "q": query,
                "fields": self.DEFAULT_FIELDS,
                "limit": limit,
            },
            headers={"User-Agent": self.user_agent},
        )

        records: List[Media] = []
        for doc in (payload.get("docs") or [])[:limit]:
            normalized = self._normalize_book(doc)
            if normalized:
                records.append(normalized)

        logger.info("Open Library collection complete: %s normalized records", len(records))
        return records

    @staticmethod
    def _normalize_book(doc: Dict[str, Any]) -> Optional[Media]:
        source_id = doc.get("key")
        title = (doc.get("title") or "").strip()
        if not source_id or not title:
            logger.warning("Skipping Open Library record missing key/title")
            return None

        subjects = [s.strip() for s in (doc.get("subject") or []) if isinstance(s, str) and s.strip()]
        genres = subjects[:5] or ["Unknown"]

        languages = [_language_name(code) for code in (doc.get("language") or [])[:3]]
        if not languages:
            languages = ["Unknown"]

        ratings_average = doc.get("ratings_average")
        if ratings_average is not None:
            try:
                popularity_score = _clamp_score(float(ratings_average) * 2.0)
            except (TypeError, ValueError):
                popularity_score = 5.0
        else:
            popularity_score = 5.0

        normalized_key = str(source_id)
        if not normalized_key.startswith("/"):
            normalized_key = f"/{normalized_key}"

        return Media(
            media_id=_stable_media_id("openlibrary", str(source_id)),
            title=title,
            media_type="book",
            genres=genres,
            languages=languages,
            popularity_score=popularity_score,
            source="openlibrary",
            source_id=str(source_id),
            source_url=f"https://openlibrary.org{normalized_key}",
            retrieved_at=datetime.now(timezone.utc),
        )


def collect_public_media(
    tv_query: str = "star",
    book_query: str = "science fiction",
    per_source: int = 10,
) -> List[Media]:
    """Collect a small cross-media dataset from TVMaze and Open Library."""
    tv_records = TVMazeCollector().collect(query=tv_query, limit=per_source)
    book_records = OpenLibraryCollector().collect(query=book_query, limit=per_source)

    combined: Dict[int, Media] = {}
    for item in tv_records + book_records:
        combined[item.media_id] = item

    records = list(combined.values())
    logger.info("Combined public dataset contains %s records", len(records))
    return records
