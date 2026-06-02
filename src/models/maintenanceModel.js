const { pool } = require('../config/db');

const Maintenance = {
    create: async ({ userId, deviceId, title, description, priority }) => {
        const result = await pool.query(
            `INSERT INTO maintenance_requests (user_id, device_id, title, description, priority)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, deviceId, title, description || null, priority || 'Medium']
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
                u.full_name as user_name, u.email as user_email, u.phone_number as user_phone,
                t.full_name as technician_name
             FROM maintenance_requests mr
             JOIN devices d ON mr.device_id = d.id
             JOIN "User" u ON mr.user_id = u.id
             LEFT JOIN "User" t ON mr.technician_id = t.id
             WHERE mr.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    findAll: async (filters = {}) => {
        const { status } = filters;
        const where = status ? `WHERE mr.status = '${status}'` : '';
        const result = await pool.query(
            `SELECT mr.*, d.device_name, u.full_name as user_name, t.full_name as technician_name
             FROM maintenance_requests mr
             JOIN devices d ON mr.device_id = d.id
             JOIN "User" u ON mr.user_id = u.id
             LEFT JOIN "User" t ON mr.technician_id = t.id
             ${where}
             ORDER BY mr.created_at DESC`
        );
        return result.rows;
    },

    findByTechnicianId: async (technicianId) => {
        const result = await pool.query(
            `SELECT mr.*, d.device_name, u.full_name as user_name
             FROM maintenance_requests mr
             JOIN devices d ON mr.device_id = d.id
             JOIN "User" u ON mr.user_id = u.id
             WHERE mr.technician_id = $1
             ORDER BY mr.created_at DESC`,
            [technicianId]
        );
        return result.rows;
    },

    updateStatus: async (id, status, extra = {}) => {
        const { technicianId, scheduledDate, adminNote } = extra;
        const result = await pool.query(
            `UPDATE maintenance_requests SET
                status = $1,
                updated_at = NOW(),
                technician_id = COALESCE($2, technician_id),
                scheduled_date = COALESCE($3, scheduled_date),
                admin_note = COALESCE($4, admin_note)
             WHERE id = $5 RETURNING *`,
            [status, technicianId || null, scheduledDate || null, adminNote || null, id]
        );
        return result.rows[0] || null;
    },

    saveBrokenComponents: async (maintenanceId, brokenComponents) => {
        // Delete existing first
        await pool.query(`DELETE FROM maintenance_broken_components WHERE maintenance_request_id = $1`, [maintenanceId]);
        const results = [];
        for (const bc of brokenComponents) {
            const r = await pool.query(
                `INSERT INTO maintenance_broken_components (maintenance_request_id, device_component_id, note, repair_action, price)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [maintenanceId, bc.device_component_id, bc.note || null, bc.repair_action || 'Repair', bc.price || 0]
            );
            results.push(r.rows[0]);
            // Update device component status
            const dcStatus = bc.repair_action === 'Replace' ? 'Replaced' : 'Maintenance';
            await pool.query(`UPDATE device_components SET status = $1 WHERE id = $2`, [dcStatus, bc.device_component_id]);
        }
        return results;
    },

    getBrokenComponents: async (maintenanceId) => {
        const result = await pool.query(
            `SELECT mbc.*, dc.component_id, c.name as component_name
             FROM maintenance_broken_components mbc
             JOIN device_components dc ON mbc.device_component_id = dc.id
             JOIN components c ON dc.component_id = c.id
             WHERE mbc.maintenance_request_id = $1`,
            [maintenanceId]
        );
        return result.rows;
    },
};

module.exports = Maintenance;
