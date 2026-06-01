const deviceModel = require("../models/deviceModel");
const historyModel = require("../models/historyModel");

const getAllDevices = async () => {
  return await deviceModel.getAllDevices();
};

const getDeviceById = async (id) => {
  const device = await deviceModel.findDeviceById(id);

  if (!device) {
    throw new Error("Device not found");
  }

  return device;
};

const saveMqttSensorData = async (mqttData) => {
  const deviceName = mqttData.deviceId;

  if (!deviceName) {
    console.log("MQTT sensor missing deviceId");
    return null;
  }

  const device = await deviceModel.findDeviceByName(deviceName);

  if (!device) {
    console.log("Device not found in DB:", deviceName);
    return null;
  }

  const outputStatus = mqttData.outputStatus || mqttData.relayStatus || {};

  const temperature = Number(mqttData.temperature);
  const humidity = Number(mqttData.humidity);

  if (Number.isNaN(temperature) || Number.isNaN(humidity)) {
    console.log("Invalid temperature or humidity:", mqttData);
    return null;
  }

  const mistStatus = outputStatus.mist ?? false;
  const fanStatus = outputStatus.fan ?? false;
  const heaterStatus = outputStatus.heater ?? false;
  const lightStatus = outputStatus.light ?? false;

  const history = await historyModel.createHistory({
    deviceId: device.id,
    temperature,
    humidity,
    mistStatus,
    fanStatus,
    heaterStatus,
    lightStatus,
  });

  const updatedDevice = await deviceModel.updateDeviceFromSensor({
    id: device.id,
    currentHumidity: humidity,
    currentTemperature: temperature,
    mistStatus,
    fanStatus,
    heaterStatus,
    lightStatus,
    status: "online",
  });

  return {
    history,
    device: updatedDevice,
  };
};

const saveMqttStatusData = async (mqttData) => {
  const deviceName = mqttData.deviceId;

  if (!deviceName) {
    console.log("MQTT status missing deviceId");
    return null;
  }

  const device = await deviceModel.findDeviceByName(deviceName);

  if (!device) {
    console.log("Device not found in DB:", deviceName);
    return null;
  }

  const outputStatus = mqttData.outputStatus || mqttData.relayStatus || {};

  const updatedDevice = await deviceModel.updateDeviceOutputStatus({
    id: device.id,
    mistStatus: outputStatus.mist,
    fanStatus: outputStatus.fan,
    heaterStatus: outputStatus.heater,
    lightStatus: outputStatus.light,
    status: "online",
  });

  return updatedDevice;
};

module.exports = {
  getAllDevices,
  getDeviceById,
  saveMqttSensorData,
  saveMqttStatusData,
};