# AI session notes — decision & correction log

Maintained by the agent during implementation. Every correction, rejection, or redirection from the
engineer is logged here in substance. Entries are chronological.

---

## Plan gate approved as written

Phase: 0 (planning)
What you proposed/generated: Full plan (folder tree, dependency budget check, per-phase time estimates,
ten points of disagreement/decisions: built-in `no-restricted-imports` instead of `eslint-plugin-import`;
Jest for API + Vitest for web/shared; Zod pipe + docs-only `@ApiProperty` classes instead of class-validator;
CQRS kept as specified despite mild proportionality concern; password verification via hasher port in the
handler, not the aggregate; single active session per user; SHA-256 for refresh-token hashes; `/api`
proxied through the web origin in dev and Docker; stateless access tokens with no denylist; `main` gets one
empty root commit, all work on `feat/identity-auth-module`).
What I changed or rejected (if anything): Nothing. Approved as written.
Why: —
Files affected: `/home/ign-bgp6fn3/.claude/plans/pasted-content-id-615f-full-stack-vast-puffin.md`

---

## Per-phase review stops removed

Phase: 1 → 2 transition
What you proposed/generated: Phase 1 ended green and I stopped for review, per the working agreement
("build in phases, each ending green, then stop for my review").
What I changed or rejected (if anything): Instruction: "go to finish the all implementation and testing" —
continue through Phases 2, 3 and 4 without stopping between them.
Why: Engineer's call on delivery speed; the final report still covers every Definition-of-Done item.
Files affected: process only.

---

## NestJS pinned to the 11.x line

Phase: 2
What you proposed/generated: `npm install @nestjs/*` resolved to NestJS 12.3, which ships as ESM-only
(`"type": "module"` in `@nestjs/common/package.json`). Typecheck failed with TS1479 on every Nest import
because the API is a CommonJS package.
What I changed or rejected (if anything): Agent decision, not an engineer correction: pinned
`@nestjs/{common,core,platform-express,cqrs,mongoose,jwt,swagger}@11`, `@nestjs/config@4`, `nestjs-pino@4`
(CommonJS line) and did a clean reinstall so a single Nest version exists in the tree.
Why: Going ESM would force Jest into `--experimental-vm-modules` mode, `.js` import suffixes everywhere and
ts-jest ESM transforms: cost without benefit for a 4-hour deliverable. Nest 11 is the widely deployed line.
Also: TypeScript pinned to `~6.0.3` (npm default was 7.0.2, unsupported by typescript-eslint and ts-jest).
Files affected: `apps/api/package.json`, root `package.json`, `package-lock.json`, `apps/api/tsconfig.json`.

---

## Mongoose pinned to 8.x after Jest-only connection failure

Phase: 2
What you proposed/generated: Mongoose 9.11 (npm default). The app booted fine under ts-node, but inside
Jest every `MongooseModule` connection hung. Bisected with a probe spec: raw `MongoClient` connected,
`mongoose.connect` failed with `Missing required sub-document 'driver' in the client metadata document`
(handshake metadata lost across Jest's VM realm; two `mongodb` driver copies, 7.5 and 7.7, were present).
What I changed or rejected (if anything): Agent decision: pinned `mongoose@8` (driver 6.x), `npm dedupe`
so one copy exists. Added a top-level Jest `testTimeout`, lazy `import('../src/app.module')` in the e2e
harness because `ConfigModule.forRoot({ validate })` validates at import time, and a fresh
`X-Forwarded-For` per e2e request so the per-IP auth throttle (itself under test) does not trip the suite.
Why: unblocks e2e on `mongodb-memory-server` without changing the test runner.
Files affected: `apps/api/package.json`, `apps/api/jest.config.ts`, `apps/api/test/setup-e2e.ts`,
`apps/api/test/auth.e2e-spec.ts`.

---

## `tsx` replaced by `ts-node` for the API dev script

Phase: 2
What you proposed/generated: `tsx watch src/main.ts` as the dev runner.
What I changed or rejected (if anything): Agent decision: `node --watch -r ts-node/register src/main.ts`.
Why: esbuild (tsx) does not emit decorator metadata, so Nest DI and `@Prop()` type inference fail at
runtime. Also typed every `@Prop` explicitly, which is more robust regardless of transpiler.
Files affected: `apps/api/package.json`, `apps/api/src/modules/identity/infrastructure/persistence/user.schema.ts`.

---

## Web bundles `@app/shared` from source

Phase: 3
What you proposed/generated: Web importing the CommonJS `dist` of `packages/shared` (same as the API).
What I changed or rejected (if anything): Agent decision: Vite `resolve.alias` to `packages/shared/src/index.ts`.
Why: CJS prevented tree-shaking of Zod: bundle went from 853 kB to 443 kB (215 → 142 kB gzip). Types still
come from `dist`, so `npm ci` (postinstall build) remains the only prerequisite.
Files affected: `apps/web/vite.config.ts`.

---

## `COOKIE_SECURE` override added for the Compose demo

Phase: 4
What you proposed/generated: `Secure` on the refresh cookie derived only from `NODE_ENV === 'production'`.
What I changed or rejected (if anything): Agent decision: optional `COOKIE_SECURE` env (defaults to the
production rule) so `docker compose up` on plain `http://localhost:8080` works in production mode.
Why: one-command startup is a stated requirement; weakening it only via an explicit, documented flag.
Files affected: `apps/api/src/shared/config/env.schema.ts`, `.../features/common/refresh-cookie.service.ts`,
`docker-compose.yml`, `apps/api/.env.example`.
