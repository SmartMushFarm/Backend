const paymentService = require('../services/paymentService');

const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const paymentController = {
    create: async (req, res) => {
        try {
            const data = await paymentService.create(req.user.id, req.body);
            return res.status(201).json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    getByOrderId: async (req, res) => {
        try {
            const data = await paymentService.getByOrderId(req.user.id, req.params.orderId);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    confirm: async (req, res) => {
        try {
            const data = await paymentService.confirm(req.params.id);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = paymentController;
