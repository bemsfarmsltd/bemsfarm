const pool = require("../db/pool");
const accountsRepository = require("../repositories/accountsRepository");
const { ValidationError, NotFoundError, BadRequestError } = require("../utils/errors");

class AccountsService {
  async getBankAccounts() {
    return await accountsRepository.getBankAccounts();
  }

  async createBankAccount(data) {
    const { account_name, bank_name, account_number } = data;
    if (!account_name)   throw new ValidationError("account_name is required");
    if (!bank_name)      throw new ValidationError("bank_name is required");
    if (!account_number) throw new ValidationError("account_number is required");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (data.is_primary) {
        await accountsRepository.resetPrimaryAccounts(client);
      }

      const account = await accountsRepository.createBankAccount(data, client);

      await client.query("COMMIT");
      return account;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async updateBankAccount(id, data) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await accountsRepository.getBankAccountById(id, client);
      if (!existing) throw new NotFoundError("Bank account not found");

      if (data.is_primary) {
        await accountsRepository.resetPrimaryAccounts(client);
      }

      const updated = await accountsRepository.updateBankAccount(id, {
        account_name: data.account_name !== undefined ? data.account_name : existing.account_name,
        bank_name: data.bank_name !== undefined ? data.bank_name : existing.bank_name,
        account_number: data.account_number !== undefined ? data.account_number : existing.account_number,
        account_type: data.account_type !== undefined ? data.account_type : existing.account_type,
        status: data.status !== undefined ? data.status : existing.status,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        is_primary: data.is_primary !== undefined ? data.is_primary : existing.is_primary,
      }, client);

      await client.query("COMMIT");
      return updated;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deactivateBankAccount(id) {
    const existing = await accountsRepository.getBankAccountById(id);
    if (!existing) throw new NotFoundError("Bank account not found");
    
    await accountsRepository.deactivateBankAccount(id);
    return { id, status: 'inactive' };
  }

  async getMoneyTransfers(page = 1, limit = 20) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const [transfers, total] = await Promise.all([
      accountsRepository.getMoneyTransfers(limitNum, offset),
      accountsRepository.countMoneyTransfers()
    ]);

    return {
      transfers,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    };
  }

  async createMoneyTransfer(data, userId) {
    const { from_account_id, to_account_id, amount, fee = 0, description, date } = data;

    if (!from_account_id) throw new ValidationError("from_account_id is required");
    if (!to_account_id)   throw new ValidationError("to_account_id is required");
    
    const amountVal = parseFloat(amount);
    const feeVal = parseFloat(fee) || 0;

    if (isNaN(amountVal) || amountVal <= 0) {
      throw new ValidationError("Amount must be greater than 0");
    }
    if (parseInt(from_account_id) === parseInt(to_account_id)) {
      throw new BadRequestError("Source and destination must be different accounts");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Lock and fetch source account
      const fromAcc = await accountsRepository.getBankAccountByIdForUpdate(from_account_id, client);
      if (!fromAcc) throw new NotFoundError("Source account not found");

      const fromBal = parseFloat(fromAcc.balance);
      const totalRequired = amountVal + feeVal;

      if (fromBal < totalRequired) {
        throw new BadRequestError(`Insufficient balance. Available: ₦${fromBal.toLocaleString('en-NG')}`);
      }

      // 2. Lock and fetch destination account to prevent deadlocks and ensure validation
      const toAcc = await accountsRepository.getBankAccountById(to_account_id, client);
      if (!toAcc) throw new NotFoundError("Destination account not found");

      // 3. Generate transfer reference and date
      const reference = await accountsRepository.generateReference(client, "TRF", "money_transfers");
      const txDate = date || new Date().toISOString().slice(0, 10);

      // 4. Create the money transfer record
      const transfer = await accountsRepository.createMoneyTransfer({
        reference,
        from_account_id,
        to_account_id,
        amount: amountVal,
        fee: feeVal,
        description,
        date: txDate,
        created_by: userId
      }, client);

      // 5. Debit source account & write transaction log
      await accountsRepository.updateBalance(from_account_id, -totalRequired, client);
      const updatedFromAcc = await accountsRepository.getBankAccountById(from_account_id, client);
      
      await accountsRepository.insertTransaction({
        reference: `TXN-${Date.now()}-DR`,
        type: 'debit',
        source_type: 'transfer',
        source_id: transfer.id,
        bank_account_id: from_account_id,
        amount: totalRequired,
        balance_after: parseFloat(updatedFromAcc.balance),
        description: `Transfer out → ${description || reference}`,
        payment_method: 'Bank Transfer',
        date: txDate,
        created_by: userId
      }, client);

      // 6. Credit destination account & write transaction log
      await accountsRepository.updateBalance(to_account_id, amountVal, client);
      const updatedToAcc = await accountsRepository.getBankAccountById(to_account_id, client);

      await accountsRepository.insertTransaction({
        reference: `TXN-${Date.now()}-CR`,
        type: 'credit',
        source_type: 'transfer',
        source_id: transfer.id,
        bank_account_id: to_account_id,
        amount: amountVal,
        balance_after: parseFloat(updatedToAcc.balance),
        description: `Transfer in ← ${description || reference}`,
        payment_method: 'Bank Transfer',
        date: txDate,
        created_by: userId
      }, client);

      await client.query("COMMIT");
      return transfer;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new AccountsService();
