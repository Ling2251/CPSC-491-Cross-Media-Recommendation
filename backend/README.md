# CPSC 491 Backend API

Cross-media recommendation system backend built with Flask and SQLAlchemy.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Update `.env` with your configuration.

4. Start the development server:
```bash
python app.py
```

## API Endpoints

### Users
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/preferences` - Update user preferences (authenticated)

### Media
- `GET /api/media` - Get all media with filtering and pagination
- `GET /api/media/:id` - Get specific media
- `POST /api/media` - Create new media (authenticated)
- `POST /api/media/:id/rate` - Rate media (authenticated)

### Recommendations
- `GET /api/recommendations` - Get user recommendations (authenticated)
- `POST /api/recommendations/generate` - Generate new recommendations (authenticated)
- `DELETE /api/recommendations/:id` - Delete a recommendation (authenticated)

## Architecture

- **Framework**: Flask with SQLAlchemy ORM
- **Models**: User, Media, Rating, WatchHistory, Recommendation
- **Authentication**: JWT tokens
- **Database**: SQLite (default) or PostgreSQL/MySQL
- **API**: RESTful endpoints with JSON
