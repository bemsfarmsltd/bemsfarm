require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    // 1. Find existing superadmins
    console.log("🔍 Searching for existing superadmins in the database...");
    const result = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'superadmin'");
    
    if (result.rows.length > 0) {
      console.log(`\n✅ Found ${result.rows.length} existing superadmin(s):`);
      console.table(result.rows);
      console.log("\nNote: Passwords are encrypted, so we cannot view them.");
      
      // Update password for the first admin found to 'super123'
      const targetAdmin = result.rows[0];
      const newPassword = 'super123';
      const hash = await bcrypt.hash(newPassword, 12);
      
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hash, targetAdmin.id]);
      console.log(`\n🔑 I have reset the password for ${targetAdmin.email} to: ${newPassword}`);
      console.log("You can use these credentials to log in right now.");
      
    } else {
      console.log("\n❌ No existing superadmins found. Creating a new one...");
      
      // Insert a new admin
      const email = 'superadmin@bemsfarms.com';
      const password = 'super123';
      const hash = await bcrypt.hash(password, 12);
      
      await pool.query(
        `INSERT INTO users (name, email, password, role, created_at)
         VALUES ($1, $2, $3, 'superadmin', NOW())`,
        ['Super Admin', email, hash]
      );
      
      console.log(`\n✅ New superadmin created successfully!`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    }
  } catch (error) {
    console.error("Database error:", error.message);
  } finally {
    pool.end();
  }
}

run();
