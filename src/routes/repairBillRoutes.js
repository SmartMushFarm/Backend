const express = require('express');
const repairBillController = require('../controllers/repairBillController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * OpenAPI disabled: repair bill routes are not mounted yet.
 * tags:
 *   - name: Maintenance
 *     description: Maintenance request APIs
 */

/**
 * OpenAPI disabled: repair bill routes are not mounted yet.
 * /api/repair-bills/my-bills:
 *   get:
 *     tags: [Maintenance]
 *     summary: Repair bill - Get current user's repair bills
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of bills
 */
router.get('/my-bills', authMiddleware, repairBillController.getMyBills);

/**
 * OpenAPI disabled: repair bill routes are not mounted yet.
 * /api/repair-bills/{id}:
 *   get:
 *     tags: [Maintenance]
 *     summary: Repair bill - Get repair bill by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Bill details
 */
router.get('/:id', authMiddleware, repairBillController.getBillById);

/**
 * OpenAPI disabled: repair bill routes are not mounted yet.
 * /api/repair-bills/{id}/pay:
 *   put:
 *     tags: [Maintenance]
 *     summary: Repair bill - Pay a repair bill
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Payment processed
 */
router.put('/:id/pay', authMiddleware, repairBillController.pay);

module.exports = router;
