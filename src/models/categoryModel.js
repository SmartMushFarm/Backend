const { pool } = require('../config/db');

const Category = {
  find: async () => {
    const query = 'SELECT * FROM categories ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  },

  findById: async (id) => {
    const query = 'SELECT * FROM categories WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  create: async (categoryData) => {
    const { name } = categoryData;
    const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING *';
    const result = await pool.query(query, [name]);
    return result.rows[0];
  },

  findByIdAndUpdate: async (id, updateData) => {
    const { name } = updateData;
    const query = `
      UPDATE categories
      SET name = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [name, id]);
    return result.rows[0] || null;
  },

  findByIdAndDelete: async (id) => {
    const query = 'DELETE FROM categories WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },
};

module.exports = Category;