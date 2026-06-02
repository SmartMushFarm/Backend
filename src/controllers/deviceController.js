const deviceService = require('../services/deviceService');
const mqttService = require('../services/mqttService');

const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const deviceController = {
    // Customer: list own devices
    getMyDevices: async (req, res) => {
        try {
            const data = await deviceService.getMyDevices(req.user.id);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    // Admin: list all devices
    getAllDevices: async (req, res) => {
        try {
            const data = await deviceService.getAllDevices();
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

    // IoT device pushes sensor data (no auth required)
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

    // PUT /:id/control - update device state in DB
    control: async (req, res) => {
        try {
            const data = await deviceService.control(req.params.id, req.user.id, req.user.role, req.body);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    // POST /:id/control - send MQTT command to physical device
    controlDevice: async (req, res) => {
        try {
            const { id } = req.params;
            const { device, action } = req.body;

            const validDevices = ['fan', 'heater', 'mist', 'all'];
            const validActions = ['on', 'off'];

            if (!device || !action) {
                return res.status(400).json({ success: false, message: 'device and action are required', example: { device: 'fan', action: 'on' } });
            }
            if (!validDevices.includes(device)) {
                return res.status(400).json({ success: false, message: 'Invalid device', validDevices });
            }
            if (!validActions.includes(action)) {
                return res.status(400).json({ success: false, message: 'Invalid action', validActions });
            }

            const result = await deviceService.controlViaMqtt(id, { device, action });
            return res.json({ success: true, message: 'Command sent successfully', data: result });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = deviceController;
