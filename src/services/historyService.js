const historyModel = require("../models/historyModel");

const getHistoryByDeviceId = async (deviceId, limit = 50) => {
  return await historyModel.getHistoryByDeviceId(deviceId, limit);
};

const getLatestHistoryByDeviceId = async (deviceId) => {
  return await historyModel.getLatestHistoryByDeviceId(deviceId);
};

module.exports = {
  getHistoryByDeviceId,
  getLatestHistoryByDeviceId,
};