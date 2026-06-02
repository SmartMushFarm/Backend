const cartService = require('../services/cartService');

const sendError = (res, error) => res.status(error.status || 500).json({ success: false, message: error.message });

const cartController = {
    getCart: async (req, res) => {
        try {
            const data = await cartService.getCart(req.user.id);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    addItem: async (req, res) => {
        try {
            const { product_id, quantity } = req.body;
            const item = await cartService.addItem(req.user.id, product_id, quantity);
            return res.status(201).json({ success: true, data: item });
        } catch (e) { return sendError(res, e); }
    },

    updateItem: async (req, res) => {
        try {
            const item = await cartService.updateItem(req.user.id, req.params.id, req.body.quantity);
            return res.json({ success: true, data: item });
        } catch (e) { return sendError(res, e); }
    },

    deleteItem: async (req, res) => {
        try {
            await cartService.deleteItem(req.user.id, req.params.id);
            return res.json({ success: true, message: 'Item removed from cart' });
        } catch (e) { return sendError(res, e); }
    },

    clearCart: async (req, res) => {
        try {
            await cartService.clearCart(req.user.id);
            return res.json({ success: true, message: 'Cart cleared' });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = cartController;
