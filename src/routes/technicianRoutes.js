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

/**
 * @openapi
 * /api/technician/maintenance-tasks:
 *   get:
 *     tags: [Technician]
 *     summary: Get maintenance tasks assigned to current technician
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/maintenance-tasks', ctrl.getMyTasks);

/**
 * @openapi
 * /api/technician/maintenance-tasks/{id}:
 *   get:
 *     tags: [Technician]
 *     summary: Get maintenance task by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Task details
 */
router.get('/maintenance-tasks/:id', ctrl.getTaskById);

// TODO: check-components, repair-bill, complete routes will be added
// when components, device_components, repair_bills tables are available

module.exports = router;
