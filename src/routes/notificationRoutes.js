const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Notifications
 *     description: Notification Management APIs
 */

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get all notifications for current user (with pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                 pagination:
 *                   type: object
 *                 unreadCount:
 *                   type: integer
 */
router.get('/', authMiddleware, notificationController.getAll);

// Static routes must be declared before /:id so Express does not treat them as IDs.
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);
router.delete('/delete-all', authMiddleware, notificationController.deleteAll);

/**
 * @openapi
 * /api/notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification detail by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notification detail
 *       404:
 *         description: Notification not found
 */
router.get('/:id', authMiddleware, notificationController.getById);

/**
 * @openapi
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create notification (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, title, message]
 *             properties:
 *               user_id:
 *                 type: integer
 *               device_id:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [Info, Warning, Danger, Maintenance]
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created
 *       400:
 *         description: Missing required fields
 */
router.post('/', authMiddleware, roleMiddleware('Admin'), notificationController.create);

/**
 * @openapi
 * /api/notifications/batch-create:
 *   post:
 *     tags: [Notifications]
 *     summary: Create notification for multiple users (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_ids, title, message]
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               device_id:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [Info, Warning, Danger, Maintenance]
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notifications created
 */
router.post('/batch-create', authMiddleware, roleMiddleware('Admin'), notificationController.createBatch);

/**
 * @openapi
 * /api/notifications/{id}:
 *   put:
 *     tags: [Notifications]
 *     summary: Update notification (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Info, Warning, Danger, Maintenance]
 *     responses:
 *       200:
 *         description: Notification updated
 */
router.put('/:id', authMiddleware, roleMiddleware('Admin'), notificationController.update);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/:id/read', authMiddleware, notificationController.markAsRead);

/**
 * @openapi
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete notification
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete('/:id', authMiddleware, notificationController.delete);

/**
 * @openapi
 * /api/notifications/delete-all:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete all notifications of current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All notifications deleted
 */
router.delete('/delete-all', authMiddleware, notificationController.deleteAll);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);

module.exports = router;
