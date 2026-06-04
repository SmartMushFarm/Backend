const { pool } = require('../config/db');

const Maintenance = {
    create: async ({ userId, deviceId, title, description, priority }) => {
        const result = await pool.query(
            `INSERT INTO maintenance_requests (user_id, device_id, title, description, priority)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, deviceId, title, description || null, priority || 'Normal']
        );
        return result.rows[0];
    },

    findByUserId: async (userId) => {
        const result = await pool.query(
            `SELECT mr.*, d.device_name FROM maintenance_requests mr
             JOIN devices d ON mr.device_id = d.id
             WHERE mr.user_id = $1 ORDER BY mr.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(
            `SELECT mr.*,
                d.device_name, d.current_temperature, d.current_humidity,
                u.name as user_name, u.email as user_email, u.phone as user_phone,
                a.name as assigned_admin_name
             FROM maintenance_requests mr
             JOIN devices d ON mr.device_id = d.id
             JOIN users u ON mr.user_id = u.id
             LEFT JOIN users a ON mr.assigned_admin_id = a.id
             WHERE mr.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    findAll: async (filters = {}) => {
        const { status } = filters;
        const values = [];
        const where = status ? (values.push(status), `WHERE mr.status = $1`) : '';
        const result = await pool.query(
            `SELECT mr.*, d.device_name, u.name as user_name, a.name as assigned_admin_name
             FROM maintenance_requests mr
             JOIN devices d ON mr.device_id = d.id
             JOIN users u ON mr.user_id = u.id
             LEFT JOIN users a ON mr.assigned_admin_id = a.id
             ${where}
             ORDER BY mr.created_at DESC`,
            values
        );
        return result.rows;
    },

    findByAssignedAdminId: async (adminId) => {
        const result = await pool.query(
            `SELECT mr.*, d.device_name, u.name as user_name
             FROM maintenance_requests mr
             JOIN devices d ON mr.device_id = d.id
             JOIN users u ON mr.user_id = u.id
             WHERE mr.assigned_admin_id = $1
             ORDER BY mr.created_at DESC`,
            [adminId]
        );
        return result.rows;
    },

    updateStatus: async (id, status, extra = {}) => {
        const { assignedAdminId, scheduledDate, adminNote, completedAt } = extra;
        const result = await pool.query(
            `UPDATE maintenance_requests SET
                status = $1,
                assigned_admin_id = COALESCE($2, assigned_admin_id),
                scheduled_date = COALESCE($3, scheduled_date),
                admin_note = COALESCE($4, admin_note),
                completed_at = COALESCE($5, completed_at)
             WHERE id = $6 RETURNING *`,
            [status, assignedAdminId || null, scheduledDate || null, adminNote || null, completedAt || null, id]
        );
        return result.rows[0] || null;
    },
};

module.exports = Maintenance;
