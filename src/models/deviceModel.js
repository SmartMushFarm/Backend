const db = require("../config/db");

const getAllDevices = async () => {
  const result = await db.query(`
    SELECT *
    FROM devices
    ORDER BY id ASC
  `);

  return result.rows;
};

const findDeviceById = async (id) => {
  const result = await db.query(
    `
    SELECT *
    FROM devices
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
};

const findDeviceByName = async (deviceName) => {
  const result = await db.query(
    `
    SELECT *
    FROM devices
    WHERE device_name = $1
    `,
    [deviceName]
  );

  return result.rows[0];
};

const updateDeviceFromSensor = async ({
  id,
  currentHumidity,
  currentTemperature,
  mistStatus,
  fanStatus,
  heaterStatus,
  lightStatus,
  status,
}) => {
  const result = await db.query(
    `
    UPDATE devices
    SET
      current_humidity = $1,
      current_temperature = $2,
      mist_status = $3,
      fan_status = $4,
      heater_status = $5,
      light_status = $6,
      status = $7
    WHERE id = $8
    RETURNING *
    `,
    [
      currentHumidity,
      currentTemperature,
      mistStatus,
      fanStatus,
      heaterStatus,
      lightStatus,
      status,
      id,
    ]
  );

  return result.rows[0];
};

const updateDeviceOutputStatus = async ({
  id,
  mistStatus,
  fanStatus,
  heaterStatus,
  lightStatus,
  status,
}) => {
  const result = await db.query(
    `
    UPDATE devices
    SET
      mist_status = COALESCE($1, mist_status),
      fan_status = COALESCE($2, fan_status),
      heater_status = COALESCE($3, heater_status),
      light_status = COALESCE($4, light_status),
      status = COALESCE($5, status)
    WHERE id = $6
    RETURNING *
    `,
    [mistStatus, fanStatus, heaterStatus, lightStatus, status, id]
  );

  return result.rows[0];
};

module.exports = {
  getAllDevices,
  findDeviceById,
  findDeviceByName,
  updateDeviceFromSensor,
  updateDeviceOutputStatus,
};