# CPSC-491-Cross-Media-Recommendation

A cross-media recommendation website exploring the relationship between users
and other forms of social media.

## Run Friend Suggestions

Install the frontend dependencies and the Python API dependencies once:

```sh
npm install --prefix frontend
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

On Windows, use `backend\.venv\Scripts\python.exe` in place of
`backend/.venv/bin/python` in the install command.

Start the frontend and friend recommendation API together from the repository
root:

```sh
npm run dev:friends
```

Open the frontend URL printed by Vite (normally
`http://localhost:5173`) and visit **Friend Suggestions**. Without logging in,
the page uses the API's sample demo recommendations, so PostgreSQL is not
required. Press `Ctrl+C` to stop both services.

The launcher uses `backend/.venv` automatically when present. To use another
Python environment, set `PYTHON` to its Python executable before running the
command.
