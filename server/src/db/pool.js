const pg = require("pg");
const { Pool } = pg;

// Parse INT8 (BIGINT) as integer numbers in JavaScript
pg.types.setTypeParser(pg.types.builtins.INT8, (val) => (val === null ? null : parseInt(val, 10)));
// Parse NUMERIC as float/double numbers in JavaScript
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (val) => (val === null ? null : parseFloat(val)));

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
