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

// Customer routes
router.post('/', authMiddleware, ctrl.createRequest);
router.get('/my-requests', authMiddleware, ctrl.getMyRequests);
router.get('/:id', authMiddleware, ctrl.getRequestById);

module.exports = router;
