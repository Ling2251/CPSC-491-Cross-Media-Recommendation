# AI Recommendation Backend

A FastAPI-based recommendation system with multi-source data collection. 

**Sprint 1** establishes the foundation with dummy data generation, validation, and a simple top-N baseline recommender.

**Sprint 2** extends this with a public-data ingestion pipeline, collecting TV series and book data from public APIs without requiring authentication.

## Setup

### Create Virtual Environment

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```

The server runs on `http://127.0.0.1:8000`

### Interactive API Documentation

Visit `http://127.0.0.1:8000/docs` to explore and test endpoints with Swagger UI.

## Endpoints

### Health Check
- `GET /health` - Check server status and data validation results

### Data Generation
- `GET /generate` - Verify dummy data was generated successfully

### Recommendations
- `GET /recommend/{user_id}` - Get top-N recommendations for a user
  - Query param: `top_n` (default: 5)

## Running Tests

```bash
pytest -q
```

For verbose output:

```bash
pytest -v
```

## Continuous Integration

This project uses GitHub Actions to automatically run the backend test suite on every push and pull request.

### CI Workflow

The CI workflow (`.github/workflows/ci.yml`) performs the following steps:

1. **Trigger**: Runs on `push` to main/AI-Recommendation branches and on pull requests
2. **Environment**: Sets up Python 3.12 on Ubuntu
3. **Install**: Installs dependencies from `requirements.txt`
4. **Test**: Runs the full test suite with `pytest ai-backend/tests -v`

All 12 tests must pass before code can be merged.

### Local Test Execution

To run tests locally before pushing:

```bash
# Run all tests (quiet mode)
pytest ai-backend/tests -q

# Run with verbose output
pytest ai-backend/tests -v

# Run specific test file
pytest ai-backend/tests/test_generator.py -v

# Run with coverage
pytest ai-backend/tests --cov=ai-backend/app
```

## Data Generated for Sprint 1

- **50 dummy users** with random genre/language preferences
- **100 media items** (movies, TV series, books, podcasts) with metadata
- **750 randomized ratings** (1–5 scale) with timestamps
- **Data validation** ensuring schema integrity

## Baseline Recommender

The simple top-N recommender:
1. Excludes media the user has already rated
2. Scores unrated media based on:
   - Genre match with user preferences (+2.0)
   - Language match with user preferences (+1.0)
   - Media popularity score (0–10)
3. Returns top N recommendations with explanations

## Architecture

```
ai-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app and endpoints
│   ├── models.py            # Pydantic data models (with provenance fields)
│   └── services/
│       ├── generator.py     # Dummy data generation (Sprint 1)
│       ├── validator.py     # Data validation
│       ├── recommender.py   # Baseline recommendation logic
│       └── public_data.py   # Public API data collection (Sprint 2)
├── scripts/
│   └── collect_public_data.py  # CLI for public data collection
├── tests/
│   ├── __init__.py
│   ├── test_generator.py    # Tests for data generation
│   ├── test_validator.py    # Tests for data validation
│   ├── test_recommender.py  # Tests for recommendation logic
│   └── test_public_data.py  # Tests for public data collection (Sprint 2)
├── data/
│   └── sample_public_media.json  # Sample collected data (Sprint 2)
├── requirements.txt
└── README.md
```

## Example Usage

```bash
# Check server health
curl http://127.0.0.1:8000/health

# Generate dummy data
curl http://127.0.0.1:8000/generate

# Get recommendations for user 1
curl http://127.0.0.1:8000/recommend/1?top_n=5
```

## Sprint 2: Public Data Collection Pipeline

Sprint 2 extends the recommendation backend with a small public-data ingestion pipeline. The pipeline currently collects two media types without requiring API keys:

- **TV series:** TVMaze Search API
- **Books:** Open Library Search API

The collector normalizes both sources into the existing `Media` schema used by the recommendation backend. Sprint 2 also adds provenance fields so each normalized record can be traced to its source.

### Run the collector

From `ai-backend/`:

```bash
python scripts/collect_public_data.py
```

Optional arguments:

```bash
python scripts/collect_public_data.py \
  --tv-query "star trek" \
  --book-query "science fiction" \
  --per-source 10 \
  --output data/sample_public_media.json
```

The script:

1. Requests a small number of records from each public source.
2. Retries temporary HTTP failures with bounded exponential backoff.
3. Normalizes source-specific fields into the internal `Media` schema.
4. Adds provenance fields (`source`, `source_id`, `source_url`, `retrieved_at`).
5. Validates the normalized records with the existing `DataValidator`.
6. Writes a small JSON dataset for Sprint 2 evidence.

### Normalized fields

Each output record contains:

- `media_id`: deterministic internal integer ID derived from source + source ID
- `title`
- `media_type`
- `genres`
- `languages`
- `popularity_score` (0-10)
- `source`
- `source_id`
- `source_url`
- `retrieved_at`

### Source behavior and limits

**TVMaze**

- Public JSON API; no API key is required for the search endpoint.
- The API documents rate limiting and recommends backing off and retrying after HTTP 429 responses.
- This pipeline keeps requests intentionally small and implements bounded retry behavior.

**Open Library**

- Public Search API; no API key is required.
- Open Library asks clients to use the API rather than scrape HTML and recommends identifying applications with a `User-Agent` for regular use.
- The pipeline requests only the fields needed for normalization and uses a small `limit` instead of bulk downloading.

### Tests

Run the entire backend suite:

```bash
pytest tests -v
```

The Sprint 2 public-data tests mock external HTTP responses, so CI does not depend on TVMaze or Open Library being reachable during a test run.

## Future Sprints

- **Sprint 3**: User preference system integration
- **Sprint 4**: Collaborative filtering and hybrid models
- **Sprint 5**: Feedback loop and model retraining
- **Sprint 6**: Deployment and frontend integration
