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
 *     summary: Get maintenance tasks for technician
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

/**
 * @openapi
 * /api/technician/maintenance-tasks/{id}/check-components:
 *   put:
 *     tags: [Technician]
 *     summary: Check components for a maintenance task
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Checked
 */
router.put('/maintenance-tasks/:id/check-components', ctrl.checkComponents);

/**
 * @openapi
 * /api/technician/maintenance-tasks/{id}/repair-bill:
 *   post:
 *     tags: [Technician]
 *     summary: Create a repair bill for a task
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
 *     responses:
 *       201:
 *         description: Repair bill created
 */
router.post('/maintenance-tasks/:id/repair-bill', ctrl.createRepairBill);

/**
 * @openapi
 * /api/technician/maintenance-tasks/{id}/complete:
 *   put:
 *     tags: [Technician]
 *     summary: Mark maintenance task as complete
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Completed
 */
router.put('/maintenance-tasks/:id/complete', ctrl.completeMaintenance);

module.exports = router;
