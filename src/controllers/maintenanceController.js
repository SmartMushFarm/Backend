const maintenanceService = require('../services/maintenanceService');
const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const maintenanceController = {
    // Customer
    createRequest: async (req, res) => {
        try { return res.status(201).json({ success: true, data: await maintenanceService.createRequest(req.user.id, req.body) }); }
        catch (e) { return sendError(res, e); }
    },
    getMyRequests: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.getMyRequests(req.user.id) }); }
        catch (e) { return sendError(res, e); }
    },
    getRequestById: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.getRequestById(req.params.id, req.user) }); }
        catch (e) { return sendError(res, e); }
    },

    // Technician
    getMyTasks: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.getMyTasks(req.user.id) }); }
        catch (e) { return sendError(res, e); }
    },
    getTaskById: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.getTaskById(req.params.id, req.user.id) }); }
        catch (e) { return sendError(res, e); }
    },

    // Admin
    getAllRequests: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.getAllRequests(req.query) }); }
        catch (e) { return sendError(res, e); }
    },
    approve: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.approve(req.params.id, req.user.id) }); }
        catch (e) { return sendError(res, e); }
    },
    schedule: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.schedule(req.params.id, req.user.id, req.body) }); }
        catch (e) { return sendError(res, e); }
    },
    cancel: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.cancel(req.params.id, req.body) }); }
        catch (e) { return sendError(res, e); }
    },
    confirmCompleted: async (req, res) => {
        try { return res.json({ success: true, data: await maintenanceService.confirmCompleted(req.params.id) }); }
        catch (e) { return sendError(res, e); }
    },
};

module.exports = maintenanceController;
