import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.ts";

test("GET / returns the hello world message as JSON", async () => {
  const response = await request(app.callback()).get("/");

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /application\/json/);
  assert.deepEqual(response.body, { message: "Hello, world!" });
});