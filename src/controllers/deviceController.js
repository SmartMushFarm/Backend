const deviceService = require('../services/deviceService');

const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const deviceController = {
    getMyDevices: async (req, res) => {
        try {
            const data = await deviceService.getMyDevices(req.user.id);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    createDevice: async (req, res) => {
        try {
            const data = await deviceService.createDevice(req.user.id, req.body);
            return res.status(201).json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    getDeviceById: async (req, res) => {
        try {
            const data = await deviceService.getDeviceById(req.params.id, req.user);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    updateDevice: async (req, res) => {
        try {
            const data = await deviceService.updateDevice(req.params.id, req.user.id, req.user.role, req.body);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    deleteDevice: async (req, res) => {
        try {
            const data = await deviceService.deleteDevice(req.params.id, req.user.id, req.user.role);
            return res.json({ success: true, message: 'Device deactivated', data });
        } catch (e) { return sendError(res, e); }
    },

    submitSensorData: async (req, res) => {
        try {
            const data = await deviceService.submitSensorData(req.params.id, req.body);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    getHistory: async (req, res) => {
        try {
            const { from, to } = req.query;
            const data = await deviceService.getHistory(req.params.id, req.user, from, to);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    getLatestStatus: async (req, res) => {
        try {
            const data = await deviceService.getLatestStatus(req.params.id, req.user);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    control: async (req, res) => {
        try {
            const data = await deviceService.control(req.params.id, req.user.id, req.user.role, req.body);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = deviceController;
