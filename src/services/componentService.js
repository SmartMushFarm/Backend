const Component = require('../models/componentModel');
const Device = require('../models/deviceModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const componentService = {
    getAll: async () => Component.findAll(),

    create: async (data) => {
        if (!data.name) throw createHttpError(400, 'name is required');
        return Component.create(data);
    },

    update: async (id, data) => {
        const c = await Component.update(id, data);
        if (!c) throw createHttpError(404, 'Component not found');
        return c;
    },

    delete: async (id) => {
        const c = await Component.delete(id);
        if (!c) throw createHttpError(404, 'Component not found');
        return c;
    },

    getDeviceComponents: async (deviceId, user) => {
        const device = await Device.findById(deviceId);
        if (!device) throw createHttpError(404, 'Device not found');
        if (user.role !== 'Admin' && user.role !== 'Technician' && device.owner_id !== user.id) {
            throw createHttpError(403, 'Forbidden');
        }
        return Component.getDeviceComponents(deviceId);
    },

    addToDevice: async (deviceId, data) => {
        const device = await Device.findById(deviceId);
        if (!device) throw createHttpError(404, 'Device not found');
        if (!data.component_id) throw createHttpError(400, 'component_id is required');
        return Component.addToDevice({ deviceId, ...data });
    },

    updateDeviceComponent: async (id, data) => {
        const dc = await Component.updateDeviceComponent(id, data);
        if (!dc) throw createHttpError(404, 'Device component not found');
        return dc;
    },
};

module.exports = componentService;
