# Sprint 1: AI Recommendation Backend

A FastAPI-based foundation for the AI Recommendation System. This sprint focuses on data generation, validation, and a simple top-N baseline recommender.

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
│   ├── models.py            # Pydantic data models
│   └── services/
│       ├── generator.py     # Dummy data generation
│       ├── validator.py     # Data validation
│       └── recommender.py   # Baseline recommendation logic
├── tests/
│   ├── __init__.py
│   ├── test_generator.py    # Tests for data generation
│   ├── test_validator.py    # Tests for data validation
│   └── test_recommender.py  # Tests for recommendation logic
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

## Future Sprints

- **Sprint 2**: Data collection from public sources
- **Sprint 3**: User preference system integration
- **Sprint 4**: Collaborative filtering and hybrid models
- **Sprint 5**: Feedback loop and model retraining
- **Sprint 6**: Deployment and frontend integration
