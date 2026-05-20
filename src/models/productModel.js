const { pool } = require('../config/db');

const Product = {
    //1. Lấy danh sách sản phẩm (có thông tin category)
    find: async () => {
        const query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows; // Trả về thẳng mảng danh sách sản phẩm
    },
    //2. Lấy chi tiết sản phẩm theo ID (có thông tin category)
    findById: async (id) => {
        const query = `
      SELECT p.*, c.name as category_name
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null; // Trả về sản phẩm đầu tiên (nếu có)
    },
    // 3. Thêm mới sản phẩm
  create: async (productData) => {
    const { name, description, price, stock_quantity, image_url, status, category_id } = productData;
    const query = `
      INSERT INTO products (name, description, price, stock_quantity, image_url, status, category_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `;
    const values = [name, description, price, stock_quantity, image_url, status || 'active', category_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },
    // 4. Cập nhật sản phẩm
  findByIdAndUpdate: async (id, updateData) => {
    const { name, description, price, stock_quantity, image_url, status, category_id } = updateData;
    const query = `
      UPDATE products 
      SET name = $1, description = $2, price = $3, stock_quantity = $4, image_url = $5, status = $6, category_id = $7
      WHERE id = $8 
      RETURNING *
    `;
    const values = [name, description, price, stock_quantity, image_url, status, category_id, id];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },
    /// 5. Xóa sản phẩm
  findByIdAndDelete: async (id) => {
    const query = `DELETE FROM products WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
};

module.exports = Product;