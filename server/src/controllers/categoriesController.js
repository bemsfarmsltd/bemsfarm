const pool = require('../db/pool');

// GET /api/categories
const getCategories = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY id ASC'
    );
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories };