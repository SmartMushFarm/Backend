const express = require('express');
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Cart
 *     description: Shopping cart APIs
 */

/**
 * @openapi
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get current user's cart
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart with items
 */
router.get('/', authMiddleware, cartController.getCart);

/**
 * @openapi
 * /api/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id: { type: integer, example: 1 }
 *               quantity: { type: integer, example: 2 }
 *     responses:
 *       201:
 *         description: Item added
 */
router.post('/items', authMiddleware, cartController.addItem);

/**
 * @openapi
 * /api/cart/items/{id}:
 *   put:
 *     tags: [Cart]
 *     summary: Update item quantity
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
 *               quantity: { type: integer, example: 3 }
 *     responses:
 *       200:
 *         description: Item updated
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Item removed
 */
router.put('/items/:id', authMiddleware, cartController.updateItem);
router.delete('/items/:id', authMiddleware, cartController.deleteItem);

/**
 * @openapi
 * /api/cart/clear:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear entire cart
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/clear', authMiddleware, cartController.clearCart);

module.exports = router;
