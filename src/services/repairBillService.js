const RepairBill = require('../models/repairBillModel');
const Notification = require('../models/notificationModel');
const Maintenance = require('../models/maintenanceModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const repairBillService = {
    getMyBills: async (userId) => RepairBill.findByUserId(userId),

    getBillById: async (id, user) => {
        const bill = await RepairBill.findById(id);
        if (!bill) throw createHttpError(404, 'Repair bill not found');
        if (user.role === 'Customer' && bill.user_id !== user.id) throw createHttpError(403, 'Forbidden');
        return bill;
    },

    pay: async (id, userId) => {
        const bill = await RepairBill.findById(id);
        if (!bill) throw createHttpError(404, 'Repair bill not found');
        if (bill.user_id !== userId) throw createHttpError(403, 'Forbidden');
        if (bill.status === 'Paid') throw createHttpError(400, 'Already paid');

        const updated = await RepairBill.pay(id);

        // Notify technician and admins
        const req = await Maintenance.findById(bill.maintenance_request_id);
        if (req && req.technician_id) {
            await Notification.create({ userId: req.assigned_admin_id, title: 'Repair Bill Paid', message: `Bill for maintenance #${req.id} has been paid.`, type: 'Maintenance' });
        }
        return updated;
    },
};

module.exports = repairBillService;