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
 *               payment_method: { type: string, example: COD }
 *     responses:
 *       201:
 *         description: Payment created
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

module.exports = router;
