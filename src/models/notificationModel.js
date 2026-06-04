const { pool } = require('../config/db');

const Notification = {
    create: async ({ userId, title, message, type }) => {
        const result = await pool.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *`,
            [userId, title, message || null, type || 'Info']
        );
        return result.rows[0];
    },

    findByUserId: async (userId) => {
        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    markRead: async (id, userId) => {
        const result = await pool.query(
            `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, userId]
        );
        return result.rows[0] || null;
    },

    markAllRead: async (userId) => {
        await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [userId]);
    },
};

module.exports = Notification;
