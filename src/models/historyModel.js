const db = require("../config/db");

const createHistory = async ({
  deviceId,
  temperature,
  humidity,
  mistStatus,
  fanStatus,
  heaterStatus,
  lightStatus,
}) => {
  const result = await db.query(
    `
    INSERT INTO history (
      device_id,
      temperature,
      humidity,
      mist_status,
      fan_status,
      heater_status,
      light_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      deviceId,
      temperature,
      humidity,
      mistStatus,
      fanStatus,
      heaterStatus,
      lightStatus,
    ]
  );

  return result.rows[0];
};

const getHistoryByDeviceId = async (deviceId, limit = 50) => {
  const result = await db.query(
    `
    SELECT id, device_id, temperature, humidity, mist_status, fan_status, heater_status, light_status,
           (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as created_at
    FROM history
    WHERE device_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [deviceId, limit]
  );

  return result.rows;
};

const getLatestHistoryByDeviceId = async (deviceId) => {
  const result = await db.query(
    `
    SELECT id, device_id, temperature, humidity, mist_status, fan_status, heater_status, light_status,
           (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as created_at
    FROM history
    WHERE device_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [deviceId]
  );

  return result.rows[0];
};

module.exports = {
  createHistory,
  getHistoryByDeviceId,
  getLatestHistoryByDeviceId,
};

// Cleanup: delete all history rows for each device that are older than the most recent day
// i.e. keep only the most recent day's history per device
const cleanupKeepLatestDayPerDevice = async () => {
  const result = await db.query(`
    DELETE FROM history h
    USING (
      SELECT device_id, max(date(created_at)) as max_date
      FROM history
      GROUP BY device_id
    ) t
    WHERE h.device_id = t.device_id AND date(h.created_at) < t.max_date
    RETURNING h.*
  `);

  return result.rowCount;
};

module.exports.cleanupKeepLatestDayPerDevice = cleanupKeepLatestDayPerDevice;