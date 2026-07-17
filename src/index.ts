import http from "node:http";
import https from "node:https";
import app from "./app.ts";
import { loadTlsCredentials } from "./tls.ts";

const port = Number(process.env.PORT) || 3000;
const useHttps = process.env.USE_SSL === "true";

const server = useHttps
  ? https.createServer(loadTlsCredentials(), app.callback())
  : http.createServer(app.callback());

server.listen(port, () => {
  const scheme = useHttps ? "https" : "http";
  console.log(`Listening on ${scheme}://localhost:${port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down...`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));