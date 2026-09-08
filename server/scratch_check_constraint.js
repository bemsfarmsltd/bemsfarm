const pool = require("./src/db/pool");

async function check() {
  try {
    await pool.query("ALTER TABLE products DROP CONSTRAINT IF EXISTS check_stock_non_negative;");
    await pool.query("ALTER TABLE products ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0);");
    console.log("Constraint added.");
  } catch (err) {
    if (err.message.includes("check_stock_non_negative")) {
      console.log("Constraint already exists or error: ", err.message);
    } else {
      console.log("Error:", err.message);
    }
  } finally {
    process.exit();
  }
}
check();
