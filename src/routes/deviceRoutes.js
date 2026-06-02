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
 *     description: Device management and sensor APIs
 */

router.get('/my-devices', authMiddleware, deviceController.getMyDevices);
router.post('/', authMiddleware, deviceController.createDevice);
router.get('/:id', authMiddleware, deviceController.getDeviceById);
router.put('/:id', authMiddleware, deviceController.updateDevice);
router.delete('/:id', authMiddleware, deviceController.deleteDevice);

// Sensor data
router.post('/:id/sensor-data', deviceController.submitSensorData);
router.get('/:id/history', authMiddleware, deviceController.getHistory);
router.get('/:id/latest-status', authMiddleware, deviceController.getLatestStatus);

// Control
router.put('/:id/control', authMiddleware, deviceController.control);

// Preset apply
router.put('/:deviceId/apply-preset/:presetId', authMiddleware, require('../controllers/presetController').applyToDevice);

// Device components
router.get('/:deviceId/components', authMiddleware, componentController.getDeviceComponents);
router.post('/:deviceId/components', authMiddleware, roleMiddleware('Admin', 'Technician'), componentController.addToDevice);

module.exports = router;
