require("dotenv").config();
const { Pool } = require("pg");

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });

  try {
    console.log("🚀 Starting database schema updates for Product Configurations...");

    // 1. Update categories table
    await pool.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);
    console.log("✅ Updated 'categories' table.");

    // 2. Create subcategories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Created 'subcategories' table.");

    // 3. Create units table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        abbreviation VARCHAR(20) UNIQUE,
        base_unit VARCHAR(20),
        conversion_factor NUMERIC(10,4) DEFAULT 1.0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Created 'units' table.");

    // 4. Create warranties table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warranties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        duration VARCHAR(50),
        type VARCHAR(50),
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Created 'warranties' table.");

    console.log("🎉 All Product Configuration migrations applied successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
