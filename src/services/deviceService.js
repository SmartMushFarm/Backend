const Device = require('../models/deviceModel');
const historyModel = require('../models/historyModel');
const Preset = require('../models/presetModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const toStatusBoolean = (value) => {
    if (value === true || value === 1) return true;
    if (value === false || value === 0 || value === null || value === undefined) return false;

    const normalized = String(value).trim().toLowerCase();
    return ['true', '1', 'on', 'active', 'yes'].includes(normalized);
};

const didTurnOn = (deviceId, field, previousValue, currentValue) => {
    if (!deviceService._lastKnownControlStates) {
        deviceService._lastKnownControlStates = new Map();
    }

    const key = `${deviceId}:${field}`;
    const previous = deviceService._lastKnownControlStates.has(key)
        ? deviceService._lastKnownControlStates.get(key)
        : toStatusBoolean(previousValue);
    const current = toStatusBoolean(currentValue);

    deviceService._lastKnownControlStates.set(key, current);
    return previous !== true && current === true;
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

        await Device.updateSensorData(deviceId, data);
        await Device.insertSensorHistory({ deviceId, ...data });

        const warnings = [];
        if (data.humidity > 90) warnings.push(`Humidity critical: ${data.humidity}%`);
        if (data.temperature > 35) warnings.push(`Temperature too high: ${data.temperature}°C`);
        if (warnings.length > 0) {
                try {
                    const Notif = require('../models/notificationModel');
                    await Notif.create({
                        user_id: device.owner_id,
                        device_id: device.id,
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
            if (updatedDevice && String(updatedDevice.mode || '').toLowerCase() === 'auto' && updatedDevice.preset_id) {
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
        // Avoid sending duplicate/no-op commands by checking current DB state first
        const normalizedDevice = String(device || '').toLowerCase();
        const normalizedAction = String(action || '').toLowerCase();
        const fieldMap = {
            mist: 'mist_status',
            fan: 'fan_status',
            heater: 'heater_status',
            light: 'light_status',
        };
        const statusField = fieldMap[normalizedDevice];
        const desiredOn = normalizedAction === 'on';

        if (statusField && typeof targetDevice[statusField] !== 'undefined') {
            const current = !!targetDevice[statusField];
            if (current === desiredOn) {
                // no-op, skip publishing
                return { skipped: true, reason: 'already in desired state' };
            }
        }

        // lazy-require to avoid circular dependency with mqttService
        const mqttService = require('./mqttService');
        return mqttService.publishCommand({ deviceName: targetDevice.device_name, device: normalizedDevice, action: normalizedAction });
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
        const normalizedMode = String(mode || '').trim().toLowerCase();
        const modeMap = { auto: 'Auto', manual: 'Manual' };
        const canonicalMode = modeMap[normalizedMode];
        if (!canonicalMode) throw createHttpError(400, "mode must be 'Auto' or 'Manual'");
        const updated = await Device.updateMode(id, canonicalMode);
        // If switched to Manual, stop any preset scheduler job for this device
        try {
            if (canonicalMode === 'Manual') {
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

// --- DECORATORS FOR NOTIFICATIONS (ADDITIVE ONLY) ---
const originalClaimDevice = deviceService.claimDevice;
deviceService.claimDevice = async (claimCode, userId) => {
    const updated = await originalClaimDevice(claimCode, userId);
    if (updated) {
        try {
            const NotificationService = require('./notificationService');
            NotificationService.sendDeviceClaimed(userId, updated.device_name, {
                deviceId: updated.id,
            }).catch(console.error);
        } catch (err) {
            console.error('Failed to send DeviceClaimed notification:', err);
        }
    }
    return updated;
};

const originalChangeMode = deviceService.changeMode;
deviceService.changeMode = async (id, userId, role, mode) => {
    const deviceBefore = await Device.findById(id);
    const updated = await originalChangeMode(id, userId, role, mode);
    const isModeAuto = mode && String(mode).toLowerCase() === 'auto';
    const wasBeforeAuto = deviceBefore && deviceBefore.mode && String(deviceBefore.mode).toLowerCase() === 'auto';
    if (updated && isModeAuto && !wasBeforeAuto && updated.preset_id && updated.owner_id) {
        try {
            const preset = await Preset.findById(updated.preset_id);
            if (preset) {
                const NotificationService = require('./notificationService');
                NotificationService.sendAutoControlActivated(updated.owner_id, updated.device_name, preset.preset_name, {
                    deviceId: updated.id,
                }).catch(console.error);
            }
        } catch (err) {
            console.error('Failed to send AutoControlActivated notification on mode change:', err);
        }
    }
    return updated;
};

const originalUpdateDeviceFromSensor = Device.updateDeviceFromSensor;
Device.updateDeviceFromSensor = async (params) => {
    const prevDevice = await Device.findById(params.id);
    const updated = await originalUpdateDeviceFromSensor(params);

    if (prevDevice && updated && updated.owner_id) {
        const prevStatus = prevDevice.status ? String(prevDevice.status).toLowerCase() : '';
        const currentStatus = updated.status ? String(updated.status).toLowerCase() : '';
        const currentMode = updated.mode ? String(updated.mode).toLowerCase() : '';

        // 1. Device Active Again
        if (prevStatus === 'inactive' && currentStatus === 'active') {
            try {
                const NotificationService = require('./notificationService');
                NotificationService.sendDeviceActiveAgain(updated.owner_id, updated.device_name, {
                    deviceId: updated.id,
                }).catch(console.error);
            } catch (err) {
                console.error('Failed to send DeviceActiveAgain notification:', err);
            }
        }

        // 2. Control status notifications: only when a status turns true.
        try {
            const preset = updated.preset_id ? await Preset.findById(updated.preset_id) : null;
            await checkDeviceControlTransitions(prevDevice, updated, preset);
        } catch (err) {
            console.error('Failed to check transitions in updateDeviceFromSensor:', err);
        }

        // 3. Danger alerts
        try {
            let maxTempDanger = 35;
            let dangerHumidity = 90;
            const preset = updated.preset_id ? await Preset.findById(updated.preset_id) : null;
            if (preset) {
                if (typeof preset.max_temp_danger === 'number') maxTempDanger = Number(preset.max_temp_danger);
                if (typeof preset.danger_humidity === 'number') dangerHumidity = Number(preset.danger_humidity);
            }

            if (!deviceService._lastAlertSentAt) deviceService._lastAlertSentAt = new Map();
            const now = Date.now();
            const NotificationService = require('./notificationService');

            if (updated.current_temperature >= maxTempDanger) {
                const key = `${updated.id}:temp`;
                const lastAlert = deviceService._lastAlertSentAt.get(key) || 0;
                if (now - lastAlert >= 10 * 60 * 1000) {
                    deviceService._lastAlertSentAt.set(key, now);
                    await NotificationService.sendDangerousTemp(updated.owner_id, updated.device_name, updated.current_temperature, {
                        deviceId: updated.id,
                    });
                }
            }

            if (updated.current_humidity >= dangerHumidity) {
                const key = `${updated.id}:humidity`;
                const lastAlert = deviceService._lastAlertSentAt.get(key) || 0;
                if (now - lastAlert >= 10 * 60 * 1000) {
                    deviceService._lastAlertSentAt.set(key, now);
                    await NotificationService.sendDangerousHumidity(updated.owner_id, updated.device_name, updated.current_humidity, {
                        deviceId: updated.id,
                    });
                }
            }
        } catch (err) {
            console.error('Failed processing danger alerts:', err);
        }
    }
    return updated;
};

const originalUpdateDeviceOutputStatus = Device.updateDeviceOutputStatus;
Device.updateDeviceOutputStatus = async (params) => {
    const prevDevice = await Device.findById(params.id);
    const updated = await originalUpdateDeviceOutputStatus(params);

    if (prevDevice && updated && updated.owner_id) {
        const prevStatus = prevDevice.status ? String(prevDevice.status).toLowerCase() : '';
        const currentStatus = updated.status ? String(updated.status).toLowerCase() : '';
        const currentMode = updated.mode ? String(updated.mode).toLowerCase() : '';

        // 1. Device Active Again
        if (prevStatus === 'inactive' && currentStatus === 'active') {
            try {
                const NotificationService = require('./notificationService');
                NotificationService.sendDeviceActiveAgain(updated.owner_id, updated.device_name, {
                    deviceId: updated.id,
                }).catch(console.error);
            } catch (err) {
                console.error('Failed to send DeviceActiveAgain notification:', err);
            }
        }

        // 2. Control status notifications: only when a status turns true.
        try {
            const preset = updated.preset_id ? await Preset.findById(updated.preset_id) : null;
            await checkDeviceControlTransitions(prevDevice, updated, preset);
        } catch (err) {
            console.error('Failed to check transitions in updateDeviceOutputStatus:', err);
        }
    }
    return updated;
};

const checkDeviceControlTransitions = async (device, updatedDevice, preset) => {
    if (!device.owner_id) return;

    const NotificationService = require('./notificationService');

    // Check Fan
    if (didTurnOn(updatedDevice.id, 'fan_status', device.fan_status, updatedDevice.fan_status)) {
        let reason = 'Độ ẩm cao';
        if (preset) {
            if (typeof preset.danger_humidity === 'number' && updatedDevice.current_humidity >= preset.danger_humidity) {
                reason = 'Độ ẩm nguy hiểm';
            } else if (typeof preset.max_temp_danger === 'number' && updatedDevice.current_temperature >= preset.max_temp_danger) {
                reason = 'Nhiệt độ nguy hiểm';
            } else if (typeof preset.fan_on_humidity === 'number' && updatedDevice.current_humidity > preset.fan_on_humidity) {
                reason = 'Độ ẩm cao';
            }
        }
        try {
            await NotificationService.sendControlCommandSent(device.owner_id, device.device_name, 'fan', reason, {
                deviceId: updatedDevice.id,
            });
        } catch (err) {
            console.error('Failed to send control command notification for fan:', err);
        }
    }

    // Check Mist
    if (didTurnOn(updatedDevice.id, 'mist_status', device.mist_status, updatedDevice.mist_status)) {
        let reason = 'Độ ẩm thấp';
        if (preset && typeof preset.mist_on_humidity === 'number' && updatedDevice.current_humidity < preset.mist_on_humidity) {
            reason = 'Độ ẩm thấp';
        }
        try {
            await NotificationService.sendControlCommandSent(device.owner_id, device.device_name, 'mist', reason, {
                deviceId: updatedDevice.id,
            });
        } catch (err) {
            console.error('Failed to send control command notification for mist:', err);
        }
    }

    // Check Heater
    if (didTurnOn(updatedDevice.id, 'heater_status', device.heater_status, updatedDevice.heater_status)) {
        let reason = 'Nhiệt độ thấp';
        if (preset && typeof preset.heater_on_temp === 'number' && updatedDevice.current_temperature < preset.heater_on_temp) {
            reason = 'Nhiệt độ thấp';
        }
        try {
            await NotificationService.sendControlCommandSent(device.owner_id, device.device_name, 'heater', reason, {
                deviceId: updatedDevice.id,
            });
        } catch (err) {
            console.error('Failed to send control command notification for heater:', err);
        }
    }

    // Check Light
    if (didTurnOn(updatedDevice.id, 'light_status', device.light_status, updatedDevice.light_status)) {
        try {
            await NotificationService.sendControlCommandSent(device.owner_id, device.device_name, 'light', 'Tự động', {
                deviceId: updatedDevice.id,
            });
        } catch (err) {
            console.error('Failed to send control command notification for light:', err);
        }
    }
};
