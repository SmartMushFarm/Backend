const componentService = require('../services/componentService');
const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const componentController = {
    getAll: async (req, res) => {
        try { return res.json({ success: true, data: await componentService.getAll() }); }
        catch (e) { return sendError(res, e); }
    },
    create: async (req, res) => {
        try { return res.status(201).json({ success: true, data: await componentService.create(req.body) }); }
        catch (e) { return sendError(res, e); }
    },
    update: async (req, res) => {
        try { return res.json({ success: true, data: await componentService.update(req.params.id, req.body) }); }
        catch (e) { return sendError(res, e); }
    },
    delete: async (req, res) => {
        try { return res.json({ success: true, data: await componentService.delete(req.params.id) }); }
        catch (e) { return sendError(res, e); }
    },

    getDeviceComponents: async (req, res) => {
        try {
            const data = await componentService.getDeviceComponents(req.params.deviceId, req.user);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },
    addToDevice: async (req, res) => {
        try {
            const data = await componentService.addToDevice(req.params.deviceId, req.body);
            return res.status(201).json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },
    updateDeviceComponent: async (req, res) => {
        try {
            const data = await componentService.updateDeviceComponent(req.params.id, req.body);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = componentController;
