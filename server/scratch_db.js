const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:bemsfarms11223355!@db.helhpaybcjrxljizblve.supabase.co:5432/postgres'
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log("1. Adding columns to users...");
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS customer_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP;
    `);

    console.log("2. Updating foreign key schemas...");
    const tables = ['orders', 'customer_loyalty', 'customer_wallets', 'loyalty_transactions', 'wallet_transactions', 'returns', 'product_reviews', 'customer_addresses'];
    
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_customer_id_fkey`);
      } catch(e) {
         if (!e.message.includes('does not exist')) {
            throw e;
         }
      }
    }

    console.log("3. Merging customers into users...");
    const customers = await client.query('SELECT * FROM customers');
    
    for (const c of customers.rows) {
      // Find matching user by email or phone
      let matchQuery = '';
      let matchParams = [];
      if (c.email && c.phone) {
        matchQuery = 'SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1';
        matchParams = [c.email, c.phone];
      } else if (c.email) {
        matchQuery = 'SELECT id FROM users WHERE email = $1 LIMIT 1';
        matchParams = [c.email];
      } else if (c.phone) {
        matchQuery = 'SELECT id FROM users WHERE phone = $1 LIMIT 1';
        matchParams = [c.phone];
      }

      let userId = null;
      if (matchQuery) {
        const match = await client.query(matchQuery, matchParams);
        if (match.rows.length > 0) {
          userId = match.rows[0].id;
          // Update existing user with customer fields
          await client.query(`
            UPDATE users SET 
              customer_code = COALESCE(customer_code, $1),
              total_orders = total_orders + COALESCE($2, 0),
              total_spent = total_spent + COALESCE($3, 0),
              loyalty_points = loyalty_points + COALESCE($4, 0),
              last_order_at = GREATEST(last_order_at, $5),
              joined_at = LEAST(joined_at, $6),
              address = COALESCE(address, $7)
            WHERE id = $8
          `, [
            c.customer_code, c.total_orders, c.total_spent, c.loyalty_points, 
            c.last_order_at, c.joined_at, c.area, userId
          ]);
        }
      }

      if (!userId) {
        // Create new user for this customer
        // We will generate a fake email if missing, as email is NOT NULL in users table
        const fakeEmail = c.email || `${c.customer_code.toLowerCase()}@placeholder.bemsfarms.com`;
        
        const insertRes = await client.query(`
          INSERT INTO users (name, email, phone, role, status, customer_code, total_orders, total_spent, loyalty_points, last_order_at, joined_at, address)
          VALUES ($1, $2, $3, 'user', $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          c.name, fakeEmail, c.phone, c.status || 'active', c.customer_code, c.total_orders, c.total_spent, 
          c.loyalty_points, c.last_order_at, c.joined_at, c.area
        ]);
        userId = insertRes.rows[0].id;
      }

      // Update foreign keys across tables to point to userId instead of customer's id
      console.log(`Remapping customer ${c.id} to user ${userId}...`);
      
      const tablesWithCustomerFk = [
        { table: 'orders', col: 'customer_id' },
        { table: 'customer_loyalty', col: 'customer_id' },
        { table: 'customer_wallets', col: 'customer_id' },
        { table: 'loyalty_transactions', col: 'customer_id' },
        { table: 'wallet_transactions', col: 'customer_id' },
        { table: 'returns', col: 'customer_id' },
        { table: 'product_reviews', col: 'customer_id' },
        { table: 'customer_addresses', col: 'customer_id' },
        { table: 'customer_activity_log', col: 'customer_id' }
      ];

      for (const {table, col} of tablesWithCustomerFk) {
        try {
          await client.query(`UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`, [userId, c.id]);
        } catch(e) {
          if (!e.message.includes('does not exist')) {
            throw e;
          }
        }
      }
    }

    console.log("4. Restoring foreign key constraints...");
    
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE`);
        console.log(`Updated constraints for ${table}`);
      } catch(e) {
         if (!e.message.includes('does not exist')) {
            throw e;
         }
      }
    }

    console.log("4. Renaming customer_id column to user_id in orders...");
    try {
      await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey');
      await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey');
      await client.query('UPDATE orders SET user_id = customer_id WHERE user_id IS NULL AND customer_id IS NOT NULL');
      await client.query('ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
    } catch(e) { console.error(e) }

    await client.query('COMMIT');
    console.log("Migration successful!");

  } catch(e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
