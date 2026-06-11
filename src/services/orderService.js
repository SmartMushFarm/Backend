const { pool } = require('../config/db');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const VALID_STATUSES = ['Pending', 'Confirmed', 'Shipping', 'Completed', 'Cancelled'];

const orderService = {
    checkout: async (userId, { shipping_address, promotion_id }) => {
        if (!shipping_address) throw createHttpError(400, 'shipping_address is required');
        const promotionId = promotion_id === undefined || promotion_id === null || promotion_id === ''
            ? null
            : Number(promotion_id);

        if (promotionId !== null && !Number.isInteger(promotionId)) {
            throw createHttpError(400, 'promotion_id must be a valid integer');
        }

        const cart = await Cart.getCartWithItems(userId);
        if (!cart || !cart.items || cart.items.length === 0) {
            throw createHttpError(400, 'Cart is empty');
        }

        for (const item of cart.items) {
            if (item.stock_quantity < item.quantity) {
                throw createHttpError(400, `Not enough stock for: ${item.name}`);
            }
        }

        let subtotal = cart.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
        let totalAmount = subtotal;

        if (promotionId !== null) {
            const promo = await Order.findPromotion(promotionId);
            if (!promo) throw createHttpError(400, 'Promotion not found');
            if (promo.discount_percent > 0) totalAmount = subtotal * (1 - promo.discount_percent / 100);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const order = await Order.create(client, {
                userId, shippingAddress: shipping_address, totalAmount, promotionId,
            });

            for (const item of cart.items) {
                await Order.createDetail(client, {
                    orderId: order.id, productId: item.product_id,
                    quantity: item.quantity, unitPrice: item.price,
                });
                await Order.decrementStock(client, item.product_id, item.quantity);
            }

            await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cart.id]);
            await client.query('COMMIT');

            return Order.findById(order.id);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    getMyOrders: async (userId) => Order.findByUserId(userId),

    getOrderById: async (id, user) => {
        const order = await Order.findById(id);
        if (!order) throw createHttpError(404, 'Order not found');
        if (user.role !== 'Admin' && order.user_id !== user.id) throw createHttpError(403, 'Forbidden');
        return order;
    },

    cancelOrder: async (userId, orderId) => {
        const order = await Order.findById(orderId);
        if (!order) throw createHttpError(404, 'Order not found');
        if (order.user_id !== userId) throw createHttpError(403, 'Forbidden');
        if (order.status !== 'Pending') throw createHttpError(400, 'Only Pending orders can be cancelled');
        return Order.updateStatus(orderId, 'Cancelled');
    },

    getAllOrders: async (filters) => Order.findAll(filters),

    updateOrderStatus: async (id, status) => {
        if (!VALID_STATUSES.includes(status)) {
            throw createHttpError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        const order = await Order.updateStatus(id, status);
        if (!order) throw createHttpError(404, 'Order not found');
        return order;
    },
};

module.exports = orderService;