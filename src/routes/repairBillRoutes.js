const express = require('express');
const repairBillController = require('../controllers/repairBillController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: RepairBills
 *     description: Repair bill APIs
 */

/**
 * @openapi
 * /api/repair-bills/my-bills:
 *   get:
 *     tags: [RepairBills]
 *     summary: Get current user's repair bills
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of bills
 */
router.get('/my-bills', authMiddleware, repairBillController.getMyBills);

/**
 * @openapi
 * /api/repair-bills/{id}:
 *   get:
 *     tags: [RepairBills]
 *     summary: Get repair bill by id
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
 * @openapi
 * /api/repair-bills/{id}/pay:
 *   put:
 *     tags: [RepairBills]
 *     summary: Pay a repair bill
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
