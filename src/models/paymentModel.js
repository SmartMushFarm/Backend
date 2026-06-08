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
};

module.exports = Payment;
