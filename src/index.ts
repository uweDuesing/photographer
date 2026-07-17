import https from "node:https";
import app from "./app.ts";
import { loadTlsCredentials } from "./tls.ts";

const port = Number(process.env.PORT) || 3000;

https.createServer(loadTlsCredentials(), app.callback()).listen(port, () => {
  console.log(`Listening on https://localhost:${port}`);
});
