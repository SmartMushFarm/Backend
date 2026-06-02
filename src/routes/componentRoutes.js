const express = require('express');
const componentController = require('../controllers/componentController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Components
 *     description: Device component management
 */

router.get('/', authMiddleware, componentController.getAll);
router.post('/', authMiddleware, roleMiddleware('Admin'), componentController.create);
router.put('/:id', authMiddleware, roleMiddleware('Admin'), componentController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Admin'), componentController.delete);

// Device components (nested under /devices/:deviceId/components in deviceRoutes)
router.put('/device-components/:id', authMiddleware, componentController.updateDeviceComponent);

module.exports = router;
