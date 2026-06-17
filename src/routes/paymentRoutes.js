const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Payments
 *     description: Payment APIs
 */

/**
 * @openapi
 * /api/payments/create:
 *   post:
 *     tags: [Payments]
 *     summary: Create payment for an order
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_id: { type: integer, example: 1 }
 *               payment_method: { type: string, enum: [COD, QR], example: QR }
 *     responses:
 *       201:
 *         description: Payment created (includes qr_code if payment_method is QR)
 */
router.post('/create', authMiddleware, paymentController.create);

/**
 * @openapi
 * /api/payments/order/{orderId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment info of an order
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Payment info
 */
router.get('/order/:orderId', authMiddleware, paymentController.getByOrderId);

/**
 * @openapi
 * /api/payments/{id}/confirm:
 *   put:
 *     tags: [Payments]
 *     summary: Confirm payment as paid (simulate)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Payment confirmed
 */
router.put('/:id/confirm', authMiddleware, paymentController.confirm);

// PayOS v2
/**
 * @openapi
 * /api/payments/payos/create:
 *   post:
 *     tags: [Payments]
 *     summary: "[PayOS] Create PayOS payment link for an order"
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id]
 *             properties:
 *               order_id: { type: integer, example: 1 }
 *           example:
 *             order_id: 1
 *     responses:
 *       201:
 *         description: PayOS payment link created. Use checkout_url to open WebView in Flutter.
 */
router.post('/payos/create', authMiddleware, paymentController.createPayos);

/**
 * @openapi
 * /api/payments/payos/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: "[PayOS] Webhook receiver (called by PayOS server, not client)"
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/payos/webhook', paymentController.payosWebhook);

/**
 * @openapi
 * /api/payments/payos/confirm-webhook:
 *   post:
 *     tags: [Payments]
 *     summary: "[PayOS] Confirm webhook URL with PayOS (run once after deploy)"
 *     responses:
 *       200:
 *         description: Webhook URL confirmed
 */
router.post('/payos/confirm-webhook', paymentController.confirmWebhook);

module.exports = router;
