const orderService = require('../services/orderService');

const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const orderController = {
    checkout: async (req, res) => {
        try {
            const order = await orderService.checkout(req.user.id, req.body);
            return res.status(201).json({ success: true, data: order });
        } catch (e) { return sendError(res, e); }
    },

    getMyOrders: async (req, res) => {
        try {
            const data = await orderService.getMyOrders(req.user.id);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    getOrderById: async (req, res) => {
        try {
            const data = await orderService.getOrderById(req.params.id, req.user);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    cancelOrder: async (req, res) => {
        try {
            const data = await orderService.cancelOrder(req.user.id, req.params.id);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    getAllOrders: async (req, res) => {
        try {
            const data = await orderService.getAllOrders(req.query);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    updateOrderStatus: async (req, res) => {
        try {
            const data = await orderService.updateOrderStatus(req.params.id, req.body.status);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = orderController;
