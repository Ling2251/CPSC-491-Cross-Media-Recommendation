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
