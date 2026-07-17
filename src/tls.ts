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