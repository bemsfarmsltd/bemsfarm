#!/usr/bin/env node
// server/scripts/smoke-test.js
//
// Boots the real server with placeholder env vars and verifies it starts
// and the core routes respond — no real database or secrets required.
// Every check here is satisfied before any DB query happens (pg.Pool is
// lazy; it never connects at module load, only on first query), so a
// syntactically-valid but fake DATABASE_URL is safe to use.
//
// Exists because two syntax errors (missing closing `);` on a route
// handler) once sat committed on main, silently preventing the server
// from booting at all — this would have caught both in seconds.

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}`;
// Route loading includes several integration modules and can exceed 15s on
// a cold Windows install. Keep this generous enough for CI and local runs;
// request timeouts below still fail a hung server quickly.
const BOOT_TIMEOUT_MS = 30000;

function get(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}${urlPath}`, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("request timed out")));
  });
}

async function waitForBoot(child) {
  const start = Date.now();
  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    if (child.exitCode !== null) {
      throw new Error(`server process exited early with code ${child.exitCode}`);
    }
    try {
      await get("/health");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`server did not become healthy within ${BOOT_TIMEOUT_MS}ms`);
}

async function main() {
  const child = spawn(
    process.execPath,
    [path.join(__dirname, "..", "src", "index.js")],
    {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://smoke:test@localhost:5432/smoke_test_placeholder",
        JWT_SECRET: "smoke-test-jwt-secret",
        REFRESH_SECRET: "smoke-test-refresh-secret",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));

  const fail = (msg) => {
    console.error(`\n❌ SMOKE TEST FAILED: ${msg}`);
    console.error("\n--- server output ---\n" + output);
    child.kill();
    process.exit(1);
  };

  try {
    await waitForBoot(child);

    const checks = [
      ["GET /health -> 200", () => get("/health").then((r) => r.status === 200)],
      ["GET /api -> 200", () => get("/api").then((r) => r.status === 200)],
      ["GET /test -> 200", () => get("/test").then((r) => r.status === 200)],
      ["GET /api/admin/stats (no auth) -> 401", () => get("/api/admin/stats").then((r) => r.status === 401)],
      ["GET /api/dashboard/overview (no auth) -> 401", () => get("/api/dashboard/overview").then((r) => r.status === 401)],
    ];

    for (const [label, check] of checks) {
      const ok = await check();
      if (!ok) return fail(label);
      console.log(`✅ ${label}`);
    }

    console.log("\n✅ All smoke checks passed.");
    child.kill();
    process.exit(0);
  } catch (err) {
    fail(err.message);
  }
}

main();
