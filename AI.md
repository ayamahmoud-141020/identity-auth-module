# AI Usage

## Summary

AI was used as a force multiplier across the whole task: shaping the engineering prompt, scaffolding,
boilerplate, validation logic, test generation, Docker/CI, and documentation. Architecture, security
model, scope control, dependency budget, and final review were mine. Every generated change was
reviewed before commit, and every decision or correction made during the session was logged as it
happened in [`docs/ai-session-notes.md`](docs/ai-session-notes.md), which is the source for this file.

**Tools**

- Claude (chat): designing the engineering prompt and architecture constraints before any code existed.
- Claude Code (agentic, Fable 5.1): implementation inside the repository, on a feature branch, with
  small conventional commits.

## How I worked

1. **Prompt as a specification.** Before any code, I wrote a prompt that fixed the architecture
   (one bounded context, vertical slices, CQRS on a single database), the security model, an explicit
   dependency budget, an explicit out-of-scope list, per-phase time budgets, and a pass/fail definition
   of done with a verification command per item.
2. **Plan gate.** The agent had to present the folder tree, the dependency list checked against the
   budget, time estimates, and every point of disagreement, then stop. I approved the plan as written;
   nothing was scaffolded before that.
3. **Phased delivery, each phase ending green.** Phase 1 (tooling, shared schemas, architecture lint
   rule) ended with a review stop. I then lifted the remaining stops and let the agent run Phases 2 to 4
   end to end, because the definition of done already made the final state verifiable.
4. **Feature branch only.** All work landed on `feat/identity-auth-module` as 17 conventional commits.
   I pushed the branch and opened the pull request myself.
5. **Correction log.** The agent recorded every decision and redirect in `docs/ai-session-notes.md`
   using a fixed template (what was proposed, what changed, why, files affected).

## What was AI-assisted vs. owned by me

| Area                                                                                                      | AI role                                    | My role                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Architecture (DDD, vertical slices, CQRS)                                                                 | Implemented the structure                  | Chose and scoped it; required the dependency rule to be enforced by lint                           |
| Security model (argon2id, token rotation, httpOnly cookie, enumeration, unique-index duplicate detection) | Implemented                                | Specified every decision up front                                                                  |
| Monorepo, tooling, Docker, CI                                                                             | Generated                                  | Reviewed; approved version pins                                                                    |
| Shared Zod schemas and value objects                                                                      | Generated                                  | Defined the rules and the boundary cases (7 vs 8 chars, missing special char, email normalization) |
| Feature slices, handlers, controllers                                                                     | Generated                                  | Reviewed each slice                                                                                |
| Frontend forms, auth context, API client                                                                  | Generated                                  | Reviewed the refresh/queue logic closely                                                           |
| Tests                                                                                                     | Generated most cases                       | Required the critical ones: concurrent duplicate sign-up, token reuse, generic sign-in error       |
| README                                                                                                    | Drafted                                    | Edited the architecture and trade-offs section                                                     |
| AI.md                                                                                                     | Drafted from the session log at my request | Reviewed and approved                                                                              |

## Prompts and approaches that worked well

- **An explicit out-of-scope list.** Naming what not to build (Redis, Passport, event sourcing,
  a separate read model, a generic base repository, a UI component library) was far more effective
  than "keep it simple". The final dependency list contains nothing outside the budget.
- **A dependency budget with approval for exceptions.** The agent proposed `nestjs-zod` as a possible
  exception and defaulted to not adding it; it also dropped `class-validator`, `passport`, and
  `@nestjs/cli` in favour of a 25-line Zod pipe and plain `tsc`.
- **"Plan first, then stop."** The plan surfaced ten concrete points of disagreement before a single
  file existed (see below), which is where disagreements are cheapest to settle.
- **A definition of done with a verification command per item.** It turned "it works" into a table
  of commands and test names, and it is what caught the issues listed in the next section.
- **"Read the installed package's types instead of guessing."** The agent read `node_modules`
  type definitions for `@nestjs/throttler`, `@nestjs/cqrs`, `nestjs-pino`, `argon2`, and Zod 4 before
  using them, and cited the files. Two version-specific API differences were caught this way
  (Zod 4 deprecating `.email()` on strings; argon2's `HashOptions` type name).
- **Architecture enforced by tooling.** A single ESLint `no-restricted-imports` rule scoped to
  `modules/*/domain/**` forbids framework, infrastructure, feature, and app-level imports. The agent
  proved it fires with a throwaway fixture before deleting the fixture.

## Where AI output needed correction

All of the following were caught by the verification steps the prompt required (typecheck, tests,
`docker compose up`), fixed during the session, and logged. None reached the pull request.

### NestJS 12 resolved by default is ESM-only

- **What AI produced:** `npm install @nestjs/*` without a major version, which resolved to Nest 12.
- **Why it was a problem:** Nest 12 ships as ESM-only. The API is CommonJS, so every Nest import
  failed typecheck (TS1479), and going ESM would have pushed Jest/ts-jest into experimental ESM mode.
- **Resolution:** Pinned the Nest 11 line and did a clean reinstall so a single Nest version exists
  in the tree. TypeScript was pinned to 6.0 for the same reason (npm's default 7.x is unsupported by
  typescript-eslint and ts-jest).
- **Where:** `apps/api/package.json`, root `package-lock.json`.

### Mongoose 9 could not connect inside Jest

- **What AI produced:** Mongoose 9.11 (npm default). The app booted correctly under ts-node, but
  every e2e test hung at module compilation.
- **Why it was a problem:** Bisected with a probe spec: the raw MongoDB driver connected, Mongoose
  failed with `Missing required sub-document 'driver' in the client metadata document`, a handshake
  problem specific to Jest's VM sandbox, aggravated by two `mongodb` driver copies in the tree.
- **Resolution:** Pinned Mongoose 8 (driver 6.x) and deduplicated. The e2e suite then ran in about
  two seconds against `mongodb-memory-server`.
- **Where:** `apps/api/package.json`, `apps/api/test/setup-e2e.ts`.

### Dev runner could not start Nest

- **What AI produced:** `tsx watch src/main.ts` as the development script.
- **Why it was a problem:** esbuild does not emit decorator metadata, so Nest dependency injection
  and `@Prop()` type inference fail at runtime.
- **Resolution:** `node --watch -r ts-node/register src/main.ts`; every `@Prop` was also given an
  explicit type, which is more robust regardless of transpiler.
- **Where:** `apps/api/package.json`, `infrastructure/persistence/user.schema.ts`.

### The rate limiter correctly broke the e2e suite

- **What AI produced:** An e2e suite in which every request came from the same client IP.
- **Why it was a problem:** The per-IP limit on sign-up and sign-in (10/min) is itself a requirement
  and is under test, so the suite's own sign-ups tripped it and eight tests returned 429.
- **Resolution:** Each helper call sends a fresh `X-Forwarded-For` (`TRUST_PROXY=true` in tests), and
  the rate-limit test pins a single IP. This confirmed the limiter and the proxy trust setting work.
- **Where:** `apps/api/test/auth.e2e-spec.ts`.

### Config validation ran before the test harness set the environment

- **What AI produced:** A static import of `AppModule` in the e2e harness.
- **Why it was a problem:** `ConfigModule.forRoot({ validate })` validates `process.env` at import
  time, so the Zod env schema rejected the (not yet set) test environment.
- **Resolution:** The harness imports `AppModule` after assigning the environment.
- **Where:** `apps/api/test/setup-e2e.ts`.

### Compose assumed port 8080 was free

- **What AI produced:** A fixed `8080:80` mapping for the web container.
- **Why it was a problem:** `docker compose up` failed on a machine with a host nginx on 8080.
- **Resolution:** `WEB_PORT` variable (default 8080) used for both the port mapping and `WEB_ORIGIN`;
  documented in the README. The full stack was then smoke-tested through nginx: health, sign-up 201,
  `/users/me` 200 and 401, refresh 200, token reuse 401, duplicate email 409, validation 400.
- **Where:** `docker-compose.yml`, `README.md`.

Two further changes were made by the agent on its own initiative after measuring, and accepted:
the web app bundles `packages/shared` from its ESM source through a Vite alias (bundle 853 kB to
443 kB, because the CommonJS build prevented Zod from tree-shaking), and an optional `COOKIE_SECURE`
flag was added so the production-mode Compose demo works over plain `http://localhost`.

## Decisions I made differently from AI suggestions

- **Architecture depth.** The conventional AI-proposed shape for this task is controller → service →
  repository. I chose DDD with vertical slices and CQRS instead, because each use case becomes
  independently readable, testable, and removable, a structure that has paid off for me when codebases
  grow and features move between services. I then constrained it to stay proportionate: one bounded
  context, same database for reads and writes, no event sourcing, and a single logging handler as the
  only consumer of the domain event. The agent flagged CQRS as mildly heavy for four commands and one
  query; I kept it, for the reasons above.
- **One source of truth for validation.** Rather than separate validation in the frontend (form
  schemas) and backend (class-validator DTOs), the rules live in a shared Zod package used by the web
  forms, the API request pipe, and the domain value objects as a second line of defence. Swagger DTO
  classes are documentation only and reference the same constants.
- **Token storage.** Access token in memory and refresh token in an `httpOnly`, `SameSite=Strict`
  cookie with rotation and reuse detection, instead of the simpler but weaker "JWT in localStorage".
- **Duplicate email detection.** Unique index plus translation of Mongo error 11000, never a
  pre-check, because a pre-check alone is a race. Covered by a concurrent e2e test.
- **Points where I accepted the agent's counter-proposal at the plan gate:** the built-in ESLint
  `no-restricted-imports` rule instead of `eslint-plugin-import`; Jest for the API and Vitest for web
  and shared, because Nest's decorator metadata does not survive esbuild without extra plugins;
  SHA-256 rather than argon2 for the refresh-token hash, since the token is already high-entropy; one
  active session per user; and a refresh cookie path of `/api/v1/auth` instead of the refresh route
  alone so sign-out can read it.

## What I would do with more time

- Email verification and password reset flows.
- Session and device management (list and revoke) on top of the existing rotation logic.
- Per-account lockout or progressive delay in addition to IP-based throttling.
- An outbox pattern if domain events start driving side effects beyond logging.
- Playwright end-to-end tests across web and API.
