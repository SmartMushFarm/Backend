const { pool } = require('../config/db');

const Preset = {
    findAll: async (userId) => {
        if (userId) {
            const result = await pool.query(
                `SELECT * FROM presets WHERE is_recommended = true OR created_by = $1 ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows;
        }
        const result = await pool.query(`SELECT * FROM presets ORDER BY created_at DESC`);
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(`SELECT * FROM presets WHERE id = $1`, [id]);
        return result.rows[0] || null;
    },

    create: async (data) => {
        const {
            preset_name,
            mushroom_type,
            mist_on_humidity,
            mist_off_humidity,
            fan_on_humidity,
            fan_off_humidity,
            heater_on_temp,
            heater_off_temp,
            danger_humidity,
            max_temp_danger,
            mist_pulse_on_seconds,
            mist_pulse_off_seconds,
            created_by,
            is_recommended,
        } = data;
        const result = await pool.query(
            `INSERT INTO presets (
                preset_name, mushroom_type, mist_on_humidity, mist_off_humidity,
                fan_on_humidity, fan_off_humidity, heater_on_temp, heater_off_temp,
                danger_humidity, max_temp_danger, mist_pulse_on_seconds, mist_pulse_off_seconds,
                created_by, is_recommended
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [
                preset_name,
                mushroom_type || null,
                mist_on_humidity || null,
                mist_off_humidity || null,
                fan_on_humidity || null,
                fan_off_humidity || null,
                heater_on_temp || null,
                heater_off_temp || null,
                danger_humidity || null,
                max_temp_danger || null,
                mist_pulse_on_seconds || null,
                mist_pulse_off_seconds || null,
                created_by || null,
                is_recommended || false,
            ]
        );
        return result.rows[0];
    },

    update: async (id, data) => {
        const {
            preset_name,
            mushroom_type,
            mist_on_humidity,
            mist_off_humidity,
            fan_on_humidity,
            fan_off_humidity,
            heater_on_temp,
            heater_off_temp,
            danger_humidity,
            max_temp_danger,
            mist_pulse_on_seconds,
            mist_pulse_off_seconds,
            is_recommended,
        } = data;
        const result = await pool.query(
            `UPDATE presets SET
                preset_name = COALESCE($1, preset_name),
                mushroom_type = COALESCE($2, mushroom_type),
                mist_on_humidity = COALESCE($3, mist_on_humidity),
                mist_off_humidity = COALESCE($4, mist_off_humidity),
                fan_on_humidity = COALESCE($5, fan_on_humidity),
                fan_off_humidity = COALESCE($6, fan_off_humidity),
                heater_on_temp = COALESCE($7, heater_on_temp),
                heater_off_temp = COALESCE($8, heater_off_temp),
                danger_humidity = COALESCE($9, danger_humidity),
                max_temp_danger = COALESCE($10, max_temp_danger),
                mist_pulse_on_seconds = COALESCE($11, mist_pulse_on_seconds),
                mist_pulse_off_seconds = COALESCE($12, mist_pulse_off_seconds),
                is_recommended = COALESCE($13, is_recommended)
             WHERE id = $14 RETURNING *`,
            [
                preset_name,
                mushroom_type,
                mist_on_humidity,
                mist_off_humidity,
                fan_on_humidity,
                fan_off_humidity,
                heater_on_temp,
                heater_off_temp,
                danger_humidity,
                max_temp_danger,
                mist_pulse_on_seconds,
                mist_pulse_off_seconds,
                is_recommended,
                id,
            ]
        );
        return result.rows[0] || null;
    },

    delete: async (id) => {
        const result = await pool.query(`DELETE FROM presets WHERE id = $1 RETURNING *`, [id]);
        return result.rows[0] || null;
    },

    applyToDevice: async (deviceId, presetId) => {
        // Simple apply: set device.mode = 'Auto' and devices.preset_id = presetId
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update device row with applied preset
            const r = await client.query(`UPDATE devices SET mode = 'Auto', preset_id = $1 WHERE id = $2 RETURNING *`, [presetId, deviceId]);

            await client.query('COMMIT');
            return r.rows[0] || null;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },
};

module.exports = Preset;
