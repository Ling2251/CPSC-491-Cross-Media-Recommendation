import argparse
import json
import logging
from pathlib import Path
import sys

# Allow running directly from ai-backend/scripts without installing the package.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.public_data import collect_public_media
from app.services.validator import DataValidator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect and normalize a small public cross-media dataset."
    )
    parser.add_argument("--tv-query", default="star", help="TVMaze search query")
    parser.add_argument(
        "--book-query", default="science fiction", help="Open Library search query"
    )
    parser.add_argument(
        "--per-source", type=int, default=10, help="Maximum records per public source"
    )
    parser.add_argument(
        "--output",
        default="data/sample_public_media.json",
        help="Output path relative to ai-backend unless absolute",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = ROOT / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    records = collect_public_media(
        tv_query=args.tv_query,
        book_query=args.book_query,
        per_source=args.per_source,
    )

    is_valid, errors = DataValidator.validate_media(records)
    if not is_valid:
        logging.error("Normalized public data failed validation: %s", errors)
        return 1

    payload = {
        "summary": {
            "total_records": len(records),
            "tv_series": sum(1 for r in records if r.media_type == "tv_series"),
            "books": sum(1 for r in records if r.media_type == "book"),
            "sources": sorted({r.source for r in records if r.source}),
        },
        "records": [r.model_dump(mode="json") for r in records],
    }

    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Collected and normalized {len(records)} records")
    print(f"Validation: PASS")
    print(f"Output: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
