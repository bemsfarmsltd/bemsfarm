const accountsService = require("../services/accountsService");

class AccountsController {
  async getBankAccounts(req, res, next) {
    try {
      const bankAccounts = await accountsService.getBankAccounts();
      res.json({ bank_accounts: bankAccounts });
    } catch (err) {
      next(err);
    }
  }

  async createBankAccount(req, res, next) {
    try {
      const account = await accountsService.createBankAccount(req.body);
      res.status(201).json({ bank_account: account });
    } catch (err) {
      next(err);
    }
  }

  async updateBankAccount(req, res, next) {
    try {
      const account = await accountsService.updateBankAccount(req.params.id, req.body);
      res.json({ bank_account: account });
    } catch (err) {
      next(err);
    }
  }

  async deactivateBankAccount(req, res, next) {
    try {
      await accountsService.deactivateBankAccount(req.params.id);
      res.json({ message: "Bank account deactivated" });
    } catch (err) {
      next(err);
    }
  }

  async getMoneyTransfers(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await accountsService.getMoneyTransfers(page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createMoneyTransfer(req, res, next) {
    try {
      const transfer = await accountsService.createMoneyTransfer(req.body, req.user.id);
      res.status(201).json({ transfer, message: "Transfer completed" });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AccountsController();
