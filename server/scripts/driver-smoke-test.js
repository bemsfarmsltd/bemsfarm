#!/usr/bin/env node
// server/scripts/driver-smoke-test.js
// Boots the real server and verifies all driver endpoints are mounted,
// properly protected by driverAuthMiddleware, and return expected HTTP status codes.

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}`;
const BOOT_TIMEOUT_MS = 20000;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${options.path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("request timed out")));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function waitForBoot(child) {
  const start = Date.now();
  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    if (child.exitCode !== null) {
      throw new Error(`Server process exited early with code ${child.exitCode}`);
    }
    try {
      await request({ path: "/health" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`Server did not become healthy within ${BOOT_TIMEOUT_MS}ms`);
}

async function main() {
  console.log("🚀 Starting Driver App smoke test...");

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
        JWT_SECRET: "smoke-test-driver-jwt-secret-key-12345",
        REFRESH_SECRET: "smoke-test-driver-refresh-secret-key-12345",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));

  const fail = (msg) => {
    console.error(`\n❌ DRIVER SMOKE TEST FAILED: ${msg}`);
    console.error("\n--- server output ---\n" + output);
    child.kill();
    process.exit(1);
  };

  try {
    await waitForBoot(child);
    console.log("✅ Server booted successfully.");

    const checks = [
      // 1. Unauthenticated checks for protected driver routes (should all return 401)
      [
        "GET /api/driver/auth/me (no auth) -> 401",
        () => request({ path: "/api/driver/auth/me" }).then((r) => r.status === 401),
      ],
      [
        "PATCH /api/driver/auth/profile (no auth) -> 401",
        () => request({ path: "/api/driver/auth/profile", method: "PATCH" }, { phone: "08011223344" }).then((r) => r.status === 401),
      ],
      [
        "PATCH /api/driver/availability (no auth) -> 401",
        () => request({ path: "/api/driver/availability", method: "PATCH" }, { is_available: true }).then((r) => r.status === 401),
      ],
      [
        "GET /api/driver/deliveries (no auth) -> 401",
        () => request({ path: "/api/driver/deliveries" }).then((r) => r.status === 401),
      ],
      [
        "GET /api/driver/deliveries/history (no auth) -> 401",
        () => request({ path: "/api/driver/deliveries/history" }).then((r) => r.status === 401),
      ],
      [
        "GET /api/driver/deliveries/ORD123 (no auth) -> 401",
        () => request({ path: "/api/driver/deliveries/ORD123" }).then((r) => r.status === 401),
      ],
      [
        "PATCH /api/driver/deliveries/ORD123/status (no auth) -> 401",
        () => request({ path: "/api/driver/deliveries/ORD123/status", method: "PATCH" }, { status: "en_route" }).then((r) => r.status === 401),
      ],
      [
        "POST /api/driver/location (no auth) -> 401",
        () => request({ path: "/api/driver/location", method: "POST" }, { latitude: 5.12, longitude: 7.34 }).then((r) => r.status === 401),
      ],
      [
        "GET /api/driver/earnings (no auth) -> 401",
        () => request({ path: "/api/driver/earnings" }).then((r) => r.status === 401),
      ],
      [
        "POST /api/driver/withdraw (no auth) -> 401",
        () => request({ path: "/api/driver/withdraw", method: "POST" }, { amount: 1000 }).then((r) => r.status === 401),
      ],
      // 2. Driver login endpoint validation
      [
        "POST /api/driver/auth/login (missing fields) -> 400",
        () => request({ path: "/api/driver/auth/login", method: "POST" }, {}).then((r) => r.status === 400),
      ],
      // 3. Admin payouts endpoint protection
      [
        "GET /api/admin/deliveries/payouts (no auth) -> 401",
        () => request({ path: "/api/admin/deliveries/payouts" }).then((r) => r.status === 401),
      ],
    ];

    for (const [label, check] of checks) {
      const ok = await check();
      if (!ok) return fail(label);
      console.log(`✅ ${label}`);
    }

    console.log("\n🎉 All 12 driver endpoint smoke tests passed cleanly!");
    child.kill();
    process.exit(0);
  } catch (err) {
    fail(err.message);
  }
}

main();
