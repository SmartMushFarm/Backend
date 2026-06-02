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

router.get('/my-bills', authMiddleware, repairBillController.getMyBills);
router.get('/:id', authMiddleware, repairBillController.getBillById);
router.put('/:id/pay', authMiddleware, repairBillController.pay);

module.exports = router;
