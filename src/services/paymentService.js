const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const NotificationService = require('./notificationService');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const VALID_METHODS = ['COD', 'QR'];
const QR_ENABLED_METHODS = ['QR'];

const generateQRCode = (amount) => {
    const baseUrl = process.env.VIETQR_QUICK_LINK;
    if (!baseUrl) {
        throw createHttpError(500, 'VietQR configuration is missing');
    }
    return `${baseUrl}${amount}`;
};

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

        const paymentData = {
            order_id,
            payment_method,
            amount: order.total_amount
        };

        // Generate QR code for VNPAY, Momo, and QR payment methods
        if (QR_ENABLED_METHODS.includes(payment_method)) {
            paymentData.qr_code = generateQRCode(order.total_amount);
        }

        return Payment.create(paymentData);
    },

    getByOrderId: async (userId, order_id) => {
        const order = await Order.findById(order_id);
        if (!order) throw createHttpError(404, 'Order not found');
        if (order.user_id !== userId) throw createHttpError(403, 'Forbidden');
        const payment = await Payment.findByOrderId(order_id);
        if (!payment) throw createHttpError(404, 'Payment not found');
        return payment;
    },

    confirm: async (id) => {
        const existingPayment = await Payment.findById(id);
        if (!existingPayment) throw createHttpError(404, 'Payment not found');
        const wasAlreadyPaid = String(existingPayment.payment_status || '').toLowerCase() === 'paid';

        const payment = await Payment.confirm(id);
        if (!payment) throw createHttpError(404, 'Payment not found');
        // Update order status to Confirmed
        await Order.updateStatus(payment.order_id, 'Confirmed');

        if (!wasAlreadyPaid && QR_ENABLED_METHODS.includes(payment.payment_method)) {
            const order = await Order.findById(payment.order_id);
            if (order) {
                await NotificationService.sendPaymentConfirmed(order.user_id, {
                    orderId: payment.order_id,
                    paymentId: payment.id,
                    amount: payment.amount,
                    paymentMethod: payment.payment_method,
                });
            }
        }

        return payment;
    },

    getById: async (userId, paymentId) => {
        const payment = await Payment.findById(paymentId);
        if (!payment) throw createHttpError(404, 'Payment not found');
        const order = await Order.findById(payment.order_id);
        if (order.user_id !== userId) throw createHttpError(403, 'Forbidden');
        return payment;
    },

    updateStatus: async (id, status) => {
        const VALID_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
        if (!VALID_STATUSES.includes(status)) {
            throw createHttpError(400, `Status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        const payment = await Payment.updateStatus(id, status);
        if (!payment) throw createHttpError(404, 'Payment not found');
        return payment;
    },

    failed: async (id) => {
        const payment = await Payment.failed(id);
        if (!payment) throw createHttpError(404, 'Payment not found');
        // Update order status to Cancelled
        await Order.updateStatus(payment.order_id, 'Cancelled');
        return payment;
    },

    refund: async (id) => {
        const payment = await Payment.refund(id);
        if (!payment) throw createHttpError(404, 'Payment not found');
        // Update order status back to Pending
        await Order.updateStatus(payment.order_id, 'Pending');
        return payment;
    },
};

module.exports = paymentService;
