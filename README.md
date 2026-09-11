# CPSC-491-Cross-Media-Recommendation

A cross-media recommendation website. By investigating the relationship between
users and other forms of media, this project seeks to provide users with
genuine recommendations without the entrapment of modern engagement algorithms.

## Repository structure

```
.
├── frontend/    React + TypeScript + Vite app
├── backend/     API (not started yet — planned for a later sprint)
├── database/    PostgreSQL schema, migrations, and seed data
└── README.md
```

Design artifacts (database structure docs, ER diagrams, React component/data-flow
plans, UI mockups) live in Google Docs; this repository holds what has actually
been implemented. Sprint planning and progress are tracked in Jira.

## Getting started

### Database

See [`database/README.md`](database/README.md) for schema setup instructions.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Run the test suite:

```bash
cd frontend
npm run test
```

### Backend

Not implemented yet — see [`backend/README.md`](backend/README.md).
