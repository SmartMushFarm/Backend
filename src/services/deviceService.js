const Device = require('../models/deviceModel');
const historyModel = require('../models/historyModel');
const mqttService = require('../services/mqttService');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const assertOwner = (device, userId, role) => {
    if (!device) throw createHttpError(404, 'Device not found');
    if (role !== 'Admin' && device.user_id !== userId) throw createHttpError(403, 'Forbidden');
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
                    userId: device.user_id,
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

        const history = await historyModel.createHistory({ deviceId: device.id, temperature, humidity, mistStatus, fanStatus, heaterStatus, lightStatus });
        const updatedDevice = await Device.updateDeviceFromSensor({ id: device.id, currentHumidity: humidity, currentTemperature: temperature, mistStatus, fanStatus, heaterStatus, lightStatus, status: 'online' });

        return { history, device: updatedDevice };
    },

    // MQTT: save output status from IoT device by device_name
    saveMqttStatusData: async (mqttData) => {
        const deviceName = mqttData.deviceId;
        if (!deviceName) { console.log('MQTT status missing deviceId'); return null; }

        const device = await Device.findDeviceByName(deviceName);
        if (!device) { console.log('Device not found in DB:', deviceName); return null; }

        const outputStatus = mqttData.outputStatus || mqttData.relayStatus || {};
        return Device.updateDeviceOutputStatus({ id: device.id, mistStatus: outputStatus.mist, fanStatus: outputStatus.fan, heaterStatus: outputStatus.heater, lightStatus: outputStatus.light, status: 'online' });
    },

    // MQTT: send control command
    controlViaMqtt: async (id, { device, action }) => {
        const targetDevice = await Device.findById(id);
        if (!targetDevice) throw createHttpError(404, 'Device not found');
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
};

module.exports = deviceService;
