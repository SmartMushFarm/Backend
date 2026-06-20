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

    // PayOS v2
    createPayos: async (userId, { order_id }) => {
        if (!order_id) throw createHttpError(400, 'order_id is required');

        const order = await Order.findById(order_id);
        if (!order) throw createHttpError(404, 'Order not found');
        if (order.user_id !== userId) throw createHttpError(403, 'Forbidden');

        const existing = await Payment.findByOrderId(order_id);
        if (existing && existing.payment_status === 'Paid') throw createHttpError(409, 'Order already paid');
        if (existing) throw createHttpError(409, 'Payment already exists for this order');

        // Tạo payment record trước để lấy id làm orderCode
        const payment = await Payment.create({
            order_id,
            payment_method: 'QR',
            amount: order.total_amount,
            qr_code: null,
        });

        const orderCode = Number(payment.id); // Dùng payment.id làm orderCode PayOS
        const amount = Math.round(Number(order.total_amount));
        const description = `DH${order_id}`.slice(0, 25);
        const returnUrl = process.env.PAYOS_RETURN_URL || 'smartmushfarm://payment/success';
        const cancelUrl = process.env.PAYOS_CANCEL_URL || 'smartmushfarm://payment/cancel';

        const { signPaymentRequest } = require('../utils/payosHelper');
        const signature = signPaymentRequest({ amount, cancelUrl, description, orderCode, returnUrl });

        const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': process.env.PAYOS_CLIENT_ID,
                'x-api-key': process.env.PAYOS_API_KEY,
            },
            body: JSON.stringify({ orderCode, amount, description, cancelUrl, returnUrl, signature }),
        });

        const result = await payosRes.json();

        if (result.code !== '00') {
            await Payment.updateFailed(payment.id);
            throw createHttpError(502, result.desc || 'PayOS create payment failed');
        }

        // Lưu checkoutUrl vào qr_code (tận dụng cột sẵn có, không thêm cột mới)
        const { pool } = require('../config/db');
        await pool.query(`UPDATE payments SET qr_code = $1 WHERE id = $2`, [result.data.checkoutUrl, payment.id]);

        return {
            payment_id: payment.id,
            order_code: orderCode,
            amount,
            payment_method: 'QR',
            payment_status: 'Pending',
            checkout_url: result.data.checkoutUrl,
            qr_code: result.data.qrCode,
        };
    },

    handleWebhook: async (body) => {
        const { code, success, data, signature } = body || {};

        const { verifyWebhookSignature } = require('../utils/payosHelper');
        if (!verifyWebhookSignature(data, signature)) {
            console.warn('[PayOS webhook] invalid signature, orderCode:', data?.orderCode);
            return { message: 'invalid signature' };
        }

        // Thanh toán không thành công (huỷ / hết hạn)
        if (code !== '00' || success !== true || data?.code !== '00') {
            if (data?.orderCode) {
                await Payment.updateFailed(data.orderCode);
            }
            return { message: 'not successful payment event' };
        }

        // Thanh toán thành công
        const paymentId = data.orderCode; // orderCode chính là payment.id
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            console.error('[PayOS webhook] payment not found:', paymentId);
            return { message: 'payment not found' };
        }

        if (Number(data.amount) !== Number(payment.amount)) {
            console.error(`[PayOS webhook] amount mismatch: expected=${payment.amount}, got=${data.amount}`);
            return { message: 'amount mismatch' };
        }

        // Idempotency: nếu đã Paid rồi thì bỏ qua
        if (payment.payment_status === 'Paid') {
            return { message: 'already paid' };
        }

        const updated = await Payment.markPaid(paymentId, { payosReference: data.reference || null });
        if (updated) {
            await Order.updateStatus(payment.order_id, 'Confirmed');
            console.log(`[PayOS webhook] payment ${paymentId} marked Paid, order ${payment.order_id} Confirmed`);
        }

        return { message: 'success' };
    },

    confirmWebhook: async () => {
        const webhookUrl = `${process.env.SERVER_URL}/api/payments/payos/webhook`;
        const res = await fetch('https://api-merchant.payos.vn/confirm-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': process.env.PAYOS_CLIENT_ID,
                'x-api-key': process.env.PAYOS_API_KEY,
            },
            body: JSON.stringify({ webhookUrl }),
        });
        const json = await res.json();
        if (json.code !== '00') throw createHttpError(502, json.desc || 'PayOS confirm webhook failed');
        return { ok: true, webhookUrl, detail: json };
    },
};

module.exports = paymentService;
