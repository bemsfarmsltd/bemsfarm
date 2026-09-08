require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../src/db/pool");
const bcrypt = require("bcryptjs");

async function seed() {
  console.log("🌱 Starting Database Seed...");
  try {
    // Check if categories exist
    const catCheck = await pool.query("SELECT id FROM categories LIMIT 1");
    if (catCheck.rows.length === 0) {
      console.log("Inserting categories...");
      await pool.query(`
        INSERT INTO categories (name, description, slug) VALUES 
        ('Grains & Cereals', 'Rice, beans, maize, etc.', 'grains-cereals'),
        ('Vegetables', 'Fresh farm vegetables', 'vegetables'),
        ('Fruits', 'Fresh fruits', 'fruits'),
        ('Tubers', 'Yam, potato, cassava', 'tubers')
      `);
    }

    // Insert test products
    const prodCheck = await pool.query("SELECT id FROM products LIMIT 1");
    if (prodCheck.rows.length === 0) {
      console.log("Inserting products...");
      await pool.query(`
        INSERT INTO products (name, sku, description, unit_price, price, cost_price, stock, stock_quantity, unit, category_id, status)
        VALUES 
        ('Premium Parboiled Rice', 'RICE-001', 'High quality long grain rice', 25000, 25000, 20000, 100, 100, '50kg', (SELECT id FROM categories WHERE slug='grains-cereals' LIMIT 1), 'active'),
        ('Fresh Tomatoes', 'VEG-001', 'Farm fresh tomatoes', 5000, 5000, 3000, 50, 50, 'Basket', (SELECT id FROM categories WHERE slug='vegetables' LIMIT 1), 'active'),
        ('White Yam', 'YAM-001', 'Large white yams', 1500, 1500, 1000, 200, 200, 'Tuber', (SELECT id FROM categories WHERE slug='tubers' LIMIT 1), 'active')
      `);
    }

    // Insert test admin user
    const userCheck = await pool.query("SELECT id FROM users WHERE email='admin@test.com'");
    if (userCheck.rows.length === 0) {
      console.log("Inserting admin user...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      await pool.query(`
        INSERT INTO users (name, email, password, role, status)
        VALUES ('Test Admin', 'admin@test.com', $1, 'superadmin', 'active')
      `, [hashedPassword]);
    }

    // Insert test customer
    const custCheck = await pool.query("SELECT id FROM customers WHERE email='customer@test.com'");
    if (custCheck.rows.length === 0) {
      console.log("Inserting customer...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      await pool.query(`
        INSERT INTO customers (name, email, password, phone, status)
        VALUES ('Test Customer', 'customer@test.com', $1, '08000000000', 'active')
      `, [hashedPassword]);
    }
    
    // Insert test POS cashier
    const cashierCheck = await pool.query("SELECT id FROM users WHERE email='cashier@test.com'");
    if (cashierCheck.rows.length === 0) {
      console.log("Inserting cashier user...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      await pool.query(`
        INSERT INTO users (name, email, password, role, status)
        VALUES ('Test Cashier', 'cashier@test.com', $1, 'cashier', 'active')
      `, [hashedPassword]);
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit();
  }
}

seed();
