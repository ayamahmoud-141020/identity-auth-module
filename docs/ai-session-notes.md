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
