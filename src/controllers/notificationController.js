const Notification = require('../models/notificationModel');

const sendError = (res, error) => res.status(error.status || 500).json({ success: false, message: error.message });

const notificationController = {
    /**
     * GET /api/notifications
     * Lấy tất cả notification của user hiện tại (có pagination)
     * Query params: page=1, limit=10, unreadOnly=true (optional)
     */
    getAll: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const unreadOnly = req.query.unreadOnly === 'true';

            let data;
            if (unreadOnly) {
                data = await Notification.getUnread(req.user.id, limit, offset);
            } else {
                data = await Notification.getByUserId(req.user.id, limit, offset);
            }

            const total = await Notification.countByUserId(req.user.id);
            const unreadCount = await Notification.countUnread(req.user.id);

            return res.json({
                success: true,
                data,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
                unreadCount
            });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * GET /api/notifications/:id
     * Lấy chi tiết 1 notification
     */
    getById: async (req, res) => {
        try {
            const notification = await Notification.findById(req.params.id);
            if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
            
            // Mark as read tự động khi xem chi tiết
            if (notification.is_read === false) {
                await Notification.markAsRead(req.params.id);
            }

            return res.json({ success: true, data: notification });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * POST /api/notifications
     * Tạo notification mới (Admin only)
     * Body: { user_id, device_id, title, message, type }
     */
    create: async (req, res) => {
        try {
            const { user_id, device_id, title, message, type } = req.body;

            if (!user_id || !title || !message) {
                return res.status(400).json({ success: false, message: 'user_id, title, message are required' });
            }

            const notification = await Notification.create({
                user_id,
                device_id,
                title,
                message,
                type
            });

            return res.status(201).json({ success: true, data: notification });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * POST /api/notifications/batch
     * Tạo notification cho nhiều users (Admin only)
     * Body: { user_ids: [1, 2, 3], device_id, title, message, type }
     */
    createBatch: async (req, res) => {
        try {
            const { user_ids, device_id, title, message, type } = req.body;

            if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
                return res.status(400).json({ success: false, message: 'user_ids array is required' });
            }

            if (!title || !message) {
                return res.status(400).json({ success: false, message: 'title, message are required' });
            }

            const notifications = await Notification.createBatch(user_ids, {
                device_id,
                title,
                message,
                type
            });

            return res.status(201).json({ success: true, data: notifications, count: notifications.length });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * PUT /api/notifications/:id
     * Cập nhật notification (Admin only)
     * Body: { title, message, type }
     */
    update: async (req, res) => {
        try {
            const notification = await Notification.findById(req.params.id);
            if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

            const updated = await Notification.update(req.params.id, req.body);
            return res.json({ success: true, data: updated });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * PUT /api/notifications/:id/read
     * Mark notification as read
     */
    markAsRead: async (req, res) => {
        try {
            const notification = await Notification.findById(req.params.id);
            if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
            if (notification.user_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            const updated = await Notification.markAsRead(req.params.id);
            return res.json({ success: true, data: updated });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * PUT /api/notifications/read-all
     * Mark tất cả notification của user as read
     */
    markAllAsRead: async (req, res) => {
        try {
            const notifications = await Notification.markAllAsRead(req.user.id);
            return res.json({ success: true, message: 'All notifications marked as read', count: notifications.length });
        } catch (e) { return sendError(res, e); }
    },
    /**
     * PUT /api/notifications/read-all
     * Mark tất cả notification của user as read
     */
    markAllAsRead: async (req, res) => {
        try {
            const notifications = await Notification.markAllAsRead(req.user.id);
            return res.json({ success: true, message: 'All notifications marked as read', count: notifications.length });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * DELETE /api/notifications/:id
     * Xóa notification
     */
    delete: async (req, res) => {
        try {
            const notification = await Notification.findById(req.params.id);
            if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
            if (notification.user_id !== req.user.id && req.user.role !== 'Admin') {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            await Notification.delete(req.params.id);
            return res.json({ success: true, message: 'Notification deleted' });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * DELETE /api/notifications/delete-all
     * Xóa tất cả notification của user
     */
    deleteAll: async (req, res) => {
        try {
            const notifications = await Notification.deleteAll(req.user.id);
            return res.json({ success: true, message: 'All notifications deleted', count: notifications.length });
        } catch (e) { return sendError(res, e); }
    },

    /**
     * GET /api/notifications/unread-count
     * Lấy số lượng notification chưa đọc
     */
    getUnreadCount: async (req, res) => {
        try {
            const count = await Notification.countUnread(req.user.id);
            return res.json({ success: true, unreadCount: count });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = notificationController;
