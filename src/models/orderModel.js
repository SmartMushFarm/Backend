const { pool } = require('../config/db');

const Order = {
    create: async (client, { userId, shippingAddress, totalAmount, promotionId }) => {
        const result = await client.query(
            `INSERT INTO orders (user_id, shipping_address, total_amount, promotion_id)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [userId, shippingAddress, totalAmount, promotionId || null]
        );
        return result.rows[0];
    },

    createDetail: async (client, { orderId, productId, quantity, unitPrice }) => {
        const result = await client.query(
            `INSERT INTO order_details (order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [orderId, productId, quantity, unitPrice]
        );
        return result.rows[0];
    },

    decrementStock: async (client, productId, quantity) => {
        await client.query(
            `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
            [quantity, productId]
        );
    },

    findByUserId: async (userId) => {
        const result = await pool.query(
            `SELECT o.*,
                (SELECT json_agg(od) FROM (
                    SELECT od.*, p.name as product_name, p.image_url
                    FROM order_details od JOIN products p ON od.product_id = p.id
                    WHERE od.order_id = o.id
                ) od) as items
             FROM orders o
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(
            `SELECT o.*,
                (SELECT json_agg(od) FROM (
                    SELECT od.*, p.name as product_name, p.image_url
                    FROM order_details od JOIN products p ON od.product_id = p.id
                    WHERE od.order_id = o.id
                ) od) as items
             FROM orders o
             WHERE o.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    findAll: async (filters = {}) => {
        const { status } = filters;
        const conditions = status ? `WHERE o.status = '${status}'` : '';
        const result = await pool.query(
            `SELECT o.*, u.name as user_name, u.email as user_email
             FROM orders o
             JOIN users u ON o.user_id = u.id
             ${conditions}
             ORDER BY o.created_at DESC`
        );
        return result.rows;
    },

    updateStatus: async (id, status) => {
        const result = await pool.query(
            `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, id]
        );
        return result.rows[0] || null;
    },

    findPromotion: async (promotionId) => {
        const result = await pool.query(`SELECT * FROM promotions WHERE id = $1`, [promotionId]);
        return result.rows[0] || null;
    },
};

module.exports = Order;
