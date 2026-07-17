# photographer

A TypeScript [Koa](https://koajs.com/) API for a personal website portfolio.

## Requirements

Node.js 26 or newer. The project relies on Node's native TypeScript type stripping to run `.ts`
files directly, so it will not run on older versions of Node without adding a build step.

`openssl` is also required, to generate the local development certificate.

## Setup

```bash
npm install
npm run certs
```

`npm run certs` writes a self-signed certificate to `certs/` (gitignored). The server serves HTTPS
only and will not start without it.

## Build

There is no build step. Node executes the TypeScript sources directly, so there is no `dist/` and
no `npm run build`. The nearest equivalent is a type check, which validates types without emitting
any output:

```bash
npm run typecheck
```

## Run

```bash
npm run dev    # watch mode, restarts on change
npm start      # plain run
```

Both serve HTTPS on `PORT` (default `3000`): <https://localhost:3000>.

The certificate is self-signed, so `curl` needs `-k` and browsers show a warning interstitial:

```bash
curl -k https://localhost:3000/
```

## Test

```bash
npm test
```

## Routes

| Method | Path | Response |
|---|---|---|
| `GET` | `/` | `{ "message": "Hello, world!" }` |