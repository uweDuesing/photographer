# TypeScript Koa API — Design

**Date:** 2026-07-17
**Status:** Approved

## Goal

Stand up a minimal TypeScript Koa API in the `photographer` repo with a single hello world route, structured so that later routes have an obvious place to go.

## Context

The repo contains only a `package.json` (name `photographer`, "Personal Website Portfolio", `"type": "commonjs"`, no dependencies). There is no source code, no tooling, and no git history. Node 26 and npm 11 are installed locally.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Location | Repo root (`src/`) | No frontend exists yet; a subfolder split can happen if and when one arrives. |
| TypeScript runtime | Native Node type stripping | Node 26 runs `.ts` directly. No build step, no `dist/`, no `tsx`/`ts-node` dependency. |
| Module system | ESM (`"type": "module"`) | Correct default for a new project; the existing `package.json` has no code depending on commonjs. |
| Routing | `@koa/router` | A real API needs routing almost immediately; the hello route then models the shape all later routes follow. |
| Tests | `node:test` + `supertest` | Built-in runner avoids a Jest/Vitest dependency; establishes the test pattern while the surface is one route. |
| Error handling | Koa defaults only | Nothing can fail yet. Custom error middleware is a decision for the first fallible route. |

## Architecture

Three source files, each with a single responsibility:

- **`src/app.ts`** — constructs the Koa app, mounts the router, exports the app **without** calling `listen`. This separation exists so tests can bind the app to an ephemeral port.
- **`src/routes/hello.ts`** — a `@koa/router` instance defining `GET /`, which sets `ctx.body` to `{ message: "Hello, world!" }`.
- **`src/index.ts`** — entry point. Imports the app, reads `PORT` from the environment (default `3000`), calls `listen`.

### Data flow

Request → Koa → router matches `GET /` → handler assigns an object to `ctx.body` → Koa serializes it to JSON and sets `Content-Type: application/json` automatically.

### Interfaces

- `app.ts` exports a configured `Koa` instance. Consumers (entry point, tests) decide how to listen.
- `routes/hello.ts` exports a `Router` instance. `app.ts` mounts it and knows nothing of its internals.

## Configuration

`tsconfig.json` targets typechecking only (`noEmit`), with:

- `verbatimModuleSyntax` — import syntax must survive stripping unchanged.
- `erasableSyntaxOnly` — the compiler rejects syntax Node cannot strip (enums, parameter properties), so violations surface at typecheck rather than at runtime.
- `strict` — on.

## Documentation

`README.md` at the repo root, covering:

- **What this is** — one line.
- **Requirements** — Node 26+ (native TypeScript type stripping is required; the project will not run on older Node without a build step).
- **Setup** — `npm install`.
- **Build** — states plainly that there is no build step and why: Node executes the TypeScript directly. The nearest equivalent is `npm run typecheck`, which validates types without emitting output. This section exists specifically to answer the reader who came looking for `npm run build`.
- **Run** — `npm run dev` for watch mode, `npm start` for a plain run; note `PORT` (default `3000`).
- **Test** — `npm test`.
- **Routes** — a table with the single `GET /` route and its response body.

## Testing

`test/hello.test.ts` — `node:test` + `supertest` asserting `GET /` returns:

- status `200`
- a JSON content type
- body `{ message: "Hello, world!" }`

## Scripts

| Script | Command |
|---|---|
| `dev` | `node --watch src/index.ts` |
| `start` | `node src/index.ts` |
| `typecheck` | `tsc --noEmit` |
| `test` | `node --test` |

## Dependencies

- **Runtime:** `koa`, `@koa/router`
- **Dev:** `typescript`, `supertest`, `@types/koa`, `@types/koa__router`, `@types/node`, `@types/supertest`

## Out of scope

Error-handling middleware, logging, CORS, config management, health checks, database access, a frontend, and deployment. Each waits for a concrete need.

## Success criteria

1. `npm run dev` serves `GET /` returning the hello JSON.
2. `npm test` passes.
3. `npm run typecheck` is clean.
4. Every command the README lists has been run and works as documented.
