"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { createApp } = require("./server");

let app;
let server;
let baseUrl;
let tempDirectory;
let cookie;

before(async () => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sky-hopper-test-"));
  app = createApp({ databasePath: path.join(tempDirectory, "test.sqlite") });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (app) app.onClose();
  if (tempDirectory) fs.rmSync(tempDirectory, { recursive: true, force: true });
});

async function jsonRequest(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers
    }
  });
  const body = await response.json();
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { response, body };
}

test("accounts, saved progress, leaderboard, and logout work end to end", async () => {
  const created = await jsonRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: "sky_pilot", password: "a-long-test-password" })
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.user.username, "sky_pilot");
  assert.equal(created.body.progress.unlockedStage, 1);
  assert.match(cookie, /^skyhopper_session=/);

  const updated = await jsonRequest("/api/progress", {
    method: "PUT",
    body: JSON.stringify({
      unlockedStage: 4,
      bestScore: 5,
      completedStages: { 1: true, 2: false }
    })
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.progress.sideQuestBadges, 1);

  const leaderboard = await jsonRequest("/api/leaderboard");
  assert.equal(leaderboard.response.status, 200);
  assert.equal(leaderboard.body.leaderboard[0].username, "sky_pilot");
  assert.equal(leaderboard.body.leaderboard[0].unlockedStage, 4);

  const invalid = await jsonRequest("/api/progress", {
    method: "PUT",
    body: JSON.stringify({ unlockedStage: 101, bestScore: -1, completedStages: {} })
  });
  assert.equal(invalid.response.status, 400);

  const loggedOut = await jsonRequest("/api/auth/logout", { method: "POST" });
  assert.equal(loggedOut.response.status, 200);
  const signedOutRequest = await jsonRequest("/api/progress");
  assert.equal(signedOutRequest.response.status, 401);

  const signedIn = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "sky_pilot", password: "a-long-test-password" })
  });
  assert.equal(signedIn.response.status, 200);
  assert.equal(signedIn.body.progress.unlockedStage, 4);
  const badPassword = await jsonRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "sky_pilot", password: "a-different-password" })
  });
  assert.equal(badPassword.response.status, 401);
});

test("duplicate usernames and weak passwords are rejected", async () => {
  const weakPassword = await jsonRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: "pilot2", password: "short" })
  });
  assert.equal(weakPassword.response.status, 400);

  const created = await jsonRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: "SKY_PILOT", password: "another-long-test-password" })
  });
  assert.equal(created.response.status, 409);
});

test("account writes reject requests from another origin", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      Origin: "https://example.invalid",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username: "origin_test", password: "a-long-test-password" })
  });
  assert.equal(response.status, 403);
});

test("PWA app shell, manifest, worker, and icon are served", async () => {
  const routes = [
    ["/", "text/html"],
    ["/manifest.webmanifest", "application/manifest+json"],
    ["/sw.js", "application/javascript"],
    ["/icons/sky-hopper.svg", "image/svg+xml"]
  ];
  for (const [route, contentType] of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${route} should load`);
    assert.match(response.headers.get("content-type"), new RegExp(contentType));
  }

  const worker = await fetch(`${baseUrl}/sw.js`);
  assert.equal(worker.headers.get("service-worker-allowed"), "/");
});
