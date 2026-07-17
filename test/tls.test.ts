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