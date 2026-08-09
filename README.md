# Online Writing Platform

A TypeScript modular-monolith writing and reading platform built with Express, PostgreSQL/Prisma, React and Vite.

## Architecture

The project intentionally remains a **modular monolith**. Product capabilities are separated into backend modules with API, application, domain-policy and infrastructure layers where those boundaries reduce coupling. The database remains the transaction boundary; no Redis, queue, search cluster or microservice is required for the current product scale.

Important backend modules include:

- `auth`, `users`, `preferences` — identity, sessions, account lifecycle and reader preferences.
- `stories` — story/chapter lifecycle, publication policies and optimistic chapter editing.
- `social`, `interactions` — follow/block/mute, votes and comments.
- `library` — library, reading progress and public/private reading lists.
- `notifications` — deduplicated, preference-aware notifications.
- `discovery`, `feed`, `search` — bounded discovery and deterministic heuristic ranking.
- `moderation` — reports, role-protected actions and audit records.
- `analytics` — unique chapter reads and author-facing aggregate metrics.
- `media` — validated image uploads behind local/S3 storage providers.

The React application consumes `/api/v1`, keeps short-lived access tokens in memory, and uses the HttpOnly refresh-cookie flow already implemented by the backend. Public story/reader/profile routes are shareable; writer, library, settings, analytics and moderation routes are protected.

## Prerequisites

- Node.js `>=20.19`
- npm
- PostgreSQL 17 (the local Compose file provides it)
- Docker/Compose only if you want containerized PostgreSQL or production images

## Local setup

```bash
docker compose up -d database

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

npm --prefix backend install
npm --prefix frontend install

npm --prefix backend run prisma:deploy
npm --prefix backend run prisma:seed

npm run dev
```

The default frontend is `http://localhost:5173`; the default API is `http://localhost:5000`.

## Environment

`backend/.env.example` is authoritative. Production requires strong access/refresh-token secrets, an explicit client origin, a public API URL, a real mail transport, and secure cookies. Media can use:

- `MEDIA_PROVIDER=local` for a single-host deployment with a persistent media volume.
- `MEDIA_PROVIDER=s3` with an S3-compatible bucket. Objects may stay private because media is served through an authorization-aware application route.

No real credentials belong in Git.

## Database and migrations

Prisma migrations are forward-only. Never use a force reset for a deployed database.

```bash
npm --prefix backend run prisma:validate
npm --prefix backend run prisma:deploy
```

For schema changes in development, create a new migration with the existing Prisma workflow; do not rewrite already deployed migrations.

## Quality gates

Run the complete repository gate:

```bash
npm run check
```

It runs Prisma validation, TypeScript checks, ESLint, backend policy/concurrency tests, frontend tests and production builds.

Useful narrower commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Production build

```bash
npm --prefix backend run build
npm --prefix frontend run build
npm --prefix backend run prisma:deploy
npm --prefix backend run start
```

`backend/Dockerfile` has separate build, migration and slim runtime targets. `frontend/Dockerfile` serves the Vite build through nginx with SPA fallback.

A containerized reference deployment is provided in `docker-compose.production.yml`. Supply production environment values rather than committing them.

## Health and operations

- `GET /health/live` — process liveness; no database dependency.
- `GET /health/ready` — readiness including database connectivity.
- Requests receive/propagate `X-Request-Id`.
- Production errors do not expose stack traces or database internals.
- Sensitive auth tokens and passwords are not logged.
- Startup configuration validation fails fast for invalid production settings.

To promote a user to moderator/admin:

```bash
npm --prefix backend run admin:set-role -- --username <username> --role MODERATOR
```

Use privileged roles sparingly and audit moderation actions.

## Security model

The server is authoritative for ownership, publication state, mature-content access, block relationships and privileged actions. Access tokens travel in `Authorization`; refresh tokens remain HttpOnly cookies with production `Secure` and `SameSite=Lax`. Sensitive endpoints are rate-limited. Votes/follows/library memberships rely on uniqueness/idempotency constraints; chapter autosave uses an explicit version precondition and returns `409 CHAPTER_EDIT_CONFLICT` rather than overwriting a newer edit.

Uploads accept only bounded JPEG/PNG images whose magic bytes and dimensions are validated. The application never exposes local filesystem paths.

## Recommendation model

Discovery deliberately uses an explainable heuristic rather than pretending random order is machine learning. Followed authors, genre/tag affinity, library/reading behavior, engagement and recency contribute to a deterministic score. The ranking is isolated behind the discovery store/service boundary so a different ranker can replace it later.

## Monetization

No payment processor is fabricated. `MONETIZATION_ENABLED=false` and
`ENTITLEMENT_PROVIDER=disabled` are the safe defaults. The backend exposes an
entitlement boundary at `GET /api/v1/entitlements/me`, but startup rejects an
attempt to enable monetization while the provider is still `disabled`. A real
payment/entitlement provider and explicit product/legal rules must be added
before paid content can be enabled.
