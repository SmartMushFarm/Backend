const Device = require('../models/deviceModel');
const Notification = require('../models/notificationModel');

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

    createDevice: async (userId, { product_id, device_name }) => {
        if (!device_name) throw createHttpError(400, 'device_name is required');
        return Device.create({ userId, productId: product_id, deviceName: device_name });
    },

    getDeviceById: async (id, user) => {
        const device = await Device.findById(id);
        assertOwner(device, user.id, user.role);
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

        // Check danger thresholds and create notification
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
