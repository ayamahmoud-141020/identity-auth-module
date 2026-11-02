# Identity module — NestJS + MongoDB API, React web client

Sign-up, sign-in, session refresh, sign-out and a protected profile endpoint, built as one bounded
context (`identity`) with a pragmatic DDD / vertical-slice / CQRS structure and a single shared
validation contract used by the web forms, the API and the domain.

| Workspace         | Stack                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| `apps/api`        | NestJS 11, Mongoose 8, `@nestjs/cqrs`, argon2id, JWT, nestjs-pino, Swagger |
| `apps/web`        | React 19, Vite, TypeScript, react-hook-form, Tailwind                      |
| `packages/shared` | Zod schemas, field-rule constants, API contract types                      |

## Prerequisites

- Node.js ≥ 22 and npm ≥ 10
- MongoDB ≥ 7 for local development (or Docker)
- Docker + Compose v2 for the one-command stack

## Quick start (local)

```bash
npm ci                                     # also builds packages/shared (postinstall)
cp apps/api/.env.example apps/api/.env     # edit MONGODB_URI and both JWT secrets
npm run dev:api                            # http://localhost:3000/api/v1  · Swagger: /api/docs
npm run dev:web                            # http://localhost:5173 (proxies /api to :3000)
```

## Quick start (Docker)

```bash
docker compose up --build
```

| URL                                 | What                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| http://localhost:8080               | web app (nginx, proxies `/api` to the API)                                                |
| http://localhost:3000/api/v1/health | API health                                                                                |
| http://localhost:3000/api/docs      | Swagger UI (disabled when `NODE_ENV=production`; the compose API runs in production mode) |

Compose ships demo JWT secrets so it starts with zero setup. For anything else, create a `.env` next
to `docker-compose.yml` with `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (≥ 32 chars, different).

## Environment variables (API)

Validated at boot with Zod; the process exits with a readable list of problems if anything is
missing or invalid. See `apps/api/.env.example`.

| Variable                                   | Default                 | Notes                                                                  |
| ------------------------------------------ | ----------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`                                 | `development`           | `development` enables pretty logs, Swagger and error messages for 500s |
| `PORT`                                     | `3000`                  |                                                                        |
| `MONGODB_URI`                              | —                       | required                                                               |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | —                       | required, ≥ 32 chars, must differ                                      |
| `ACCESS_TOKEN_TTL_SECONDS`                 | `900`                   | 15 min                                                                 |
| `REFRESH_TOKEN_TTL_SECONDS`                | `604800`                | 7 days                                                                 |
| `WEB_ORIGIN`                               | `http://localhost:5173` | CORS origin (credentials allowed)                                      |
| `TRUST_PROXY`                              | `false`                 | set `true` behind nginx/ingress so rate limiting sees the client IP    |
| `COOKIE_SECURE`                            | `true` in production    | `false` only for a plain-http demo behind a proxy                      |
| `THROTTLE_TTL_SECONDS` / `THROTTLE_LIMIT`  | `60` / `100`            | global per-IP limit; auth routes have stricter fixed limits            |
| `LOG_LEVEL`                                | `info`                  | pino level                                                             |

## Scripts

| Command                                                          | What                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `npm run lint` / `npm run format:check`                          | ESLint (type-aware, zero warnings) / Prettier          |
| `npm run typecheck`                                              | `tsc --noEmit` in every workspace                      |
| `npm test`                                                       | shared (Vitest) → API unit + e2e (Jest) → web (Vitest) |
| `npm run build`                                                  | shared → API (`tsc`) → web (`vite build`)              |
| `npm run test:unit -w @app/api` / `npm run test:e2e -w @app/api` | API projects separately                                |

The API e2e suite starts an in-memory MongoDB (`mongodb-memory-server`). The first run downloads a
Mongo binary; to reuse a locally installed server set `MONGOMS_SYSTEM_BINARY=/usr/bin/mongod`.

## API overview (`/api/v1`)

| Method & path                                    | Auth                                  | Success                                        | Errors                                            |
| ------------------------------------------------ | ------------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `POST /auth/sign-up` `{ email, name, password }` | —                                     | `201` `{ accessToken, user }` + refresh cookie | `400` validation · `409` email taken · `429`      |
| `POST /auth/sign-in` `{ email, password }`       | —                                     | `200` `{ accessToken, user }` + refresh cookie | `400` · `401` "Invalid email or password" · `429` |
| `POST /auth/refresh`                             | refresh cookie                        | `200` `{ accessToken, user }` + rotated cookie | `401` (cookie cleared)                            |
| `POST /auth/sign-out`                            | refresh cookie                        | `204`, cookie cleared                          | never fails                                       |
| `GET /users/me`                                  | `Authorization: Bearer <accessToken>` | `200` `{ id, email, name, createdAt }`         | `401` missing / invalid / expired                 |
| `GET /health`                                    | —                                     | `200` `{ status, mongo }`                      | `503`                                             |

Every error has one shape: `{ statusCode, error, message, path, timestamp, requestId, details? }`.
`details` carries per-field messages on `400`. Each response also returns an `x-request-id` header
that matches the log line.

Field rules (enforced in the web form, the request pipe, and the domain value objects, all from
`packages/shared`): email must be valid (trimmed, lower-cased); name ≥ 3 characters; password ≥ 8
characters with at least one letter, one number and one special character.

## Security model

- **Passwords**: argon2id (19 MiB, 2 iterations). The hash is `select: false` in Mongo and never
  serialized; responses are built from explicit mappers.
- **Access token**: JWT, 15 min, returned in the body and kept **in memory** on the client only
  (never localStorage / sessionStorage).
- **Refresh token**: JWT, 7 days, in an `httpOnly`, `SameSite=Strict`, `Secure` (prod) cookie
  scoped to `/api/v1/auth`. Only a SHA-256 hash of the current token is stored. Each refresh
  **rotates** the token; presenting an already-rotated token is treated as theft and **revokes the
  session**, so the newest token stops working too.
- **No user enumeration**: sign-in returns the same message for unknown email and wrong password,
  and always runs an argon2 verification (against a dummy hash when the user is unknown).
- **Duplicate email**: detected by the unique index (Mongo error `11000`), never by a pre-check,
  so concurrent sign-ups cannot both succeed (covered by an e2e test).
- **Transport**: `helmet`, CORS restricted to `WEB_ORIGIN` with credentials, per-IP throttling
  (global from env; `10/min` on sign-up and sign-in, `30/min` on refresh).
- **Logging**: request id per request; `authorization`, `cookie`, `set-cookie` and any `password`
  field are redacted. No stack traces leave the process outside `development`.
- **Config**: validated at boot; the app refuses to start with weak or missing secrets.

## Architecture & trade-offs

```
apps/api/src
├── shared/            cross-cutting kernel: config (Zod), logging (pino), http (filter, Zod pipe), health
└── modules/identity/
    ├── domain/        User aggregate, value objects, domain errors, ports — zero framework imports
    ├── features/      one folder per use case: command|query + handler + controller + request DTO + spec
    │   ├── sign-up/  sign-in/  refresh-session/  sign-out/        (commands: change state)
    │   ├── get-current-user/                                     (query: lean projection, protected)
    │   └── user-registered/                                      (the one event consumer: logs)
    └── infrastructure/
        ├── persistence/   Mongoose schema, mapper, MongoUserRepository (implements the port)
        └── security/      Argon2PasswordHasher, JwtTokenIssuer, JwtAuthGuard
```

**Why DDD + vertical slices + CQRS for a small module?** Each use case is independently readable,
testable and removable: deleting `refresh-session/` removes the feature. Business rules (rotation,
reuse detection, revocation, field invariants) live in the aggregate and value objects and are
tested without any mocks. Handlers orchestrate ports; controllers only translate HTTP. The
`domain/` dependency rule is **enforced by ESLint** (`no-restricted-imports` on `modules/*/domain/**`),
not just documented.

**Deliberately kept proportionate.** One bounded context. Commands and queries are separated but
share the same MongoDB; the query reads a lean projection instead of loading the aggregate. No event
sourcing, no message broker, no separate read store. One domain event with one logging handler, to
show the extension point without infrastructure.

**Deliberately left out** (would be next): email verification, password reset, multi-device
sessions (the aggregate holds one active session; sign-in replaces it), an access-token denylist
(sign-out kills the refresh token immediately; an issued access token stays valid up to 15 min),
account lockout per user in addition to per-IP throttling, roles/permissions, OAuth.

**Other decisions worth knowing**

- Validation lives once, in `packages/shared` (Zod). The API validates requests with a small
  `ZodValidationPipe` instead of class-validator; Swagger DTO classes are documentation only and
  reference the same constants. Value objects re-validate as defence in depth.
- Nest 11 (CommonJS) is pinned on purpose: Nest 12 is ESM-only and would push Jest/ts-jest into
  ESM mode for no functional gain here. Mongoose is pinned to 8.x because 9.x's connection handshake
  fails inside Jest's VM sandbox.
- Dev and Docker both serve the API under the web origin (`/api` proxy), so the refresh cookie is
  first-party and `SameSite=Strict` just works. CORS is configured anyway as defence in depth.
- Web: `react-hook-form` + the shared schema; a single in-flight refresh on `401` with queued
  retries; `ProtectedRoute` / `GuestRoute`; accessible forms (`aria-invalid`, `aria-describedby`,
  `role="alert"`, disabled submit while pending).

## Project layout

```
.
├── apps/api            NestJS API (see above)         ├── packages/shared   Zod rules, contracts
├── apps/web            React client                   ├── docs/             AI session notes
├── docker-compose.yml  mongo + api + web              ├── .github/workflows/ci.yml
└── AI.md               how AI was used (see submission notes)
```

## CI

GitHub Actions (`.github/workflows/ci.yml`): `npm ci` → lint → format check → typecheck → build →
tests for all workspaces, on every push and pull request.
