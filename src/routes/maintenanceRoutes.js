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

/**
 * @openapi
 * /api/maintenance-requests:
 *   post:
 *     tags: [Maintenance]
 *     summary: Customer - Create a maintenance request
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - title
 *               - description
 *             properties:
 *               device_id:
 *                 type: integer
 *                 description: ID of the customer's device that needs maintenance.
 *                 example: 1
 *               title:
 *                 type: string
 *                 description: Short maintenance issue title.
 *                 example: May phun suong bi loi
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue.
 *                 example: Thiet bi khong phun suong, do am trong trai nam bi giam.
 *           example:
 *             device_id: 1
 *             title: May phun suong bi loi
 *             description: Thiet bi khong phun suong, do am trong trai nam bi giam.
 *     responses:
 *       201:
 *         description: Request created
 */
router.post('/', authMiddleware, ctrl.createRequest);

/**
 * @openapi
 * /api/maintenance-requests/my-requests:
 *   get:
 *     tags: [Maintenance]
 *     summary: Customer - Get current user's maintenance requests
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get('/my-requests', authMiddleware, ctrl.getMyRequests);

/**
 * @openapi
 * /api/maintenance-requests/{id}/cancel:
 *   put:
 *     tags: [Maintenance]
 *     summary: Customer - Cancel a pending maintenance request
 *     description: Customer can cancel only their own request while it is still Pending. After admin approves it to Received, customer cannot cancel it.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 1
 *     responses:
 *       200:
 *         description: Request cancelled
 *       400:
 *         description: Only Pending maintenance requests can be cancelled by customer
 *       403:
 *         description: Request does not belong to current customer
 *       404:
 *         description: Maintenance request not found
 */
router.put('/:id/cancel', authMiddleware, ctrl.cancelMyRequest);

/**
 * @openapi
 * /api/maintenance-requests/{id}:
 *   get:
 *     tags: [Maintenance]
 *     summary: Customer/Admin - Get maintenance request by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Request details
 */
router.get('/:id', authMiddleware, ctrl.getRequestById);

module.exports = router;
