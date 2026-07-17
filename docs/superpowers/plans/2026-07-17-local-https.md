# Local HTTPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the existing Koa API over HTTPS in local development using a self-signed certificate, failing loudly when no certificate is present.

**Architecture:** TLS stays at the transport boundary. A new `src/tls.ts` loads the key/certificate pair and throws an actionable error when either file is missing; `src/index.ts` feeds those credentials to `https.createServer(..., app.callback())`. `src/app.ts` and `src/routes/hello.ts` are untouched, so existing tests keep binding via `app.callback()`.

**Tech Stack:** Node 26 (native TypeScript type stripping, no build step), Koa 3, `@koa/router`, `node:https`, `node:test` + supertest, `openssl` for certificate generation.

**Spec:** `docs/superpowers/specs/2026-07-17-local-https-design.md`

## Global Constraints

- Node 26+. The project runs `.ts` files directly via type stripping — there is no build step and no `dist/`.
- ESM only (`"type": "module"`). Relative imports MUST include the `.ts` extension (e.g. `./app.ts`) — Node requires it and `allowImportingTsExtensions` is enabled for tsc.
- `erasableSyntaxOnly` is on: no enums, no parameter properties, no other non-strippable syntax.
- `strict` is on. `npm run typecheck` must stay clean.
- Certificates live in `certs/` and are NEVER committed.
- Certificate paths: `certs/localhost-key.pem` (key), `certs/localhost-cert.pem` (certificate).
- `PORT` keeps its meaning and its `3000` default.
- Tests must not require `openssl` and must not perform a TLS handshake.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/tls.ts` | Create | Load key/cert from `certs/`; throw actionable error if missing. |
| `test/tls.test.ts` | Create | Cover `loadTlsCredentials()` success and missing-file error. |
| `scripts/generate-certs.sh` | Create | Generate the self-signed pair via `openssl`. |
| `src/index.ts` | Modify | Create an HTTPS server from the credentials and listen. |
| `package.json` | Modify | Add the `certs` script. |
| `.gitignore` | Modify | Ignore `certs/`. |
| `README.md` | Modify | Requirements, Setup, Run sections. |
| `src/app.ts`, `src/routes/hello.ts` | Unchanged | Transport-agnostic. |

---

### Task 1: `loadTlsCredentials()`

**Files:**
- Create: `src/tls.ts`
- Test: `test/tls.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `loadTlsCredentials(certsDir?: string): { key: Buffer; cert: Buffer }` — default export absent; named export. `certsDir` defaults to the `certs/` directory at the repo root. Throws an `Error` naming the path and `npm run certs` when a file is missing (ENOENT); any other read error (e.g. EACCES) propagates unchanged, so a permissions problem is never misreported as a missing certificate. Task 2 calls this.

- [ ] **Step 1: Write the failing test**

Create `test/tls.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTlsCredentials } from "../src/tls.ts";

test("loadTlsCredentials returns the key and certificate contents", async () => {
  const dir = await mkdtemp(join(tmpdir(), "certs-"));
  await writeFile(join(dir, "localhost-key.pem"), "KEY CONTENTS");
  await writeFile(join(dir, "localhost-cert.pem"), "CERT CONTENTS");

  const credentials = loadTlsCredentials(dir);

  assert.equal(credentials.key.toString(), "KEY CONTENTS");
  assert.equal(credentials.cert.toString(), "CERT CONTENTS");
});

test("loadTlsCredentials throws a message naming the missing file and the fix", async () => {
  const dir = await mkdtemp(join(tmpdir(), "certs-"));

  assert.throws(
    () => loadTlsCredentials(dir),
    (error: Error) => {
      assert.match(error.message, /localhost-key\.pem/);
      assert.match(error.message, /npm run certs/);
      return true;
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/tls.ts` (the module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/tls.ts`:

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const defaultCertsDir = fileURLToPath(new URL("../certs", import.meta.url));

export function loadTlsCredentials(certsDir: string = defaultCertsDir): {
  key: Buffer;
  cert: Buffer;
} {
  return {
    key: read(join(certsDir, "localhost-key.pem")),
    cert: read(join(certsDir, "localhost-cert.pem")),
  };
}

function read(path: string): Buffer {
  try {
    return readFileSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error(
      `TLS certificate not found at ${path}. Run \`npm run certs\` to generate one.`,
      { cause: error },
    );
  }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test`
Expected: PASS — 3 tests total (2 new, plus the existing hello test).

Run: `npm run typecheck`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add src/tls.ts test/tls.test.ts
git commit -m "feat: load TLS credentials with an actionable missing-cert error"
```

---

### Task 2: Certificate generation + HTTPS server

**Files:**
- Create: `scripts/generate-certs.sh`
- Modify: `src/index.ts` (whole file)
- Modify: `package.json` (scripts block)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `loadTlsCredentials()` from Task 1 (`src/tls.ts`).
- Produces: `npm run certs`; an HTTPS listener on `PORT`.

- [ ] **Step 1: Add the certificate script**

Create `scripts/generate-certs.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cert_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/certs"
mkdir -p "$cert_dir"

openssl req -x509 \
  -newkey rsa:2048 \
  -nodes \
  -keyout "$cert_dir/localhost-key.pem" \
  -out "$cert_dir/localhost-cert.pem" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificates written to $cert_dir"
```

Make it executable:

```bash
chmod +x scripts/generate-certs.sh
```

- [ ] **Step 2: Ignore `certs/` BEFORE generating anything**

Add to `.gitignore`, under the `# Dependencies` block:

```
# Certificates (generated locally, never committed)
certs/
```

Do this before Step 4 so a generated private key can never be staged.

- [ ] **Step 3: Add the `certs` script to `package.json`**

In the `scripts` block, add:

```json
"certs": "./scripts/generate-certs.sh",
```

- [ ] **Step 4: Generate the certificates and verify git ignores them**

Run: `npm run certs`
Expected: `Certificates written to .../certs`, and `certs/localhost-key.pem` + `certs/localhost-cert.pem` exist.

Run: `git check-ignore -v certs`
Expected: a line showing the `.gitignore` rule matched. If this prints nothing, STOP — the key is not ignored.

Run: `git status --short`
Expected: no `certs/` entry.

- [ ] **Step 5: Rewrite `src/index.ts` to serve HTTPS**

Replace the entire contents of `src/index.ts`:

```typescript
import https from "node:https";
import app from "./app.ts";
import { loadTlsCredentials } from "./tls.ts";

const port = Number(process.env.PORT) || 3000;

https.createServer(loadTlsCredentials(), app.callback()).listen(port, () => {
  console.log(`Listening on https://localhost:${port}`);
});
```

- [ ] **Step 6: Verify HTTPS serves the route**

Run: `npm start &` then `curl -sk https://localhost:3000/`
Expected: `{"message":"Hello, world!"}`

Note `-k` is required: the certificate is self-signed. Confirm the log line reads `https://localhost:3000`, not `http://`. Kill the server afterward.

- [ ] **Step 7: Verify the loud failure on missing certificates**

```bash
mv certs certs.bak
npm start; echo "exit=$?"
mv certs.bak certs
```

Expected: non-zero exit, and an error message naming `certs/localhost-key.pem` and `npm run certs`. Confirm the server does NOT fall back to HTTP.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS, 3 tests. `hello.test.ts` must still pass — it binds via `app.callback()` and is transport-agnostic.

Run: `npm run typecheck`
Expected: no output (clean).

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-certs.sh src/index.ts package.json .gitignore
git commit -m "feat: serve the API over HTTPS in local development"
```

---

### Task 3: README

**Files:**
- Modify: `README.md` (Requirements, Setup, Run sections)

**Interfaces:**
- Consumes: `npm run certs` from Task 2.
- Produces: nothing.

- [ ] **Step 1: Update Requirements**

Replace the Requirements section body with:

```markdown
Node.js 26 or newer. The project relies on Node's native TypeScript type stripping to run `.ts`
files directly, so it will not run on older versions of Node without adding a build step.

`openssl` is also required, to generate the local development certificate.
```

- [ ] **Step 2: Update Setup**

Replace the Setup section body with:

````markdown
```bash
npm install
npm run certs
```

`npm run certs` writes a self-signed certificate to `certs/` (gitignored). The server serves HTTPS
only and will not start without it.
````

- [ ] **Step 3: Update Run**

Replace the Run section body with:

````markdown
```bash
npm run dev    # watch mode, restarts on change
npm start      # plain run
```

Both serve HTTPS on `PORT` (default `3000`): <https://localhost:3000>.

The certificate is self-signed, so `curl` needs `-k` and browsers show a warning interstitial:

```bash
curl -k https://localhost:3000/
```
````

- [ ] **Step 4: Verify every documented command**

Run each command exactly as written in the README: `npm install`, `npm run certs`, `npm start`, `npm run dev`, `npm test`, `npm run typecheck`, and the `curl -k` line. Every one must work as documented.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document HTTPS setup and certificate generation"
```