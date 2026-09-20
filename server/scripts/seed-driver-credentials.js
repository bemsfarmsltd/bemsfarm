#!/usr/bin/env node
// server/scripts/seed-driver-credentials.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/db/pool");

async function seed() {
  console.log("🌱 Seeding Driver Login Credentials...");
  const password = "Password@123";
  const hash = await bcrypt.hash(password, 10);

  const driversRes = await pool.query("SELECT id, name, email, phone FROM drivers ORDER BY id ASC");
  console.log(`Found ${driversRes.rows.length} drivers.`);

  for (const drv of driversRes.rows) {
    // 1. driver_auth
    const authCheck = await pool.query("SELECT id FROM driver_auth WHERE driver_id = $1", [drv.id]);
    if (authCheck.rows.length > 0) {
      await pool.query(
        "UPDATE driver_auth SET password_hash = $1, failed_attempts = 0, locked_until = NULL WHERE driver_id = $2",
        [hash, drv.id]
      );
    } else {
      await pool.query(
        "INSERT INTO driver_auth (driver_id, password_hash, created_at) VALUES ($1, $2, NOW())",
        [drv.id, hash]
      );
    }

    // 2. driver_availability
    const daCheck = await pool.query("SELECT id FROM driver_availability WHERE driver_id = $1", [drv.id]);
    if (daCheck.rows.length > 0) {
      await pool.query(
        "UPDATE driver_availability SET is_available = true, is_on_delivery = false, last_toggled_at = NOW() WHERE driver_id = $1",
        [drv.id]
      );
    } else {
      await pool.query(
        "INSERT INTO driver_availability (driver_id, is_available, is_on_delivery, last_toggled_at) VALUES ($1, true, false, NOW())",
        [drv.id]
      );
    }

    // 3. Ensure driver status is 'active'
    await pool.query("UPDATE drivers SET status = 'active' WHERE id = $1", [drv.id]);

    console.log(`✅ [Driver ID: ${drv.id}] ${drv.name} (${drv.email} / ${drv.phone}) -> Password set to "${password}"`);
  }

  console.log("\n🎉 Driver authentication credentials are now active!");
  pool.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  pool.end();
});
