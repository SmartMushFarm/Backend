const Preset = require('../models/presetModel');
const Device = require('../models/deviceModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const presetService = {
    getAll: async (userId) => Preset.findAll(userId),

    create: async (data, user) => {
        if (!data.preset_name) throw createHttpError(400, 'preset_name is required');
        const isRecommended = user && String(user.role || '').toLowerCase() === 'admin' ? true : false;
        const payload = { ...data, created_by: user ? user.id : null, is_recommended: isRecommended };
        return Preset.create(payload);
    },

    update: async (id, data) => {
        const preset = await Preset.update(id, data);
        if (!preset) throw createHttpError(404, 'Preset not found');
        return preset;
    },

    delete: async (id) => {
        const preset = await Preset.delete(id);
        if (!preset) throw createHttpError(404, 'Preset not found');
        return preset;
    },

    applyToDevice: async (deviceId, presetId, user) => {
        const device = await Device.findById(deviceId);
        if (!device) throw createHttpError(404, 'Device not found');
        if (String(user.role || '').toLowerCase() !== 'admin' && device.owner_id !== user.id) throw createHttpError(403, 'Forbidden');

        const preset = await Preset.findById(presetId);
        if (!preset) throw createHttpError(404, 'Preset not found');

        const applied = await Preset.applyToDevice(deviceId, presetId);

        // start scheduler for this device so fan runs every hour for 10 minutes
        try {
            const presetScheduler = require('./presetSchedulerService');
            // default interval 30 minutes, duration 3 minutes
            presetScheduler.startDevicePresetJob(deviceId, { intervalMs: 30 * 60 * 1000, durationMs: 3 * 60 * 1000 });
        } catch (e) {
            // log but don't fail the API
            console.error('Failed to start preset scheduler:', e.message || e);
        }

        return applied;
    },
};

module.exports = presetService;

// --- DECORATORS FOR NOTIFICATIONS (ADDITIVE ONLY) ---
const originalApplyToDevice = presetService.applyToDevice;
presetService.applyToDevice = async (deviceId, presetId, user) => {
    const applied = await originalApplyToDevice(deviceId, presetId, user);
    if (applied && applied.owner_id) {
        try {
            const PresetModel = require('../models/presetModel');
            const preset = await PresetModel.findById(presetId);
            if (preset) {
                const NotificationService = require('./notificationService');
                NotificationService.sendPresetScheduleNotification('Preset Applied', {
                    userId: applied.owner_id,
                    deviceId,
                    deviceName: applied.device_name,
                    presetName: preset.preset_name,
                }).catch(console.error);
            }
        } catch (err) {
            console.error('Failed to send AutoControlActivated notification:', err);
        }
    }
    return applied;
};
