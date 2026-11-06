# Frontend

This React application is built with Vite. From this directory, run
`npm install` to install dependencies and `npm run dev` to start the development
server.

Friend Suggestions uses the authenticated Node API at `http://localhost:3001`
for friend requests and the Python FastAPI backend at `http://localhost:8000`
for ranked recommendations. Set `VITE_API_URL` or
`VITE_RECOMMENDATION_API_URL` to override these addresses. Both backends must use
the same `JWT_SECRET`. Start the Python API from `backend/` with
`uvicorn app.friend_recommendation.http_app:app --reload`.

See [TESTING.md](./TESTING.md) for automated checks and Friend Suggestions UI
validation notes.
