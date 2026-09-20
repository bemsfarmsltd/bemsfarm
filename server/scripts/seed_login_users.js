require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const accounts = [
    { name: 'Bems Farms Admin', email: 'admin@bemsfarms.com', pass: 'admin123', role: 'superadmin' },
    { name: 'Super Admin', email: 'superadmin@bemsfarms.com', pass: 'super123', role: 'superadmin' },
    { name: 'Store Manager', email: 'manager@bemsfarms.com', pass: 'manager123', role: 'manager' },
    { name: 'Store Cashier', email: 'cashier@bemsfarms.com', pass: 'cashier123', role: 'cashier' },
    { name: 'Delivery Manager', email: 'delivery@bemsfarms.com', pass: 'delivery123', role: 'delivery_manager' },
    { name: 'Kitchen Staff', email: 'kitchen@bemsfarms.com', pass: 'kitchen123', role: 'kitchen_staff' },
    { name: 'Demo Customer', email: 'customer@bemsfarms.com', pass: 'customer123', role: 'user' },
    { name: 'Victor Kalu', email: 'kaluvictor200@gmail.com', pass: 'password123', role: 'user' }
  ];

  for (const acc of accounts) {
    const hash = await bcrypt.hash(acc.pass, 12);
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [acc.email]);
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE users SET password = $1, role = $2, email_verified = true, status = 'active', failed_login_attempts = 0, locked_until = NULL WHERE id = $3",
        [hash, acc.role, existing.rows[0].id]
      );
      console.log(`✅ Updated account: ${acc.email} | password: ${acc.pass} | role: ${acc.role}`);
    } else {
      await pool.query(
        "INSERT INTO users (name, email, password, role, email_verified, status, failed_login_attempts, created_at) VALUES ($1, $2, $3, $4, true, 'active', 0, NOW())",
        [acc.name, acc.email.toLowerCase(), hash, acc.role]
      );
      console.log(`✨ Created account: ${acc.email} | password: ${acc.pass} | role: ${acc.role}`);
    }
  }

  await pool.query("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE status != 'suspended'");
  console.log('🎉 All users ready for login.');
  pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
  process.exit(1);
});
