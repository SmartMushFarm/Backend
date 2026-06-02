const Notification = require('../models/notificationModel');
const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const notificationController = {
    getNotifications: async (req, res) => {
        try {
            const data = await Notification.findByUserId(req.user.id);
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    markRead: async (req, res) => {
        try {
            const data = await Notification.markRead(req.params.id, req.user.id);
            if (!data) return res.status(404).json({ success: false, message: 'Notification not found' });
            return res.json({ success: true, data });
        } catch (e) { return sendError(res, e); }
    },

    markAllRead: async (req, res) => {
        try {
            await Notification.markAllRead(req.user.id);
            return res.json({ success: true, message: 'All notifications marked as read' });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = notificationController;
