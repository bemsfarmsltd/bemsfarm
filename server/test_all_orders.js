require('dotenv').config({path: './.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    console.log("Testing Receipts Query...");
    const q1 = `SELECT o.id, o.id AS receipt_number, o.customer_name, o.payment_method,
                o.subtotal, o.total, o.tax_amount, o.discount_amount, o.created_at AS paid_at,
                u.name AS cashier_name, u.id AS cashier_id,
                pt.transaction_id,
                COUNT(oi.id) AS items_count
         FROM orders o
         LEFT JOIN users u ON u.id = o.created_by
         LEFT JOIN pos_transactions pt ON pt.used_for_order_id = o.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         GROUP BY o.id, u.name, u.id, pt.transaction_id LIMIT 1`;
    await pool.query(q1);
    console.log("Receipts Query success.");
  } catch(e) {
    console.error("Receipts error:", e.message);
  }

  try {
    console.log("Testing Returns Query...");
    const q2 = `
      SELECT
        r.id, r.order_id, r.refund_ref, r.type, r.reason, r.status,
        r.amount, r.description, r.created_at,
        c.name AS customer_name,
        o.payment_method
      FROM returns r
      LEFT JOIN orders o ON o.id = r.order_id
      LEFT JOIN customers c ON c.id = o.customer_id LIMIT 1
    `;
    await pool.query(q2);
    console.log("Returns Query success.");
  } catch(e) {
    console.error("Returns error:", e.message);
  }

  try {
    console.log("Testing Invoices Query...");
    const q3 = `
      SELECT
        i.id, i.invoice_ref, i.order_id, i.customer_id, i.issue_date, i.due_date,
        i.subtotal, i.tax_amount, i.discount_amount, i.total, i.status, i.notes,
        c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id LIMIT 1
    `;
    await pool.query(q3);
    console.log("Invoices Query success.");
  } catch(e) {
    console.error("Invoices error:", e.message);
  }

  pool.end();
}
test();
