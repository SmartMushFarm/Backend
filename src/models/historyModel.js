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
    SELECT *
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
    SELECT *
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