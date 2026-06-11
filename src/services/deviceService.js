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
        // Do not expose claim_code to non-admin users
        if (device && user && String(user.role).toLowerCase() !== 'admin') device.claim_code = null;
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

        // Check for "Back Online" transition
        if (device.status === 'Inactive' && device.owner_id) {
            try {
                const NotificationService = require('./notificationService');
                await NotificationService.sendDeviceActiveAgain(device.owner_id, device.device_name, { deviceId: device.id });
                // Clear repeat notification timer
                const { clearLastNotifiedAt } = require('./deviceInactivityService');
                clearLastNotifiedAt(device.id);
            } catch (e) { console.error('Notify back online error:', e); }
        }

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
                        type: 'Danger',
                    });
                } catch (_) {}
        }

        const found = await Device.findById(deviceId);
        if (found) found.claim_code = null;
        return found;
    },

    // MQTT: save sensor data from IoT device by device_name
    saveMqttSensorData: async (mqttData) => {
        const deviceName = mqttData.deviceId;
        if (!deviceName) { console.log('MQTT sensor missing deviceId'); return null; }

        const device = await Device.findDeviceByName(deviceName);
        if (!device) { console.log('Device not found in DB:', deviceName); return null; }

        // Check for "Back Online" transition
        if (device.status === 'Inactive' && device.owner_id) {
            try {
                const NotificationService = require('./notificationService');
                await NotificationService.sendDeviceActiveAgain(device.owner_id, device.device_name, { deviceId: device.id });
                // Clear repeat notification timer
                const { clearLastNotifiedAt } = require('./deviceInactivityService');
                clearLastNotifiedAt(device.id);
            } catch (e) { console.error('Notify back online error:', e); }
        }

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

                // only persist history every 30 seconds per device
                if (now - lastAt >= 30000) {
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

        // Check for "Back Online" transition
        if (device.status === 'Inactive' && device.owner_id) {
            try {
                const NotificationService = require('./notificationService');
                await NotificationService.sendDeviceActiveAgain(device.owner_id, device.device_name, { deviceId: device.id });
                // Clear repeat notification timer
                const { clearLastNotifiedAt } = require('./deviceInactivityService');
                clearLastNotifiedAt(device.id);
            } catch (e) { console.error('Notify back online error:', e); }
        }

        const outputStatus = mqttData.outputStatus || mqttData.relayStatus || {};
        // mark device as Active when receiving status update
        return Device.updateDeviceOutputStatus({ id: device.id, mistStatus: outputStatus.mist, fanStatus: outputStatus.fan, heaterStatus: outputStatus.heater, lightStatus: outputStatus.light, status: 'Active' });
    },

    // MQTT: send control command
    controlViaMqtt: async (id, { device, action }) => {
        const targetDevice = await Device.findById(id);
        if (!targetDevice) throw createHttpError(404, 'Device not found');
        // Avoid sending duplicate/no-op commands by checking current DB state first
        const fieldMap = {
            mist: 'mist_status',
            fan: 'fan_status',
            heater: 'heater_status',
            light: 'light_status',
        };
        const statusField = fieldMap[device];
        const desiredOn = String(action).toLowerCase() === 'on';

        if (statusField && typeof targetDevice[statusField] !== 'undefined') {
            const current = !!targetDevice[statusField];
            if (current === desiredOn) {
                // no-op, skip publishing
                return { skipped: true, reason: 'already in desired state' };
            }
        }

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
        if (device && String(user.role).toLowerCase() !== 'admin') device.claim_code = null;
        return device;
    },

    control: async (id, userId, role, data) => {
        const device = await Device.findById(id);
        assertOwner(device, userId, role);
        const updated = await Device.updateControl(id, data);
        if (updated && String(role).toLowerCase() !== 'admin') updated.claim_code = null;
        return updated;
    },

    changeMode: async (id, userId, role, mode) => {
        const device = await Device.findById(id);
        assertOwner(device, userId, role);
        if (!mode || (mode !== 'Auto' && mode !== 'Manual')) throw createHttpError(400, "mode must be 'Auto' or 'Manual'");
        const updated = await Device.updateMode(id, mode);
        // If switched to Manual, stop any preset scheduler job for this device
        try {
            if (mode === 'Manual') {
                const presetScheduler = require('./presetSchedulerService');
                presetScheduler.stopDevicePresetJob(id);
            }
        } catch (e) {
            console.error('Failed to stop preset scheduler on mode change:', e.message || e);
        }
        if (updated && String(role).toLowerCase() !== 'admin') updated.claim_code = null;
        return updated;
    },

    // Admin: generate a unique 6-char claim code for device
    generateClaimCode: async (deviceId, currentUser) => {
        if (!currentUser || String(currentUser.role).toLowerCase() !== 'admin') throw createHttpError(403, 'Forbidden');

        const device = await Device.findById(deviceId);
        if (!device) throw createHttpError(404, 'Device not found');
        if (device.owner_id) throw createHttpError(400, 'Device already has owner');

        // generate unique 6-char code [A-Z0-9]
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const generate = () => Array.from({ length: 6 }).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');

        let attempts = 0;
        let code = null;
        while (attempts < 10) {
            const candidate = generate();
            const exists = await Device.isClaimCodeExists(candidate);
            if (!exists) { code = candidate; break; }
            attempts += 1;
        }
        if (!code) throw createHttpError(500, 'Failed to generate unique claim code');

        const updated = await Device.generateClaimCodeForDevice(deviceId, code);
        return { device: updated, claimCode: code };
    },

    // User: claim device by claim code
    claimDevice: async (claimCode, userId) => {
        if (!claimCode) throw createHttpError(400, 'claimCode is required');
        const normalized = String(claimCode).trim().toUpperCase();

        const device = await Device.findDeviceByClaimCode(normalized);
        if (!device) throw createHttpError(400, 'Invalid claim code');
        if (device.owner_id) throw createHttpError(400, 'Device already has owner');

        const updated = await Device.claimDeviceById(device.id, userId);

        // Notify user about successful claim
        if (updated && updated.owner_id) {
            try {
                const NotificationService = require('./notificationService');
                await NotificationService.sendDeviceClaimed(updated.owner_id, updated.device_name, { deviceId: updated.id });
            } catch (e) { console.error('Notify claim error:', e); }
        }

        // ensure claim_code removed before returning to user
        if (updated) updated.claim_code = null;
        return updated;
    },

    // User/Admin: remove owner from device (unbind)
    removeOwner: async (deviceId, userId, role) => {
        const device = await Device.findById(deviceId);
        if (!device) throw createHttpError(404, 'Device not found');

        // allow admin or owner
        const isAdmin = String(role || '').toLowerCase() === 'admin';
        if (!isAdmin && device.owner_id !== userId) throw createHttpError(403, 'You are not the owner of this device');

        const updated = await Device.removeOwnerFromDevice(deviceId);
        // don't expose claim_code to users
        if (updated) updated.claim_code = null;
        return updated;
    },
};

module.exports = deviceService;