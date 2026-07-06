const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

console.log("🛠️ pool.js: DATABASE_URL is", process.env.DATABASE_URL ? "defined" : "UNDEFINED");
if (process.env.DATABASE_URL) {
  // Mask password for safety
  const masked = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":******@");
  console.log("🛠️ pool.js: Connecting to", masked);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = pool;
