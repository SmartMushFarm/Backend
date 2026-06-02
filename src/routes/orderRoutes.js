const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Orders
 *     description: Order management APIs
 */

/**
 * @openapi
 * /api/orders/checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Checkout - create order from cart
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shipping_address: { type: string, example: "TP.HCM" }
 *               promotion_id: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/checkout', authMiddleware, orderController.checkout);

/**
 * @openapi
 * /api/orders/my-orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get my order history
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/my-orders', authMiddleware, orderController.getMyOrders);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order detail
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order detail
 */
router.get('/:id', authMiddleware, orderController.getOrderById);

/**
 * @openapi
 * /api/orders/{id}/cancel:
 *   put:
 *     tags: [Orders]
 *     summary: Cancel a Pending order
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order cancelled
 */
router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);

// Admin routes
/**
 * @openapi
 * /api/admin/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Admin - Get all orders
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: All orders
 */

/**
 * @openapi
 * /api/admin/orders/{id}/status:
 *   put:
 *     tags: [Orders]
 *     summary: Admin - Update order status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, example: Shipping }
 *     responses:
 *       200:
 *         description: Status updated
 */

module.exports = router;
