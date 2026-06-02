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
 * /api/maintenance:
 *   post:
 *     tags: [Maintenance]
 *     summary: Create a maintenance request
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Request created
 */
router.post('/', authMiddleware, ctrl.createRequest);

/**
 * @openapi
 * /api/maintenance/my-requests:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get current user's maintenance requests
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get('/my-requests', authMiddleware, ctrl.getMyRequests);

/**
 * @openapi
 * /api/maintenance/{id}:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get maintenance request by id
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
