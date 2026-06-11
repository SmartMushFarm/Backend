const { pool } = require('../config/db');

const Device = {
    findByUserId: async (userId) => {
        // Exclude claim_code from user-facing results to avoid leaking claim codes
        const result = await pool.query(
            `SELECT d.id, d.owner_id, d.product_id, d.device_name, d.current_humidity, d.current_temperature,
                    d.status, d.mist_status, d.fan_status, d.heater_status, d.light_status, d.mode, d.preset_id,
                    p.name as product_name, d.created_at
             FROM devices d
             LEFT JOIN products p ON d.product_id = p.id
             WHERE d.owner_id = $1 ORDER BY d.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(
            `SELECT d.*, p.name as product_name FROM devices d
             LEFT JOIN products p ON d.product_id = p.id
             WHERE d.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },

    // New: find device by claim code (exact match)
    findDeviceByClaimCode: async (claimCode) => {
        const result = await pool.query(`SELECT * FROM devices WHERE claim_code = $1`, [claimCode]);
        return result.rows[0] || null;
    },

    // New: check if a claim code exists (not null)
    isClaimCodeExists: async (claimCode) => {
        const result = await pool.query(`SELECT 1 FROM devices WHERE claim_code = $1 LIMIT 1`, [claimCode]);
        return result.rowCount > 0;
    },

    // New: set claim_code for a device
    generateClaimCodeForDevice: async (deviceId, claimCode) => {
        const result = await pool.query(`UPDATE devices SET claim_code = $1 WHERE id = $2 RETURNING *`, [claimCode, deviceId]);
        return result.rows[0] || null;
    },

    // New: claim a device by id for a user (set owner_id and clear claim_code)
    claimDeviceById: async (deviceId, userId) => {
        const result = await pool.query(
            `UPDATE devices SET owner_id = $1, claim_code = NULL WHERE id = $2 RETURNING *`,
            [userId, deviceId]
        );
        return result.rows[0] || null;
    },

    // New: remove owner from device (unbind)
    removeOwnerFromDevice: async (deviceId) => {
        const result = await pool.query(
            `UPDATE devices SET owner_id = NULL, preset_id = NULL, mode = 'Manual', claim_code = NULL WHERE id = $1 RETURNING *`,
            [deviceId]
        );
        return result.rows[0] || null;
    },

    findDeviceByName: async (deviceName) => {
        const result = await pool.query(
            `SELECT * FROM devices WHERE device_name = $1`,
            [deviceName]
        );
        return result.rows[0] || null;
    },

    create: async ({ userId, productId, deviceName }) => {
        const result = await pool.query(
            `INSERT INTO devices (owner_id, product_id, device_name) VALUES ($1, $2, $3) RETURNING *`,
            [userId, productId || null, deviceName]
        );
        return result.rows[0];
    },

    update: async (id, fields) => {
        const { device_name, status } = fields;
        const result = await pool.query(
            `UPDATE devices SET device_name = COALESCE($1, device_name), status = COALESCE($2, status) WHERE id = $3 RETURNING *`,
            [device_name, status, id]
        );
        return result.rows[0] || null;
    },

    delete: async (id) => {
        const result = await pool.query(`UPDATE devices SET status = 'Inactive' WHERE id = $1 RETURNING *`, [id]);
        return result.rows[0] || null;
    },

    updateSensorData: async (id, data) => {
        const { temperature, humidity, mist_status, fan_status, heater_status, light_status } = data;
        const result = await pool.query(
            `UPDATE devices SET
                current_temperature = COALESCE($1, current_temperature),
                current_humidity = COALESCE($2, current_humidity),
                mist_status = COALESCE($3, mist_status),
                fan_status = COALESCE($4, fan_status),
                heater_status = COALESCE($5, heater_status),
                                light_status = COALESCE($6, light_status)
             WHERE id = $7 RETURNING *`,
            [temperature, humidity, mist_status, fan_status, heater_status, light_status, id]
        );
        return result.rows[0] || null;
    },

    updateDeviceFromSensor: async ({ id, currentHumidity, currentTemperature, mistStatus, fanStatus, heaterStatus, lightStatus, status }) => {
        const result = await pool.query(
            `UPDATE devices SET
                current_humidity = $1,
                current_temperature = $2,
                mist_status = $3,
                fan_status = $4,
                heater_status = $5,
                                light_status = $6,
                                status = $7
             WHERE id = $8 RETURNING *`,
            [currentHumidity, currentTemperature, mistStatus, fanStatus, heaterStatus, lightStatus, status, id]
        );
        return result.rows[0];
    },

    updateControl: async (id, data) => {
        const { mist_status, fan_status, heater_status, light_status, mode } = data;
        const result = await pool.query(
            `UPDATE devices SET
                mist_status = COALESCE($1, mist_status),
                fan_status = COALESCE($2, fan_status),
                heater_status = COALESCE($3, heater_status),
                light_status = COALESCE($4, light_status),
                mode = COALESCE($5, mode)
             WHERE id = $6 RETURNING *`,
            [mist_status, fan_status, heater_status, light_status, mode, id]
        );
        return result.rows[0] || null;
    },

    updateMode: async (id, mode) => {
        // If switching to Manual, deactivate any active device_presets and clear preset reference on device (if column exists)
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (mode === 'Manual') {
                // Clear preset_id on device when switching to Manual
                await client.query(`UPDATE devices SET preset_id = NULL WHERE id = $1`, [id]);
            }

            const result = await client.query(`UPDATE devices SET mode = $1 WHERE id = $2 RETURNING *`, [mode, id]);

            await client.query('COMMIT');
            return result.rows[0] || null;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    updateDeviceOutputStatus: async ({ id, mistStatus, fanStatus, heaterStatus, lightStatus, status }) => {
        const result = await pool.query(
            `UPDATE devices SET
                mist_status = COALESCE($1, mist_status),
                fan_status = COALESCE($2, fan_status),
                heater_status = COALESCE($3, heater_status),
                                light_status = COALESCE($4, light_status),
                                status = COALESCE($5, status)
             WHERE id = $6 RETURNING *`,
            [mistStatus, fanStatus, heaterStatus, lightStatus, status, id]
        );
        return result.rows[0];
    },

    insertSensorHistory: async ({ deviceId, temperature, humidity, mist_status, fan_status, heater_status, light_status }) => {
        const result = await pool.query(
            `INSERT INTO history (device_id, temperature, humidity, mist_status, fan_status, heater_status, light_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [deviceId, temperature, humidity, mist_status, fan_status, heater_status, light_status]
        );
        return result.rows[0];
    },

    getHistory: async (deviceId, from, to) => {
        const conditions = [`device_id = $1`];
        const values = [deviceId];
        if (from) { values.push(from); conditions.push(`created_at >= $${values.length}`); }
        if (to) { values.push(to); conditions.push(`created_at <= $${values.length}`); }
        const result = await pool.query(
            `SELECT * FROM history WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 500`,
            values
        );
        return result.rows;
    },

    getAll: async () => {
        const result = await pool.query(`SELECT * FROM devices ORDER BY created_at DESC`);
        return result.rows;
    },
};

module.exports = Device;
