const express = require('express');
const ctrl = require('../controllers/maintenanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Technician
 *     description: Technician maintenance task APIs
 */

router.use(authMiddleware, roleMiddleware('Technician', 'Admin'));

router.get('/maintenance-tasks', ctrl.getMyTasks);
router.get('/maintenance-tasks/:id', ctrl.getTaskById);
router.put('/maintenance-tasks/:id/check-components', ctrl.checkComponents);
router.post('/maintenance-tasks/:id/repair-bill', ctrl.createRepairBill);
router.put('/maintenance-tasks/:id/complete', ctrl.completeMaintenance);

module.exports = router;
