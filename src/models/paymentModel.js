const { pool } = require('../config/db');

const Payment = {
    create: async ({ orderId, paymentMethod, amount }) => {
        const result = await pool.query(
            `INSERT INTO payments (order_id, payment_method, amount) VALUES ($1, $2, $3) RETURNING *`,
            [orderId, paymentMethod, amount]
        );
        return result.rows[0];
    },

    findByOrderId: async (orderId) => {
        const result = await pool.query(`SELECT * FROM payments WHERE order_id = $1`, [orderId]);
        return result.rows[0] || null;
    },

    findById: async (id) => {
        const result = await pool.query(`SELECT * FROM payments WHERE id = $1`, [id]);
        return result.rows[0] || null;
    },

    confirm: async (id) => {
        const result = await pool.query(
            `UPDATE payments SET payment_status = 'Paid', paid_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );
        return result.rows[0] || null;
    },
};

module.exports = Payment;
