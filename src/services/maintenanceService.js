const Maintenance = require('../models/maintenanceModel');
const Notification = require('../models/notificationModel');
const Device = require('../models/deviceModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const notifyAdmins = async (title, message) => {
    try {
        const { pool } = require('../config/db');
        const admins = await pool.query(`SELECT id FROM users WHERE role = 'Admin'`);
        for (const admin of admins.rows) {
            await Notification.create({ userId: admin.id, title, message, type: 'Maintenance' });
        }
    } catch (_) {}
};

const maintenanceService = {
    // Customer
    createRequest: async (userId, { device_id, title, description, priority }) => {
        if (!device_id || !title || !description) throw createHttpError(400, 'device_id, title and description are required');
        const device = await Device.findById(device_id);
        if (!device) throw createHttpError(404, 'Device not found');
        if (device.owner_id !== userId) throw createHttpError(403, 'Forbidden');

        const req = await Maintenance.create({ userId, deviceId: device_id, title, description, priority });
        await notifyAdmins('New Maintenance Request', `User submitted: ${title}`);
        return req;
    },

    getMyRequests: async (userId) => Maintenance.findByUserId(userId),

    getRequestById: async (id, user) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Maintenance request not found');
        if (user.role === 'Customer' && req.user_id !== user.id) throw createHttpError(403, 'Forbidden');
        return req;
    },

    // Technician
    getMyTasks: async (userId) => Maintenance.findByAssignedAdminId(userId),

    getTaskById: async (id, userId) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.assigned_admin_id !== userId) throw createHttpError(403, 'Forbidden');
        return req;
    },

    // Admin
    getAllRequests: async (filters) => Maintenance.findAll(filters),

    approve: async (id, adminId) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.status !== 'Pending') throw createHttpError(400, 'Only Pending requests can be approved');
        const updated = await Maintenance.updateStatus(id, 'Received', { assignedAdminId: adminId });
        await Notification.create({ userId: req.user_id, title: 'Maintenance Approved', message: `Your request "${req.title}" has been approved.`, type: 'Maintenance' });
        return updated;
    },

    schedule: async (id, adminId, { scheduled_date, admin_note }) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.status !== 'Received') throw createHttpError(400, 'Only Received requests can be scheduled');
        return Maintenance.updateStatus(id, 'Processing', { assignedAdminId: adminId, scheduledDate: scheduled_date, adminNote: admin_note });
    },

    cancel: async (id, { admin_note }) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        const updated = await Maintenance.updateStatus(id, 'Cancelled', { adminNote: admin_note });
        await Notification.create({ userId: req.user_id, title: 'Maintenance Cancelled', message: admin_note || 'Your request has been cancelled.', type: 'Maintenance' });
        return updated;
    },

    confirmCompleted: async (id) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.status !== 'Processing') throw createHttpError(400, 'Only Processing requests can be completed');
        const now = new Date().toISOString();
        const updated = await Maintenance.updateStatus(id, 'Completed', { completedAt: now });
        await Notification.create({ userId: req.user_id, title: 'Maintenance Completed', message: `Your request "${req.title}" has been completed.`, type: 'Maintenance' });
        return updated;
    },
};

module.exports = maintenanceService;
