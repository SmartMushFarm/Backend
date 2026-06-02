const Maintenance = require('../models/maintenanceModel');
const Notification = require('../models/notificationModel');
const RepairBill = require('../models/repairBillModel');
const Device = require('../models/deviceModel');
const User = require('../models/userModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const notifyAdmins = async (title, message) => {
    try {
        const { pool } = require('../config/db');
        const admins = await pool.query(`SELECT id FROM "User" WHERE role = 'Admin'`);
        for (const admin of admins.rows) {
            await Notification.create({ userId: admin.id, title, message, type: 'Maintenance' });
        }
    } catch (_) {}
};

const maintenanceService = {
    // Customer
    createRequest: async (userId, { device_id, title, description, priority }) => {
        if (!device_id || !title) throw createHttpError(400, 'device_id and title are required');
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
        if (user.role === 'Technician' && req.technician_id !== user.id) throw createHttpError(403, 'Forbidden');
        return req;
    },

    // Admin
    getAllRequests: async (filters) => Maintenance.findAll(filters),

    approve: async (id) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        const updated = await Maintenance.updateStatus(id, 'Received');
        await Notification.create({ userId: req.user_id, title: 'Maintenance Approved', message: `Your request "${req.title}" has been approved.`, type: 'Maintenance' });
        return updated;
    },

    assignTechnician: async (id, { technician_id, scheduled_date }) => {
        if (!technician_id) throw createHttpError(400, 'technician_id is required');
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        const updated = await Maintenance.updateStatus(id, 'Processing', { technicianId: technician_id, scheduledDate: scheduled_date });
        const tech = await User.findById(technician_id);
        if (tech) {
            await Notification.create({ userId: technician_id, title: 'New Maintenance Task', message: `You have been assigned to: ${req.title}`, type: 'Maintenance' });
        }
        return updated;
    },

    reject: async (id, { admin_note }) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        const updated = await Maintenance.updateStatus(id, 'Rejected', { adminNote: admin_note });
        await Notification.create({ userId: req.user_id, title: 'Maintenance Rejected', message: admin_note || 'Your request was rejected.', type: 'Maintenance' });
        return updated;
    },

    confirmCompleted: async (id) => {
        const updated = await Maintenance.updateStatus(id, 'Completed');
        if (!updated) throw createHttpError(404, 'Not found');
        return updated;
    },

    // Technician
    getMyTasks: async (technicianId) => Maintenance.findByTechnicianId(technicianId),

    getTaskById: async (id, technicianId) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.technician_id !== technicianId) throw createHttpError(403, 'Forbidden');
        const brokenComponents = await Maintenance.getBrokenComponents(id);
        return { ...req, broken_components: brokenComponents };
    },

    checkComponents: async (id, technicianId, { broken_components }) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.technician_id !== technicianId) throw createHttpError(403, 'Forbidden');
        if (!Array.isArray(broken_components) || broken_components.length === 0) {
            throw createHttpError(400, 'broken_components array is required');
        }
        return Maintenance.saveBrokenComponents(id, broken_components);
    },

    createRepairBill: async (id, technicianId) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.technician_id !== technicianId) throw createHttpError(403, 'Forbidden');

        const existing = await RepairBill.findByMaintenanceId(id);
        if (existing) throw createHttpError(409, 'Repair bill already exists');

        const broken = await Maintenance.getBrokenComponents(id);
        const totalAmount = broken.reduce((sum, b) => sum + Number(b.price), 0);

        const bill = await RepairBill.create({ maintenanceRequestId: id, totalAmount });
        await Notification.create({ userId: req.user_id, title: 'Repair Bill Ready', message: `Your repair bill is ready. Total: ${totalAmount.toLocaleString()} VND`, type: 'RepairBill' });
        return bill;
    },

    completeMaintenance: async (id, technicianId) => {
        const req = await Maintenance.findById(id);
        if (!req) throw createHttpError(404, 'Not found');
        if (req.technician_id !== technicianId) throw createHttpError(403, 'Forbidden');

        const bill = await RepairBill.findByMaintenanceId(id);
        if (!bill || bill.status !== 'Paid') {
            throw createHttpError(400, 'Repair bill must be paid before completing');
        }

        const updated = await Maintenance.updateStatus(id, 'Completed');
        await notifyAdmins('Maintenance Task Completed', `Task #${id} has been completed by technician.`);
        return updated;
    },
};

module.exports = maintenanceService;
