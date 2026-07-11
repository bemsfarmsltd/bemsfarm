const pool = require("../db/pool");

class AccountsRepository {
  async getBankAccounts(client = pool) {
    const res = await client.query(`
      SELECT
        ba.*,
        (SELECT COUNT(*) FROM transactions t WHERE t.bank_account_id = ba.id) AS transaction_count,
        (SELECT COALESCE(SUM(amount),0) FROM transactions t WHERE t.bank_account_id=ba.id AND t.type='credit' AND DATE_TRUNC('month',t.date)=DATE_TRUNC('month',NOW())) AS month_credits,
        (SELECT COALESCE(SUM(amount),0) FROM transactions t WHERE t.bank_account_id=ba.id AND t.type='debit'  AND DATE_TRUNC('month',t.date)=DATE_TRUNC('month',NOW())) AS month_debits
      FROM bank_accounts ba
      ORDER BY ba.is_primary DESC, ba.balance DESC
    `);
    return res.rows;
  }

  async createBankAccount(data, client = pool) {
    const { account_name, bank_name, account_number, account_type, currency, opening_balance, is_primary, notes } = data;
    const res = await client.query(
      `INSERT INTO bank_accounts (account_name, bank_name, account_number, account_type, currency, balance, is_primary, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`,
      [account_name, bank_name, account_number, account_type, currency, opening_balance, is_primary, notes]
    );
    return res.rows[0];
  }

  async resetPrimaryAccounts(client = pool) {
    await client.query("UPDATE bank_accounts SET is_primary = false");
  }

  async getBankAccountById(id, client = pool) {
    const res = await client.query("SELECT * FROM bank_accounts WHERE id = $1", [id]);
    return res.rows[0];
  }

  async getBankAccountByIdForUpdate(id, client) {
    const res = await client.query("SELECT balance FROM bank_accounts WHERE id = $1 FOR UPDATE", [id]);
    return res.rows[0];
  }

  async updateBankAccount(id, data, client = pool) {
    const { account_name, bank_name, account_number, account_type, status, notes, is_primary } = data;
    const res = await client.query(
      `UPDATE bank_accounts SET
         account_name   = COALESCE($1, account_name),
         bank_name      = COALESCE($2, bank_name),
         account_number = COALESCE($3, account_number),
         account_type   = COALESCE($4, account_type),
         status         = COALESCE($5, status),
         notes          = COALESCE($6, notes),
         is_primary     = COALESCE($7, is_primary),
         updated_at     = NOW()
       WHERE id = $8 RETURNING *`,
      [account_name, bank_name, account_number, account_type, status, notes, is_primary, id]
    );
    return res.rows[0];
  }

  async deactivateBankAccount(id, client = pool) {
    await client.query("UPDATE bank_accounts SET status = 'inactive', updated_at = NOW() WHERE id = $1", [id]);
  }

  async getMoneyTransfers(limit, offset, client = pool) {
    const res = await client.query(`
      SELECT
        mt.*,
        fa.bank_name AS from_bank, fa.account_name AS from_account,
        ta.bank_name AS to_bank,   ta.account_name AS to_account,
        u.name AS created_by_name
      FROM money_transfers mt
      LEFT JOIN bank_accounts fa ON mt.from_account_id = fa.id
      LEFT JOIN bank_accounts ta ON mt.to_account_id   = ta.id
      LEFT JOIN users u ON mt.created_by = u.id
      ORDER BY mt.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return res.rows;
  }

  async countMoneyTransfers(client = pool) {
    const res = await client.query("SELECT COUNT(*) FROM money_transfers");
    return parseInt(res.rows[0].count);
  }

  async createMoneyTransfer(data, client = pool) {
    const { reference, from_account_id, to_account_id, amount, fee, description, date, created_by } = data;
    const res = await client.query(
      `INSERT INTO money_transfers (reference, from_account_id, to_account_id, amount, fee, description, date, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'completed',$8,NOW()) RETURNING *`,
      [reference, from_account_id, to_account_id, amount, fee, description, date, created_by]
    );
    return res.rows[0];
  }

  async generateReference(client, prefix, table, refCol = "reference") {
    const row = await client.query(`SELECT COUNT(*) FROM ${table}`);
    const n = parseInt(row.rows[0].count) + 1;
    return `${prefix}-${String(n).padStart(4, "0")}`;
  }

  async updateBalance(id, amount, client = pool) {
    await client.query(
      "UPDATE bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
      [amount, id]
    );
  }

  async insertTransaction(data, client = pool) {
    const { reference, type, source_type, source_id, bank_account_id, amount, balance_after, description, payment_method, date, created_by } = data;
    await client.query(
      `INSERT INTO transactions
         (reference, type, source_type, source_id, bank_account_id, amount, balance_after, description, payment_method, date, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed',$11,NOW())`,
      [reference, type, source_type, source_id, bank_account_id, amount, balance_after, description, payment_method, date, created_by]
    );
  }
}

module.exports = new AccountsRepository();
