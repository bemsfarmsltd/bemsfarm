const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const migrationSql = `
  -- 1. Enable the vector extension
  CREATE EXTENSION IF NOT EXISTS vector;

  -- 2. Add an embedding column to products if not exists
  ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(768);

  -- 3. Create match_products similarity search function
  CREATE OR REPLACE FUNCTION match_products (
    query_embedding vector(768),
    match_threshold float,
    match_count int
  )
  RETURNS TABLE (
    id int,
    name varchar(255),
    price decimal(10,2),
    unit varchar(100),
    description text,
    image_url text,
    category_id int,
    stock int,
    low_stock_threshold int,
    similarity float
  )
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      p.id,
      p.name,
      p.price,
      p.unit,
      p.description,
      p.image_url,
      p.category_id,
      p.stock,
      p.low_stock_threshold,
      1 - (p.embedding <=> query_embedding) AS similarity
    FROM products p
    WHERE p.embedding IS NOT NULL 
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$ LANGUAGE plpgsql;
`;

async function runMigration() {
  console.log("Connecting to Database (no SSL)...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  const client = await pool.connect();
  try {
    console.log("Applying pgvector migrations...");
    await client.query(migrationSql);
    console.log("🎉 Migration applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

runMigration();
