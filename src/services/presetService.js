const Preset = require('../models/presetModel');
const Device = require('../models/deviceModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const presetService = {
    getAll: async () => Preset.findAll(),

    create: async (data) => {
        if (!data.preset_name) throw createHttpError(400, 'preset_name is required');
        return Preset.create(data);
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
        if (user.role !== 'Admin' && device.user_id !== user.id) throw createHttpError(403, 'Forbidden');

        const preset = await Preset.findById(presetId);
        if (!preset) throw createHttpError(404, 'Preset not found');

        return Preset.applyToDevice(deviceId, presetId);
    },
};

module.exports = presetService;
