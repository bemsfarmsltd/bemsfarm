require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting invoice installments & payments migration...');

    // 1. Add columns to invoices table if they don't exist
    await client.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS balance_due NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'net_7';
    `);

    // 2. Create invoice_payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id BIGSERIAL PRIMARY KEY,
        invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        receipt_ref VARCHAR(60) UNIQUE NOT NULL,
        amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
        bank_account_id INTEGER,
        transaction_reference VARCHAR(100),
        payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        previous_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
        balance_remaining NUMERIC(15, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        recorded_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_payments_receipt_ref ON invoice_payments(receipt_ref);
      CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date);
    `);

    // 3. Initialize amount_paid & balance_due on existing rows
    await client.query(`
      UPDATE invoices
      SET 
        amount_paid = CASE WHEN status = 'paid' THEN amount ELSE COALESCE(amount_paid, 0) END,
        balance_due = CASE WHEN status = 'paid' THEN 0 ELSE (amount - COALESCE(amount_paid, 0)) END
      WHERE amount_paid IS NULL OR balance_due IS NULL OR (status = 'paid' AND amount_paid = 0);
    `);

    await client.query('COMMIT');
    console.log('✅ Invoice installments and payments migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
