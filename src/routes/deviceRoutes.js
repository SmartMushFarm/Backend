const express = require('express');
const deviceController = require('../controllers/deviceController');
const componentController = require('../controllers/componentController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Devices
 *     description: Device management, sensor, and MQTT control APIs
 */

/**
 * @openapi
 * /api/devices:
 *   get:
 *     summary: Admin - Get all devices
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of devices
 */
// Admin: list all devices
router.get('/', authMiddleware, roleMiddleware('Admin'), deviceController.getAllDevices);

/**
 * @openapi
 * /api/devices/my-devices:
 *   get:
 *     summary: Get devices belonging to current user
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's devices
 */
// Customer: list own devices
router.get('/my-devices', authMiddleware, deviceController.getMyDevices);

/**
 * @openapi
 * /api/devices:
 *   post:
 *     summary: Create a new device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Device created
 */
router.post('/', authMiddleware, deviceController.createDevice);

/**
 * @openapi
 * /api/devices/{id}:
 *   get:
 *     summary: Get device by id
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device found
 *       404:
 *         description: Device not found
 */
router.get('/:id', authMiddleware, deviceController.getDeviceById);
/**
 * @openapi
 * /api/devices/{id}:
 *   put:
 *     summary: Update device by id
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Device updated
 */
router.put('/:id', authMiddleware, deviceController.updateDevice);
/**
 * @openapi
 * /api/devices/{id}:
 *   delete:
 *     summary: Delete (deactivate) device by id
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device deactivated
 */
router.delete('/:id', authMiddleware, deviceController.deleteDevice);

/**
 * @openapi
 * /api/devices/{id}/sensor-data:
 *   post:
 *     summary: IoT device submits sensor data (no auth)
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Sensor data accepted
 */
router.post('/:id/sensor-data', deviceController.submitSensorData);
/**
 * @openapi
 * /api/devices/{id}/history:
 *   get:
 *     summary: Get device history (admin/user authorized)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History list
 */
router.get('/:id/history', authMiddleware, deviceController.getHistory);

/**
 * @openapi
 * /api/devices/{id}/latest-status:
 *   get:
 *     summary: Get latest device status
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Latest status
 */
router.get('/:id/latest-status', authMiddleware, deviceController.getLatestStatus);

/**
 * @openapi
 * /api/devices/{id}/control:
 *   put:
 *     summary: Update device state in DB (control)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Device state updated
 */
router.put('/:id/control', authMiddleware, deviceController.control);

/**
 * @openapi
 * /api/devices/{id}/control:
 *   post:
 *     summary: Send MQTT command to physical device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device, action]
 *             properties:
 *               device:
 *                 type: string
 *               action:
 *                 type: string
 *     responses:
 *       200:
 *         description: Command sent
 */
router.post('/:id/control', deviceController.controlDevice);

/**
 * @openapi
 * /api/devices/{id}/mode:
 *   put:
 *     summary: Set device mode (Auto or Manual)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [Auto, Manual]
 *     responses:
 *       200:
 *         description: Mode updated
 */
router.put('/:id/mode', authMiddleware, deviceController.changeMode);

/**
 * @openapi
 * /api/devices/{id}/generate-claim-code:
 *   post:
 *     summary: Admin - Generate claim code for a device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Claim code generated
 */
router.post('/:id/generate-claim-code', authMiddleware, roleMiddleware('Admin'), deviceController.generateClaimCode);

/**
 * @openapi
 * /api/devices/claim:
 *   post:
 *     summary: Claim a device using claim code
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [claimCode]
 *             properties:
 *               claimCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device claimed
 */
router.post('/claim', authMiddleware, deviceController.claimDevice);

/**
 * @openapi
 * /api/devices/{id}/remove-owner:
 *   put:
 *     summary: Remove device owner (unbind device from account)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device unbound from owner
 */
router.put('/:id/remove-owner', authMiddleware, deviceController.removeOwner);

// Preset apply
/**
 * @openapi
 * /api/devices/{deviceId}/apply-preset/{presetId}:
 *   put:
 *     summary: Apply preset to device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: presetId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Preset applied
 */
router.put('/:deviceId/apply-preset/:presetId', authMiddleware, require('../controllers/presetController').applyToDevice);

// Device components
/**
 * @openapi
 * /api/devices/{deviceId}/components:
 *   get:
 *     summary: Get components for a device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Component list
 */
router.get('/:deviceId/components', authMiddleware, componentController.getDeviceComponents);

/**
 * @openapi
 * /api/devices/{deviceId}/components:
 *   post:
 *     summary: Add a component to device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Component added
 */
router.post('/:deviceId/components', authMiddleware, roleMiddleware('Admin', 'Technician'), componentController.addToDevice);

module.exports = router;
