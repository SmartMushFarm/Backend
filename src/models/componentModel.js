const { pool } = require('../config/db');

const Component = {
    findAll: async () => {
        const result = await pool.query(`SELECT * FROM components ORDER BY created_at DESC`);
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(`SELECT * FROM components WHERE id = $1`, [id]);
        return result.rows[0] || null;
    },

    create: async ({ name, description, default_price }) => {
        const result = await pool.query(
            `INSERT INTO components (name, description, default_price) VALUES ($1, $2, $3) RETURNING *`,
            [name, description || null, default_price || 0]
        );
        return result.rows[0];
    },

    update: async (id, { name, description, default_price, status }) => {
        const result = await pool.query(
            `UPDATE components SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                default_price = COALESCE($3, default_price),
                status = COALESCE($4, status)
             WHERE id = $5 RETURNING *`,
            [name, description, default_price, status, id]
        );
        return result.rows[0] || null;
    },

    delete: async (id) => {
        const result = await pool.query(
            `UPDATE components SET status = 'Inactive' WHERE id = $1 RETURNING *`, [id]
        );
        return result.rows[0] || null;
    },

    // Device Components
    getDeviceComponents: async (deviceId) => {
        const result = await pool.query(
            `SELECT dc.*, c.name as component_name, c.description, c.default_price
             FROM device_components dc
             JOIN components c ON dc.component_id = c.id
             WHERE dc.device_id = $1`,
            [deviceId]
        );
        return result.rows;
    },

    addToDevice: async ({ deviceId, componentId, quantity, status }) => {
        const result = await pool.query(
            `INSERT INTO device_components (device_id, component_id, quantity, status) VALUES ($1, $2, $3, $4) RETURNING *`,
            [deviceId, componentId, quantity || 1, status || 'Working']
        );
        return result.rows[0];
    },

    updateDeviceComponent: async (id, { status, quantity }) => {
        const result = await pool.query(
            `UPDATE device_components SET
                status = COALESCE($1, status),
                quantity = COALESCE($2, quantity)
             WHERE id = $3 RETURNING *`,
            [status, quantity, id]
        );
        return result.rows[0] || null;
    },

    findDeviceComponentById: async (id) => {
        const result = await pool.query(
            `SELECT dc.*, d.owner_id FROM device_components dc JOIN devices d ON dc.device_id = d.id WHERE dc.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },
};

module.exports = Component;
