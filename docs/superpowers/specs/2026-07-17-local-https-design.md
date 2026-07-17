# Local HTTPS — Design

**Date:** 2026-07-17
**Status:** Approved

## Goal

Serve the `photographer` API over HTTPS during local development, using a self-signed certificate
generated on the developer's machine.

## Context

The API currently listens over plain HTTP (`src/index.ts` calls `app.listen`). The
[Koa API design](2026-07-17-koa-api-design.md) placed deployment out of scope; this document covers
local development only. A real deployment with CA-issued certificates is a separate decision.

`openssl` is available locally; `mkcert` is not installed.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Local development only | No deployment target exists yet. Production certificate management is a decision for when one does. |
| Certificate source | `openssl` self-signed | Already installed; no new tooling. The cost is browser warnings and `curl -k`, which is acceptable for a dev-only API. |
| Startup mode | HTTPS only | One code path. A fallback to HTTP would make the active transport ambiguous — the server could appear to be on TLS when it is not. |
| Missing certificates | Fail loudly | Exit non-zero with a message naming the missing file and the command that creates it. Never downgrade silently. |
| TLS placement | `src/index.ts` + `src/tls.ts` | TLS is a transport concern. `app.ts` stays transport-agnostic, so tests continue to bind via `app.callback()`. |
| Port | `PORT`, default `3000` | Unchanged from the existing design. The scheme changes; the port convention does not. |

## Architecture

TLS is confined to the entry point and one new module. `src/app.ts` and `src/routes/hello.ts` are
unchanged.

- **`src/tls.ts`** — exports `loadTlsCredentials()`, which reads the key/certificate pair from
  `certs/` and returns `{ key, cert }`. If either file is missing, it throws an error naming the
  missing path and instructing the reader to run `npm run certs`. This is a module rather than
  inline code because it holds the only branching logic in the change, which makes it the only part
  worth testing directly.
- **`src/index.ts`** — calls `loadTlsCredentials()`, passes the result to
  `https.createServer(credentials, app.callback())`, and listens on `PORT`. A credential-loading
  failure propagates, so the process exits non-zero with the actionable message.
- **`scripts/generate-certs.sh`** — wrapped as `npm run certs`. Invokes `openssl` to write
  `certs/localhost-key.pem` and `certs/localhost-cert.pem`.

### Data flow

HTTPS request → Node TLS termination → `app.callback()` → Koa → router → handler. Everything above
the TLS layer is identical to the HTTP design.

### Interfaces

- `tls.ts` exports `loadTlsCredentials()`. Callers receive credentials or an actionable error; they
  know nothing of file layout.
- `app.ts` still exports a configured Koa instance and remains unaware of the transport.

## Certificates

`scripts/generate-certs.sh` generates a self-signed certificate valid for 365 days, with
`subjectAltName` covering `DNS:localhost` and `IP:127.0.0.1`. The SAN is required: modern clients
reject certificates that identify the host only via CN.

Certificates live in `certs/`, which is gitignored. Keys are never committed. Each developer
generates their own.

## Configuration

No new environment variables. `PORT` retains its meaning and its `3000` default.

## Documentation

`README.md` is updated to cover:

- **Requirements** — adds `openssl`.
- **Setup** — adds `npm run certs`, and states that the server will not start without it.
- **Run** — the URL is now `https://localhost:3000`; `curl` needs `-k` and browsers show a warning
  interstitial, because the certificate is self-signed.

## Testing

`test/tls.test.ts` covers `loadTlsCredentials()`:

- missing certificate files produce an error whose message mentions `npm run certs`
- present files return their contents

These tests use temporary files with placeholder contents. They exercise file loading and error
handling, not cryptography, so they neither require `openssl` nor perform a TLS handshake — keeping
them fast and deterministic.

`test/hello.test.ts` is unchanged and still passes: supertest binds to `app.callback()`, which is
transport-agnostic.

The TLS handshake itself is verified manually against a live server with `curl -k`.

## Out of scope

CA-issued certificates, production deployment, HTTP-to-HTTPS redirects, HSTS, certificate renewal,
and mkcert. Swapping to mkcert later would change only `scripts/generate-certs.sh`, not application
code.

## Success criteria

1. `npm run certs` produces a key/certificate pair in `certs/`.
2. `npm start` and `npm run dev` serve `GET /` over HTTPS, returning the hello JSON.
3. Starting without certificates exits non-zero with a message naming the missing file and
   `npm run certs`.
4. `npm test` passes and `npm run typecheck` is clean.
5. `certs/` is ignored by git.