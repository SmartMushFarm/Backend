const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const VALID_METHODS = ['COD', 'BankTransfer', 'MoMo', 'VNPay'];

const paymentService = {
    create: async (userId, { order_id, payment_method }) => {
        if (!order_id || !payment_method) throw createHttpError(400, 'order_id and payment_method are required');
        if (!VALID_METHODS.includes(payment_method)) {
            throw createHttpError(400, `payment_method must be one of: ${VALID_METHODS.join(', ')}`);
        }

        const order = await Order.findById(order_id);
        if (!order) throw createHttpError(404, 'Order not found');
        if (order.user_id !== userId) throw createHttpError(403, 'Forbidden');

        const existing = await Payment.findByOrderId(order_id);
        if (existing) throw createHttpError(409, 'Payment already exists for this order');

        return Payment.create({ orderId: order_id, paymentMethod: payment_method, amount: order.total_amount });
    },

    getByOrderId: async (userId, orderId) => {
        const order = await Order.findById(orderId);
        if (!order) throw createHttpError(404, 'Order not found');
        if (order.user_id !== userId) throw createHttpError(403, 'Forbidden');
        const payment = await Payment.findByOrderId(orderId);
        if (!payment) throw createHttpError(404, 'Payment not found');
        return payment;
    },

    confirm: async (id) => {
        const payment = await Payment.confirm(id);
        if (!payment) throw createHttpError(404, 'Payment not found');
        // Update order status to Confirmed
        await Order.updateStatus(payment.order_id, 'Confirmed');
        return payment;
    },
};

module.exports = paymentService;
