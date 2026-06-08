const express = require('express');
const promotionController = require('../controllers/promotionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();
const adminOnly = [authMiddleware, roleMiddleware('Admin')];

/**
 * @openapi
 * tags:
 *   - name: Promotions
 *     description: Promotion management APIs
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Promotion:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         code: { type: string, example: SUMMER10 }
 *         discount_percent: { type: number, example: 10 }
 *         valid_from: { type: string, format: date-time, nullable: true }
 *         valid_to: { type: string, format: date-time, nullable: true }
 *         status: { type: string, example: Active }
 *         created_at: { type: string, format: date-time }
 *     PromotionInput:
 *       type: object
 *       required:
 *         - code
 *         - discount_percent
 *       properties:
 *         code: { type: string, example: SUMMER10 }
 *         discount_percent: { type: number, minimum: 0, maximum: 100, example: 10 }
 *         valid_from: { type: string, format: date-time, nullable: true, example: "2026-06-01T00:00:00.000Z" }
 *         valid_to: { type: string, format: date-time, nullable: true, example: "2026-06-30T23:59:59.000Z" }
 *         status: { type: string, enum: [Active, Inactive], example: Active }
 */

/**
 * @openapi
 * /api/promotions:
 *   get:
 *     tags: [Promotions]
 *     summary: Get all promotions
 *     responses:
 *       200:
 *         description: Promotion list
 */
router.get('/', promotionController.getAllPromotions);

/**
 * @openapi
 * /api/promotions/code/{code}:
 *   get:
 *     tags: [Promotions]
 *     summary: Get promotion by code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Promotion detail
 *       404:
 *         description: Promotion not found
 */
router.get('/code/:code', promotionController.getPromotionByCode);

/**
 * @openapi
 * /api/promotions/{id}:
 *   get:
 *     tags: [Promotions]
 *     summary: Get promotion by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion detail
 *       404:
 *         description: Promotion not found
 */
router.get('/:id', promotionController.getPromotionById);

/**
 * @openapi
 * /api/promotions:
 *   post:
 *     tags: [Promotions]
 *     summary: Create promotion
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PromotionInput'
 *     responses:
 *       201:
 *         description: Promotion created
 *       403:
 *         description: Admin only
 */
router.post('/', adminOnly, promotionController.createPromotion);

/**
 * @openapi
 * /api/promotions/{id}:
 *   put:
 *     tags: [Promotions]
 *     summary: Update promotion by id
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
 *             $ref: '#/components/schemas/PromotionInput'
 *     responses:
 *       200:
 *         description: Promotion updated
 *       403:
 *         description: Admin only
 *       404:
 *         description: Promotion not found
 */
router.put('/:id', adminOnly, promotionController.updatePromotion);

/**
 * @openapi
 * /api/promotions/{id}:
 *   delete:
 *     tags: [Promotions]
 *     summary: Delete promotion by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion deleted
 *       403:
 *         description: Admin only
 *       404:
 *         description: Promotion not found
 */
router.delete('/:id', adminOnly, promotionController.deletePromotion);

module.exports = router;
