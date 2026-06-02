const { pool } = require('../config/db');

const Preset = {
    findAll: async () => {
        const result = await pool.query(`SELECT * FROM presets ORDER BY created_at DESC`);
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(`SELECT * FROM presets WHERE id = $1`, [id]);
        return result.rows[0] || null;
    },

    create: async (data) => {
        const { preset_name, mushroom_type, mist_on_humidity, mist_off_humidity, heater_on_temp, heater_off_temp, danger_humidity, max_temp_danger } = data;
        const result = await pool.query(
            `INSERT INTO presets (preset_name, mushroom_type, mist_on_humidity, mist_off_humidity, heater_on_temp, heater_off_temp, danger_humidity, max_temp_danger)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [preset_name, mushroom_type, mist_on_humidity, mist_off_humidity, heater_on_temp, heater_off_temp, danger_humidity, max_temp_danger]
        );
        return result.rows[0];
    },

    update: async (id, data) => {
        const { preset_name, mushroom_type, mist_on_humidity, mist_off_humidity, heater_on_temp, heater_off_temp, danger_humidity, max_temp_danger } = data;
        const result = await pool.query(
            `UPDATE presets SET
                preset_name = COALESCE($1, preset_name),
                mushroom_type = COALESCE($2, mushroom_type),
                mist_on_humidity = COALESCE($3, mist_on_humidity),
                mist_off_humidity = COALESCE($4, mist_off_humidity),
                heater_on_temp = COALESCE($5, heater_on_temp),
                heater_off_temp = COALESCE($6, heater_off_temp),
                danger_humidity = COALESCE($7, danger_humidity),
                max_temp_danger = COALESCE($8, max_temp_danger)
             WHERE id = $9 RETURNING *`,
            [preset_name, mushroom_type, mist_on_humidity, mist_off_humidity, heater_on_temp, heater_off_temp, danger_humidity, max_temp_danger, id]
        );
        return result.rows[0] || null;
    },

    delete: async (id) => {
        const result = await pool.query(`DELETE FROM presets WHERE id = $1 RETURNING *`, [id]);
        return result.rows[0] || null;
    },

    applyToDevice: async (deviceId, presetId) => {
        // Deactivate all presets for this device
        await pool.query(`UPDATE device_presets SET is_active = false WHERE device_id = $1`, [deviceId]);

        // Check if combination exists
        const existing = await pool.query(
            `SELECT * FROM device_presets WHERE device_id = $1 AND preset_id = $2`, [deviceId, presetId]
        );

        if (existing.rows[0]) {
            const result = await pool.query(
                `UPDATE device_presets SET is_active = true, applied_at = NOW() WHERE device_id = $1 AND preset_id = $2 RETURNING *`,
                [deviceId, presetId]
            );
            return result.rows[0];
        }

        const result = await pool.query(
            `INSERT INTO device_presets (device_id, preset_id, is_active) VALUES ($1, $2, true) RETURNING *`,
            [deviceId, presetId]
        );
        await pool.query(`UPDATE devices SET mode = 'Auto' WHERE id = $1`, [deviceId]);
        return result.rows[0];
    },
};

module.exports = Preset;
