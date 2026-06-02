const presetService = require('../services/presetService');
const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const presetController = {
    getAll: async (req, res) => {
        try { return res.json({ success: true, data: await presetService.getAll() }); }
        catch (e) { return sendError(res, e); }
    },
    create: async (req, res) => {
        try { return res.status(201).json({ success: true, data: await presetService.create(req.body) }); }
        catch (e) { return sendError(res, e); }
    },
    update: async (req, res) => {
        try { return res.json({ success: true, data: await presetService.update(req.params.id, req.body) }); }
        catch (e) { return sendError(res, e); }
    },
    delete: async (req, res) => {
        try { return res.json({ success: true, message: 'Preset deleted', data: await presetService.delete(req.params.id) }); }
        catch (e) { return sendError(res, e); }
    },
    applyToDevice: async (req, res) => {
        try {
            const data = await presetService.applyToDevice(req.params.deviceId, req.params.presetId, req.user);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = presetController;
