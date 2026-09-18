# CPSC-491-Cross-Media-Recommendation

A cross-media recommendation website. By investigating the relationship between
users and other forms of media, this project seeks to provide users with
genuine recommendations without the entrapment of modern engagement algorithms.

## Repository structure

```
.
├── CSPC 491 Multimedia Recommendation website/
│   ├── src/          React app: Friend Suggestions, Media Tagging, and shared models
│   ├── frontend/     Separate React app: user signup flow
│   └── backend/      Node/Express API for the frontend/ signup app
├── ai-backend/       Python/Flask recommendation service
├── database/         PostgreSQL schema, migrations, seed data, and CRUD scripts
└── README.md
```

This repo currently holds a few parallel efforts from different feature teams that
haven't been fully consolidated yet — see each subfolder's own README for what it
covers. `database/` is shared, cross-team infrastructure: the `media`, `tag_taxonomy`,
and `media_tags` tables it defines are meant to be consumed by whichever backend(s)
end up serving the frontend.

Design artifacts (database structure docs, ER diagrams, React component/data-flow
plans, UI mockups) live in Google Docs; this repository holds what has actually
been implemented. Sprint planning and progress are tracked in Jira.

## Getting started

### Database

See [`database/README.md`](database/README.md) for schema setup instructions,
and [`database/scripts/`](database/scripts) for the CRUD layer, migration
runner, demo, and automated constraint tests.

### Main React app (Friend Suggestions, Media Tagging)

```bash
npm install
npm run dev
```

This runs Vite against `CSPC 491 Multimedia Recommendation website/`. Routes:
`/friends` (Friend Suggestions) and `/media` (Media Tagging preview).

### Signup app

```bash
cd "CSPC 491 Multimedia Recommendation website/frontend"
npm install
npm run dev
```

### Node/Express backend (signup app)

```bash
cd "CSPC 491 Multimedia Recommendation website/backend"
npm install
node server.js
```

### AI recommendation backend

See [`ai-backend/README.md`](ai-backend/README.md).
