const historyService = require("../services/historyService");

const getHistoryByDeviceId = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = Number(req.query.limit) || 50;

    const histories = await historyService.getHistoryByDeviceId(
      deviceId,
      limit
    );

    res.status(200).json({
      success: true,
      total: histories.length,
      data: histories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLatestHistoryByDeviceId = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const history = await historyService.getLatestHistoryByDeviceId(deviceId);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getHistoryByDeviceId,
  getLatestHistoryByDeviceId,
};