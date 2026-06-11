const { pool } = require('../config/db');

const normalizeNotificationType = (type = 'Info') => {
    const allowedTypes = ['Info', 'Warning', 'Danger', 'Maintenance'];
    const normalizedType = String(type || 'Info').trim().toLowerCase();
    return allowedTypes.find(item => item.toLowerCase() === normalizedType) || 'Info';
};

const Notification = {
    /**
     * Lấy tất cả notification của user (có pagination)
     * @param {number} userId - ID user
     * @param {number} limit - Số lượng records trên 1 trang (default 10)
     * @param {number} offset - Offset (default 0)
     */
    getByUserId: async (userId, limit = 10, offset = 0) => {
        const result = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    },

    /**
     * Đếm tổng notification của user
     */
    countByUserId: async (userId) => {
        const result = await pool.query(
            `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`,
            [userId]
        );
        return parseInt(result.rows[0].total);
    },

    /**
     * Đếm notification chưa đọc của user
     */
    countUnread: async (userId) => {
        const result = await pool.query(
            `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return parseInt(result.rows[0].total);
    },

    /**
     * Lấy chi tiết 1 notification
     */
    findById: async (notificationId) => {
        const result = await pool.query(
            `SELECT * FROM notifications WHERE id = $1`,
            [notificationId]
        );
        return result.rows[0] || null;
    },

    /**
     * Tạo notification mới
     */
    create: async (data) => {
        const {
            user_id,
            userId,
            device_id = null,
            deviceId = null,
            title,
            message,
            type = 'Info'
        } = data;
        const normalizedUserId = user_id ?? userId;
        const normalizedDeviceId = device_id ?? deviceId;
        const normalizedType = normalizeNotificationType(type);
        
        const result = await pool.query(
            `INSERT INTO notifications 
             (user_id, device_id, title, message, type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [normalizedUserId, normalizedDeviceId, title, message, normalizedType]
        );
        return result.rows[0];
    },

    /**
     * Tạo notification cho nhiều users
     */
    createBatch: async (userIds, data) => {
        const { device_id = null, deviceId = null, title, message, type = 'Info' } = data;
        const normalizedDeviceId = device_id ?? deviceId;
        const normalizedType = normalizeNotificationType(type);
        
        const placeholders = userIds.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ');
        
        const values = [];
        userIds.forEach(userId => {
            values.push(userId, normalizedDeviceId, title, message, normalizedType);
        });

        const result = await pool.query(
            `INSERT INTO notifications 
             (user_id, device_id, title, message, type)
             VALUES ${placeholders}
             RETURNING *`,
            values
        );
        return result.rows;
    },

    /**
     * Cập nhật notification
     */
    update: async (notificationId, data) => {
        const { title, message, type } = data;
        const normalizedType = type === undefined ? undefined : normalizeNotificationType(type);
        
        const result = await pool.query(
            `UPDATE notifications 
             SET title = COALESCE($1, title),
                 message = COALESCE($2, message),
                 type = COALESCE($3, type)
             WHERE id = $4
             RETURNING *`,
            [title, message, normalizedType, notificationId]
        );
        return result.rows[0];
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (notificationId) => {
        const result = await pool.query(
            `UPDATE notifications 
             SET is_read = true
             WHERE id = $1
             RETURNING *`,
            [notificationId]
        );
        return result.rows[0];
    },

    /**
     * Mark tất cả notification của user as read
     */
    markAllAsRead: async (userId) => {
        const result = await pool.query(
            `UPDATE notifications 
             SET is_read = true
             WHERE user_id = $1 AND is_read = false
             RETURNING *`,
            [userId]
        );
        return result.rows;
    },

    /**
     * Xóa notification
     */
    delete: async (notificationId) => {
        const result = await pool.query(
            `DELETE FROM notifications WHERE id = $1 RETURNING *`,
            [notificationId]
        );
        return result.rows[0];
    },

    /**
     * Xóa tất cả notification của user
     */
    deleteAll: async (userId) => {
        const result = await pool.query(
            `DELETE FROM notifications WHERE user_id = $1 RETURNING *`,
            [userId]
        );
        return result.rows;
    },

    /**
     * Xóa notification theo device_id
     */
    deleteByRelated: async (deviceId) => {
        const result = await pool.query(
            `DELETE FROM notifications WHERE device_id = $1 RETURNING *`,
            [deviceId]
        );
        return result.rows;
    },

    /**
     * Lấy notification chưa đọc của user
     */
    getUnread: async (userId, limit = 10, offset = 0) => {
        const result = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 AND is_read = false
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    },

    /**
     * Lấy notification của một loại type
     */
    getByType: async (userId, type, limit = 10, offset = 0) => {
        const normalizedType = normalizeNotificationType(type);
        const result = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 AND type = $2
             ORDER BY created_at DESC 
             LIMIT $3 OFFSET $4`,
            [userId, normalizedType, limit, offset]
        );
        return result.rows;
    }
};

module.exports = Notification;
