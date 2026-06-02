const repairBillService = require('../services/repairBillService');
const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const repairBillController = {
    getMyBills: async (req, res) => {
        try { return res.json({ success: true, data: await repairBillService.getMyBills(req.user.id) }); }
        catch (e) { return sendError(res, e); }
    },
    getBillById: async (req, res) => {
        try { return res.json({ success: true, data: await repairBillService.getBillById(req.params.id, req.user) }); }
        catch (e) { return sendError(res, e); }
    },
    pay: async (req, res) => {
        try { return res.json({ success: true, data: await repairBillService.pay(req.params.id, req.user.id) }); }
        catch (e) { return sendError(res, e); }
    },
};

module.exports = repairBillController;
