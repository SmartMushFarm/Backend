const express = require('express');
const orderController = require('../controllers/orderController');
const maintenanceController = require('../controllers/maintenanceController');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// All admin routes require auth + Admin role
router.use(authMiddleware, roleMiddleware('Admin'));

// Orders
router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id/status', orderController.updateOrderStatus);

// Maintenance
/**
 * @openapi
 * /api/admin/maintenance-requests:
 *   get:
 *     tags: [Maintenance]
 *     summary: Admin - Get all maintenance requests
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Pending, Received, Processing, WaitingConfirmation, Completed, Cancelled]
 *         example: Pending
 *     responses:
 *       200:
 *         description: List of maintenance requests
 */
router.get('/maintenance-requests', maintenanceController.getAllRequests);

/**
 * @openapi
 * /api/admin/maintenance-requests/{id}/approve:
 *   put:
 *     tags: [Maintenance]
 *     summary: Admin - Approve a pending maintenance request
 *     description: Changes status from Pending to Received and assigns the current admin.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 1
 *     responses:
 *       200:
 *         description: Request approved
 */
router.put('/maintenance-requests/:id/approve', maintenanceController.approve);

/**
 * @openapi
 * /api/admin/maintenance-requests/{id}/schedule:
 *   put:
 *     tags: [Maintenance]
 *     summary: Admin - Schedule an approved maintenance request
 *     description: Changes status from Received to Processing and assigns a technician when technician_id is provided.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduled_date:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled maintenance time.
 *                 example: "2026-06-15T09:00:00+07:00"
 *               admin_note:
 *                 type: string
 *                 description: Internal/admin note shown on the request.
 *                 example: Hen ky thuat kiem tra vao sang mai.
 *               technician_id:
 *                 type: integer
 *                 description: User ID of the technician assigned to this maintenance request. Defaults to current admin when omitted.
 *                 example: 3
 *               priority:
 *                 type: string
 *                 enum: [Low, Normal, High, Urgent]
 *                 description: Admin-assessed priority shown to the technician.
 *                 example: High
 *           example:
 *             scheduled_date: "2026-06-15T09:00:00+07:00"
 *             admin_note: Hen ky thuat kiem tra vao sang mai.
 *             technician_id: 3
 *             priority: High
 *     responses:
 *       200:
 *         description: Request scheduled
 */
router.put('/maintenance-requests/:id/schedule', maintenanceController.schedule);

/**
 * @openapi
 * /api/admin/maintenance-requests/{id}/cancel:
 *   put:
 *     tags: [Maintenance]
 *     summary: Admin - Cancel a maintenance request
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
 *               admin_note:
 *                 type: string
 *                 description: Reason for cancellation.
 *                 example: Khach hang huy lich bao tri.
 *           example:
 *             admin_note: Khach hang huy lich bao tri.
 *     responses:
 *       200:
 *         description: Request cancelled
 */
router.put('/maintenance-requests/:id/cancel', maintenanceController.cancel);

/**
 * @openapi
 * /api/admin/maintenance-requests/{id}/confirm-completed:
 *   put:
 *     tags: [Maintenance]
 *     summary: Admin - Confirm a processing maintenance request is completed
 *     description: Changes status from WaitingConfirmation to Completed after technician reports the task as done.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 1
 *     responses:
 *       200:
 *         description: Request completed
 */
router.put('/maintenance-requests/:id/confirm-completed', maintenanceController.confirmCompleted);

// Dashboard
router.get('/dashboard/revenue', dashboardController.revenue);
router.get('/dashboard/orders', dashboardController.orders);
router.get('/dashboard/users', dashboardController.users);
router.get('/dashboard/maintenance', dashboardController.maintenance);
router.get('/dashboard/products', dashboardController.products);

module.exports = router;
