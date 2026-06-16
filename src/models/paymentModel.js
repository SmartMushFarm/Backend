const { pool } = require('../config/db');

const Payment = {
    create: async ({ order_id, payment_method, amount, qr_code }) => {
        const result = await pool.query(
            `INSERT INTO payments (order_id, payment_method, amount, qr_code) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [order_id, payment_method, amount, qr_code || null]
        );
        return result.rows[0];
    },

    findByOrderId: async (order_id) => {
        const result = await pool.query(`SELECT * FROM payments WHERE order_id = $1`, [order_id]);
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

    // PayOS v2: mark paid idempotent — chỉ update nếu chưa Paid
    markPaid: async (id, { payosReference } = {}) => {
        const result = await pool.query(
            `UPDATE payments SET payment_status = 'Paid', paid_at = NOW(), qr_code = COALESCE($2, qr_code)
             WHERE id = $1 AND payment_status != 'Paid' RETURNING *`,
            [id, payosReference || null]
        );
        return result.rows[0] || null;
    },

    updateFailed: async (id) => {
        const result = await pool.query(
            `UPDATE payments SET payment_status = 'Failed' WHERE id = $1 AND payment_status = 'Pending' RETURNING *`,
            [id]
        );
        return result.rows[0] || null;
    },
};

module.exports = Payment;
