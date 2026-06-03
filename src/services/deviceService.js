const Device = require('../models/deviceModel');
const historyModel = require('../models/historyModel');
const Preset = require('../models/presetModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const assertOwner = (device, userId, role) => {
    if (!device) throw createHttpError(404, 'Device not found');
    if (role !== 'Admin' && device.owner_id !== userId) throw createHttpError(403, 'Forbidden');
};

const deviceService = {
    getMyDevices: async (userId) => Device.findByUserId(userId),

    getAllDevices: async () => Device.getAll(),

    createDevice: async (userId, { product_id, device_name }) => {
        if (!device_name) throw createHttpError(400, 'device_name is required');
        return Device.create({ userId, productId: product_id, deviceName: device_name });
    },

    getDeviceById: async (id, user) => {
        const device = await Device.findById(id);
        if (user) assertOwner(device, user.id, user.role);
        else if (!device) throw createHttpError(404, 'Device not found');
        return device;
    },

    updateDevice: async (id, userId, role, data) => {
        const device = await Device.findById(id);
        assertOwner(device, userId, role);
        return Device.update(id, data);
    },

    deleteDevice: async (id, userId, role) => {
        const device = await Device.findById(id);
        assertOwner(device, userId, role);
        return Device.delete(id);
    },

    submitSensorData: async (deviceId, data) => {
        const device = await Device.findById(deviceId);
        if (!device) throw createHttpError(404, 'Device not found');

        await Device.updateSensorData(deviceId, data);
        await Device.insertSensorHistory({ deviceId, ...data });

        const warnings = [];
        if (data.humidity > 90) warnings.push(`Humidity critical: ${data.humidity}%`);
        if (data.temperature > 35) warnings.push(`Temperature too high: ${data.temperature}°C`);
        if (warnings.length > 0) {
                try {
                    const Notif = require('../models/notificationModel');
                    await Notif.create({
                        userId: device.owner_id,
                        title: 'Device Alert',
                        message: warnings.join(', '),
                        type: 'DeviceAlert',
                    });
                } catch (_) {}
        }

        return Device.findById(deviceId);
    },

    // MQTT: save sensor data from IoT device by device_name
    saveMqttSensorData: async (mqttData) => {
        const deviceName = mqttData.deviceId;
        if (!deviceName) { console.log('MQTT sensor missing deviceId'); return null; }

        const device = await Device.findDeviceByName(deviceName);
        if (!device) { console.log('Device not found in DB:', deviceName); return null; }

        const outputStatus = mqttData.outputStatus || mqttData.relayStatus || {};
        const temperature = Number(mqttData.temperature);
        const humidity = Number(mqttData.humidity);
        if (Number.isNaN(temperature) || Number.isNaN(humidity)) { console.log('Invalid temperature or humidity:', mqttData); return null; }

        const mistStatus = outputStatus.mist ?? false;
        const fanStatus = outputStatus.fan ?? false;
        const heaterStatus = outputStatus.heater ?? false;
        const lightStatus = outputStatus.light ?? false;

                // Throttle history writes: only save history every 15 seconds per device
                if (!deviceService._lastHistorySavedAt) deviceService._lastHistorySavedAt = new Map();
                const lastAt = deviceService._lastHistorySavedAt.get(device.id) || 0;
                const now = Date.now();

                let history = null;
                let updatedDevice = null;

                if (now - lastAt >= 15000) {
                    // Deduplicate: check last saved history for this device to avoid near-duplicate rows
                    try {
                        const latest = await historyModel.getLatestHistoryByDeviceId(device.id);
                        if (latest) {
                            const latestTime = new Date(latest.created_at).getTime();
                            const tempEqual = Number(latest.temperature) === temperature;
                            const humEqual = Number(latest.humidity) === humidity;
                            // If latest entry is within 2s and values equal, skip creating duplicate
                            if (Math.abs(now - latestTime) < 2000 && tempEqual && humEqual) {
                                // update device snapshot but skip history insert
                                updatedDevice = await Device.updateDeviceFromSensor({ id: device.id, currentHumidity: humidity, currentTemperature: temperature, mistStatus, fanStatus, heaterStatus, lightStatus, status: 'Active' });
                                deviceService._lastHistorySavedAt.set(device.id, now);
                            } else {
                                history = await historyModel.createHistory({ deviceId: device.id, temperature, humidity, mistStatus, fanStatus, heaterStatus, lightStatus });
                                updatedDevice = await Device.updateDeviceFromSensor({ id: device.id, currentHumidity: humidity, currentTemperature: temperature, mistStatus, fanStatus, heaterStatus, lightStatus, status: 'Active' });
                                deviceService._lastHistorySavedAt.set(device.id, now);
                            }
                        } else {
                            history = await historyModel.createHistory({ deviceId: device.id, temperature, humidity, mistStatus, fanStatus, heaterStatus, lightStatus });
                            updatedDevice = await Device.updateDeviceFromSensor({ id: device.id, currentHumidity: humidity, currentTemperature: temperature, mistStatus, fanStatus, heaterStatus, lightStatus, status: 'Active' });
                            deviceService._lastHistorySavedAt.set(device.id, now);
                        }
                    } catch (e) {
                        // on error, fallback to naive insert to avoid losing data
                        history = await historyModel.createHistory({ deviceId: device.id, temperature, humidity, mistStatus, fanStatus, heaterStatus, lightStatus });
                        updatedDevice = await Device.updateDeviceFromSensor({ id: device.id, currentHumidity: humidity, currentTemperature: temperature, mistStatus, fanStatus, heaterStatus, lightStatus, status: 'Active' });
                        deviceService._lastHistorySavedAt.set(device.id, now);
                    }
                } else {
                    // Always update device snapshot to reflect the latest ESP32 reading,
                    // even if we skip writing history. This keeps current_temperature/current_humidity up-to-date.
                    updatedDevice = await Device.updateDeviceFromSensor({ id: device.id, currentHumidity: humidity, currentTemperature: temperature, mistStatus, fanStatus, heaterStatus, lightStatus, status: 'Active' });
                }

        // Auto control: only when device in Auto mode and has preset_id
        try {
            if (updatedDevice && updatedDevice.mode === 'Auto' && updatedDevice.preset_id) {
                const preset = await Preset.findById(updatedDevice.preset_id);
                if (preset) {
                    // fire-and-forget; lazy-require to avoid circular dependency
                    const autoControl = require('./autoControlService');
                    autoControl.handleAutoControl({ device: updatedDevice, preset, temperature, humidity });
                }
            }
        } catch (e) { /* ignore auto control errors */ }

        return { history, device: updatedDevice };
    },

    // MQTT: save output status from IoT device by device_name
    saveMqttStatusData: async (mqttData) => {
        const deviceName = mqttData.deviceId;
        if (!deviceName) { console.log('MQTT status missing deviceId'); return null; }

        const device = await Device.findDeviceByName(deviceName);
        if (!device) { console.log('Device not found in DB:', deviceName); return null; }

        const outputStatus = mqttData.outputStatus || mqttData.relayStatus || {};
        // mark device as Active when receiving status update
        return Device.updateDeviceOutputStatus({ id: device.id, mistStatus: outputStatus.mist, fanStatus: outputStatus.fan, heaterStatus: outputStatus.heater, lightStatus: outputStatus.light, status: 'Active' });
    },

    // MQTT: send control command
    controlViaMqtt: async (id, { device, action }) => {
        const targetDevice = await Device.findById(id);
        if (!targetDevice) throw createHttpError(404, 'Device not found');
        // lazy-require to avoid circular dependency with mqttService
        const mqttService = require('./mqttService');
        return mqttService.publishCommand({ deviceName: targetDevice.device_name, device, action });
    },

    getHistory: async (id, user, from, to) => {
        const device = await Device.findById(id);
        assertOwner(device, user.id, user.role);
        return Device.getHistory(id, from, to);
    },

    getLatestStatus: async (id, user) => {
        const device = await Device.findById(id);
        assertOwner(device, user.id, user.role);
        return device;
    },

    control: async (id, userId, role, data) => {
        const device = await Device.findById(id);
        assertOwner(device, userId, role);
        return Device.updateControl(id, data);
    },

    changeMode: async (id, userId, role, mode) => {
        const device = await Device.findById(id);
        assertOwner(device, userId, role);
        if (!mode || (mode !== 'Auto' && mode !== 'Manual')) throw createHttpError(400, "mode must be 'Auto' or 'Manual'");
        return Device.updateMode(id, mode);
    },
};

module.exports = deviceService;
