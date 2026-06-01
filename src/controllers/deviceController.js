const deviceService = require("../services/deviceService");
const mqttService = require("../services/mqttService");

const getAllDevices = async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();

    res.status(200).json({
      success: true,
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await deviceService.getDeviceById(id);

    res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const controlDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { device, action } = req.body;

    const validDevices = ["fan", "heater", "mist", "all"];
    const validActions = ["on", "off"];

    if (!device || !action) {
      return res.status(400).json({
        success: false,
        message: "device and action are required",
        example: {
          device: "fan",
          action: "on",
        },
      });
    }

    if (!validDevices.includes(device)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device",
        validDevices,
      });
    }

    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action",
        validActions,
      });
    }

    const targetDevice = await deviceService.getDeviceById(id);

    const result = await mqttService.publishCommand({
      deviceName: targetDevice.device_name,
      device,
      action,
    });

    res.status(200).json({
      success: true,
      message: "Command sent successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllDevices,
  getDeviceById,
  controlDevice,
};