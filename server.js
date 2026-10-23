"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");
const Database = require("better-sqlite3");
const express = require("express");

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = "skyhopper_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;
const ROOT = __dirname;

function createApp(options = {}) {
  const databasePath = options.databasePath || path.join(ROOT, "data", "skyhopper.sqlite");
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      unlocked_stage INTEGER NOT NULL DEFAULT 1 CHECK(unlocked_stage BETWEEN 1 AND 100),
      best_score INTEGER NOT NULL DEFAULT 0 CHECK(best_score BETWEEN 0 AND 1000000),
      completed_stages TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
  `);

  const app = express();
  app.disable("x-powered-by");
  app.locals.database = db;

  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use((req, _res, next) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) req.body = {};
    next();
  });

  const authAttempts = new Map();
  function limitAuthAttempts(req, res, next) {
    const now = Date.now();
    const key = req.ip;
    const windowMs = 15 * 60 * 1000;
    const current = authAttempts.get(key);
    if (!current || current.expiresAt <= now) {
      authAttempts.set(key, { count: 1, expiresAt: now + windowMs });
      for (const [ip, entry] of authAttempts) {
        if (entry.expiresAt <= now) authAttempts.delete(ip);
      }
      return next();
    }
    if (current.count >= 10) {
      res.set("Retry-After", String(Math.ceil((current.expiresAt - now) / 1000)));
      return res.status(429).json({ error: "Too many sign-in attempts. Please try again later." });
    }
    current.count += 1;
    return next();
  }

  function requireSameOrigin(req, res, next) {
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
      return res.status(403).json({ error: "Request origin was not accepted." });
    }
    return next();
  }

  function parseSessionToken(req) {
    const cookies = (req.get("cookie") || "").split(";");
    const entry = cookies.find((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE}=`));
    if (!entry) return null;
    const token = entry.trim().slice(SESSION_COOKIE.length + 1);
    return /^[a-f0-9]{64}$/.test(token) ? token : null;
  }

  function requireUser(req, res, next) {
    const token = parseSessionToken(req);
    if (!token) return res.status(401).json({ error: "Please sign in to continue." });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = db.prepare(`
      SELECT users.id, users.username
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(tokenHash, Date.now());
    if (!session) {
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
      return res.status(401).json({ error: "Your session expired. Please sign in again." });
    }
    req.user = session;
    req.sessionTokenHash = tokenHash;
    return next();
  }

  function setSessionCookie(res, token) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.set("Set-Cookie",
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`);
  }

  function clearSessionCookie(res) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.set("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
  }

  function publicProgress(userId) {
    const row = db.prepare(`
      SELECT unlocked_stage, best_score, completed_stages, updated_at
      FROM progress WHERE user_id = ?
    `).get(userId);
    if (!row) {
      return { unlockedStage: 1, bestScore: 0, completedStages: {}, sideQuestBadges: 0, updatedAt: null };
    }
    const completedStages = JSON.parse(row.completed_stages);
    const sideQuestBadges = Object.values(completedStages).filter(Boolean).length;
    return {
      unlockedStage: row.unlocked_stage,
      bestScore: row.best_score,
      completedStages,
      sideQuestBadges,
      updatedAt: row.updated_at
    };
  }

  app.post("/api/auth/register", requireSameOrigin, limitAuthAttempts, async (req, res, next) => {
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: "Username must be 3–20 letters, numbers, or underscores." });
    }
    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({ error: "Password must be between 10 and 128 characters." });
    }

    try {
      const salt = crypto.randomBytes(16);
      const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
      const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)
      `);
      const insertProgress = db.prepare(`
        INSERT INTO progress (user_id, updated_at) VALUES (?, ?)
      `);
      const insertSession = db.prepare(`
        INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)
      `);
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const now = Date.now();
      const createAccount = db.transaction(() => {
        const result = insertUser.run(username, `${salt.toString("hex")}:${derivedKey.toString("hex")}`, now);
        insertProgress.run(result.lastInsertRowid, now);
        insertSession.run(tokenHash, result.lastInsertRowid, now + SESSION_DURATION_MS);
        return result.lastInsertRowid;
      });
      const userId = createAccount();
      setSessionCookie(res, token);
      return res.status(201).json({
        user: { id: userId, username },
        progress: publicProgress(userId)
      });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({ error: "That username is already taken." });
      }
      return next(error);
    }
  });

  app.post("/api/auth/login", requireSameOrigin, limitAuthAttempts, async (req, res, next) => {
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!username || password.length > 128) {
      return res.status(400).json({ error: "Enter your username and password." });
    }

    try {
      const account = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").get(username);
      const [saltHex, hashHex] = account
        ? account.password_hash.split(":")
        : [Buffer.alloc(16).toString("hex"), Buffer.alloc(PASSWORD_KEY_LENGTH).toString("hex")];
      const salt = Buffer.from(saltHex, "hex");
      const expectedHash = Buffer.from(hashHex, "hex");
      const actualHash = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
      if (!account || expectedHash.length !== actualHash.length ||
          !crypto.timingSafeEqual(expectedHash, actualHash)) {
        return res.status(401).json({ error: "Username or password is incorrect." });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const now = Date.now();
      db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
      db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
        .run(tokenHash, account.id, now + SESSION_DURATION_MS);
      setSessionCookie(res, token);
      return res.json({ user: { id: account.id, username: account.username }, progress: publicProgress(account.id) });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/logout", requireSameOrigin, requireUser, (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(req.sessionTokenHash);
    clearSessionCookie(res);
    return res.json({ ok: true });
  });

  app.get("/api/me", requireUser, (req, res) => {
    return res.json({ user: req.user, progress: publicProgress(req.user.id) });
  });

  app.get("/api/progress", requireUser, (req, res) => {
    return res.json({ progress: publicProgress(req.user.id) });
  });

  app.put("/api/progress", requireSameOrigin, requireUser, (req, res) => {
    const { unlockedStage, bestScore, completedStages } = req.body;
    if (!Number.isInteger(unlockedStage) || unlockedStage < 1 || unlockedStage > 100 ||
        !Number.isInteger(bestScore) || bestScore < 0 || bestScore > 1000000 ||
        !completedStages || typeof completedStages !== "object" ||
        Array.isArray(completedStages) || Object.keys(completedStages).length > 100) {
      return res.status(400).json({ error: "Progress data is invalid." });
    }

    const merged = {};
    for (const [stage, questComplete] of Object.entries(completedStages)) {
      if (!/^(?:[1-9]|[1-9]\d|100)$/.test(stage) || typeof questComplete !== "boolean") {
        return res.status(400).json({ error: "Completed stage data is invalid." });
      }
      merged[stage] = questComplete;
    }
    const previous = db.prepare("SELECT unlocked_stage, best_score, completed_stages FROM progress WHERE user_id = ?")
      .get(req.user.id);
    if (previous) {
      const savedStages = JSON.parse(previous.completed_stages);
      for (const [stage, questComplete] of Object.entries(savedStages)) {
        merged[stage] = merged[stage] === true || questComplete;
      }
    }
    const savedUnlocked = Math.max(previous ? previous.unlocked_stage : 1, unlockedStage);
    const savedBest = Math.max(previous ? previous.best_score : 0, bestScore);
    const now = Date.now();
    db.prepare(`
      INSERT INTO progress (user_id, unlocked_stage, best_score, completed_stages, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        unlocked_stage = excluded.unlocked_stage,
        best_score = excluded.best_score,
        completed_stages = excluded.completed_stages,
        updated_at = excluded.updated_at
    `).run(req.user.id, savedUnlocked, savedBest, JSON.stringify(merged), now);
    return res.json({ progress: publicProgress(req.user.id) });
  });

  app.get("/api/leaderboard", (req, res) => {
    const limit = Math.min(25, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const rows = db.prepare(`
      SELECT users.username, progress.unlocked_stage, progress.best_score, progress.completed_stages
      FROM progress JOIN users ON users.id = progress.user_id
      ORDER BY progress.unlocked_stage DESC, progress.best_score DESC, users.username COLLATE NOCASE ASC
      LIMIT ?
    `).all(limit);
    return res.json({
      leaderboard: rows.map((row) => ({
        username: row.username,
        unlockedStage: row.unlocked_stage,
        bestScore: row.best_score,
        sideQuestBadges: Object.values(JSON.parse(row.completed_stages)).filter(Boolean).length
      }))
    });
  });

  app.get("/", (_req, res) => res.sendFile(path.join(ROOT, "index .html")));
  app.get("/index%20.html", (_req, res) => res.sendFile(path.join(ROOT, "index .html")));
  app.get("/style.css", (_req, res) => res.sendFile(path.join(ROOT, "style.css")));
  app.get("/script.js", (_req, res) => res.sendFile(path.join(ROOT, "script.js")));
  app.get("/manifest.webmanifest", (_req, res) => {
    res.type("application/manifest+json");
    res.set("Cache-Control", "no-cache");
    return res.sendFile(path.join(ROOT, "manifest.webmanifest"));
  });
  app.get("/sw.js", (_req, res) => {
    res.type("application/javascript");
    res.set({
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/"
    });
    return res.sendFile(path.join(ROOT, "sw.js"));
  });
  app.get("/icons/sky-hopper.svg", (_req, res) => {
    res.type("image/svg+xml");
    res.set("Cache-Control", "public, max-age=86400");
    return res.sendFile(path.join(ROOT, "icons", "sky-hopper.svg"));
  });
  app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found." }));
  app.use((_req, res) => res.status(404).send("Not found."));
  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && "body" in error) {
      return res.status(400).json({ error: "Request body must be valid JSON." });
    }
    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body is too large." });
    }
    if (Number.isInteger(error.status) && error.status < 500) {
      return res.status(error.status).json({ error: "The request could not be processed." });
    }
    console.error("Request failed.", error);
    return res.status(500).json({ error: "The server could not complete the request." });
  });

  app.onClose = () => db.close();
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = Number.parseInt(process.env.PORT, 10) || 3000;
  app.listen(port, "127.0.0.1", () => {
    console.log(`Sky Hopper is running at http://localhost:${port}`);
  });
}

module.exports = { createApp };
