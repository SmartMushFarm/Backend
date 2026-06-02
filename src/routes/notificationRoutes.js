const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Notifications
 *     description: Notification APIs
 */

router.get('/', authMiddleware, notificationController.getNotifications);
router.put('/read-all', authMiddleware, notificationController.markAllRead);
router.put('/:id/read', authMiddleware, notificationController.markRead);

module.exports = router;
