const { pool } = require('../config/db');

const Promotion = {
  find: async () => {
    const result = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM promotions WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  findByCode: async (code) => {
    const result = await pool.query('SELECT * FROM promotions WHERE LOWER(code) = LOWER($1)', [code]);
    return result.rows[0] || null;
  },

  create: async ({ code, discount_percent, valid_from, valid_to, status }) => {
    const result = await pool.query(
      `INSERT INTO promotions (code, discount_percent, valid_from, valid_to, status)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'Active'))
       RETURNING *`,
      [code, discount_percent, valid_from || null, valid_to || null, status || null]
    );
    return result.rows[0];
  },

  findByIdAndUpdate: async (id, { code, discount_percent, valid_from, valid_to, status }) => {
    const result = await pool.query(
      `UPDATE promotions
       SET code = COALESCE($1, code),
           discount_percent = COALESCE($2, discount_percent),
           valid_from = $3,
           valid_to = $4,
           status = COALESCE($5, status)
       WHERE id = $6
       RETURNING *`,
      [code || null, discount_percent ?? null, valid_from || null, valid_to || null, status || null, id]
    );
    return result.rows[0] || null;
  },

  findByIdAndDelete: async (id) => {
    const result = await pool.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  },
};

module.exports = Promotion;
