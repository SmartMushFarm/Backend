const { pool } = require('../config/db');

const RepairBill = {
    create: async ({ maintenanceRequestId, totalAmount }) => {
        const result = await pool.query(
            `INSERT INTO repair_bills (maintenance_request_id, total_amount) VALUES ($1, $2) RETURNING *`,
            [maintenanceRequestId, totalAmount]
        );
        return result.rows[0];
    },

    findByUserId: async (userId) => {
        const result = await pool.query(
            `SELECT rb.*, mr.title as maintenance_title, mr.device_id
             FROM repair_bills rb
             JOIN maintenance_requests mr ON rb.maintenance_request_id = mr.id
             WHERE mr.user_id = $1
             ORDER BY rb.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(
            `SELECT rb.*, mr.title as maintenance_title, mr.user_id, mr.device_id,
                (SELECT json_agg(mbc) FROM (
                    SELECT mbc.*, c.name as component_name
                    FROM maintenance_broken_components mbc
                    JOIN device_components dc ON mbc.device_component_id = dc.id
                    JOIN components c ON dc.component_id = c.id
                    WHERE mbc.maintenance_request_id = mr.id
                ) mbc) as broken_components
             FROM repair_bills rb
             JOIN maintenance_requests mr ON rb.maintenance_request_id = mr.id
             WHERE rb.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    findByMaintenanceId: async (maintenanceId) => {
        const result = await pool.query(
            `SELECT * FROM repair_bills WHERE maintenance_request_id = $1`, [maintenanceId]
        );
        return result.rows[0] || null;
    },

    pay: async (id) => {
        const result = await pool.query(
            `UPDATE repair_bills SET status = 'Paid', paid_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );
        return result.rows[0] || null;
    },
};

module.exports = RepairBill;
