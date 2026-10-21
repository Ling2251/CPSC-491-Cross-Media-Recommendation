# Local Postgres environment matching the database-ci.yml service container,
# pre-loaded with the schema and seed data so a local run starts from the
# same state CI tests against.
#
# Build (from the repo root):
#   docker build -t cross-media-db -f database/Dockerfile database
# Run:
#   docker run --rm -p 5432:5432 cross-media-db
FROM postgres:16

ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=cross_media_recommendation

# Files in docker-entrypoint-initdb.d run once, in alphabetical order, the
# first time the container starts against an empty data directory. The
# migrations' numeric prefixes keep them in order, and seed_initial_tags.sql
# sorts after all of them (digits sort before letters), so it runs last.
COPY migrations/*.sql /docker-entrypoint-initdb.d/
COPY seed/seed_initial_tags.sql /docker-entrypoint-initdb.d/

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres || exit 1
