const express = require('express');
const ctrl = require('../controllers/maintenanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Maintenance
 *     description: Maintenance request APIs
 */

router.use(authMiddleware, roleMiddleware('Technician', 'Admin'));

/**
 * @openapi
 * /api/technician/maintenance-tasks:
 *   get:
 *     tags: [Maintenance]
 *     summary: Technician - Get assigned maintenance tasks
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
 *     tags: [Maintenance]
 *     summary: Technician - Get maintenance task by id
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
 * /api/technician/maintenance-tasks/{id}/request-completion:
 *   put:
 *     tags: [Maintenance]
 *     summary: Technician - Submit completed task for admin confirmation
 *     description: Changes status from Processing to WaitingConfirmation. Admin must confirm before it becomes Completed.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               technician_note:
 *                 type: string
 *                 description: Maintenance result note for admin.
 *                 example: Da thay dau phun suong va kiem tra cam bien do am.
 *           example:
 *             technician_note: Da thay dau phun suong va kiem tra cam bien do am.
 *     responses:
 *       200:
 *         description: Task submitted for admin confirmation
 */
router.put('/maintenance-tasks/:id/request-completion', ctrl.requestCompletion);

// TODO: check-components and repair-bill routes will be added
// when components, device_components, repair_bills tables are available

module.exports = router;
