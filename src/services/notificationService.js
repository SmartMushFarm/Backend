const Notification = require('../models/notificationModel');
const { pool } = require('../config/db');

const DEFAULT_PRESET_NAME = 'Nấm Hương';

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();
const normalizeEventKey = (event) => normalizeStatus(event).replace(/[\s_-]+/g, '');

const getPresetNotificationEvent = (event) => {
    const eventMap = {
        presetapplied: 'preset_applied',
        fancyclerunning: 'fan_cycle_running',
        mistpulseactive: 'mist_pulse_active',
    };

    return eventMap[normalizeEventKey(event)] || null;
};

const getAdminNotificationEvent = (event) => {
    const eventMap = {
        neworder: 'new_order',
    };

    return eventMap[normalizeEventKey(event)] || null;
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const buildNotificationPayload = ({ userId, deviceId, title, message, type = 'Info' }) => ({
    user_id: userId,
    device_id: deviceId || null,
    type,
    title,
    message,
});

const getAdminIds = async () => {
    const result = await pool.query(`SELECT id FROM users WHERE LOWER(role) = LOWER($1)`, ['Admin']);
    return result.rows.map(row => row.id);
};

const buildNewOrderAdminMessage = (orderId, customerName) =>
    `📦 Đơn hàng mới #${orderId} từ ${customerName || 'Khách hàng'}`;

const buildPresetAppliedMessage = (presetName, deviceName) =>
    `✅ Preset '${presetName}' đã được áp dụng cho ${deviceName}`;

const buildFanCycleRunningMessage = (presetName, durationMinutes) =>
    `💨 Vòng tuần hoàn quạt đang chạy (${durationMinutes} phút) - Preset: ${presetName}`;

const buildMistPulseActiveMessage = () =>
    '💧 Phun sương đang hoạt động (Modus tự động)';

const NotificationService = {
    sendOrderCreated: async (userId, orderId) => {
        try {
            await Notification.create({
                user_id: userId,
                type: 'Info',
                title: 'Đơn hàng được tạo thành công',
                message: `Đơn hàng #${orderId} được tạo thành công. Vui lòng tiến hành thanh toán hoặc chọn phương thức thanh toán.`,
            });
        } catch (error) {
            console.error('Error sending OrderCreated notification:', error);
        }
    },

    sendOrderStatusUpdated: async (userId, orderId, status) => {
        try {
            const normalizedStatus = normalizeStatus(status);
            let title = 'Cập nhật trạng thái đơn hàng';
            let message = `Đơn hàng #${orderId} đã được cập nhật: ${status} 📦`;
            let type = 'Info';

            if (normalizedStatus === 'delivered' || normalizedStatus === 'đã giao') {
                title = 'Đơn hàng giao thành công';
                message = `✅ Đơn hàng #${orderId} đã được giao thành công! Cảm ơn bạn đã mua hàng.`;
            } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'đã hủy') {
                title = 'Đơn hàng đã hủy';
                message = `❌ Đơn hàng #${orderId} đã bị hủy.`;
                type = 'Warning';
            }

            await Notification.create({
                user_id: userId,
                type,
                title,
                message,
            });
        } catch (error) {
            console.error('Error sending OrderStatusUpdated notification:', error);
        }
    },

    sendStockWarning: async (productId, productName, currentStock) => {
        try {
            const adminIds = await getAdminIds();

            if (adminIds.length === 0) return;

            await Notification.createBatch(adminIds, {
                type: 'Warning',
                title: 'Cảnh báo tồn kho',
                message: `⚠️ Sản phẩm "${productName}" sắp hết hàng (Còn ${currentStock} cái). Vui lòng nhập thêm hàng.`,
            });
        } catch (error) {
            console.error('Error sending StockWarning notification:', error);
        }
    },

    sendNewOrderToAdmins: async (orderId, customerName = 'Khách hàng') => {
        try {
            const adminIds = await getAdminIds();

            if (adminIds.length === 0) return;

            await Notification.createBatch(adminIds, {
                type: 'Info',
                title: 'New Order',
                message: buildNewOrderAdminMessage(orderId, customerName),
            });
        } catch (error) {
            console.error('Error sending NewOrder admin notification:', error);
        }
    },

    sendAdminNotification: async (event, data = {}) => {
        const adminEvent = getAdminNotificationEvent(event);

        if (!adminEvent) {
            console.warn(`Unsupported admin notification event: ${event}`);
            return;
        }

        if (adminEvent === 'new_order') {
            await NotificationService.sendNewOrderToAdmins(data.orderId, data.customerName);
        }
    },

    sendDeviceClaimed: async (userId, deviceName, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(options) ? options : {};
            await Notification.create({
                user_id: userId,
                device_id: normalizedOptions.deviceId || null,
                type: 'Info',
                title: 'Thiết bị kết nối thành công',
                message: `✅ Thiết bị '${deviceName}' đã kết nối thành công!`,
            });
        } catch (error) {
            console.error('Error sending DeviceClaimed notification:', error);
        }
    },

    sendDeviceInactive: async (userId, deviceName, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(options) ? options : {};
            await Notification.create({
                user_id: userId,
                device_id: normalizedOptions.deviceId || null,
                type: 'Warning',
                title: 'Thiết bị mất kết nối',
                message: `⚠️ Thiết bị '${deviceName}' mất kết nối (Offline 5 phút)`,
            });
        } catch (error) {
            console.error('Error sending DeviceInactive notification:', error);
        }
    },

    sendDeviceActiveAgain: async (userId, deviceName, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(options) ? options : {};
            await Notification.create({
                user_id: userId,
                device_id: normalizedOptions.deviceId || null,
                type: 'Info',
                title: 'Thiết bị trực tuyến trở lại',
                message: `✅ Thiết bị '${deviceName}' đã quay trở lại online`,
            });
        } catch (error) {
            console.error('Error sending DeviceActiveAgain notification:', error);
        }
    },

    sendDangerousTemp: async (userId, deviceName, temperature, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(options) ? options : {};
            await Notification.create({
                user_id: userId,
                device_id: normalizedOptions.deviceId || null,
                type: 'Danger',
                title: 'CẢNH BÁO: Nhiệt độ cao',
                message: `🔴 CẢNH BÁO: Nhiệt độ quá cao (${temperature}°C) ở ${deviceName}!`,
            });
        } catch (error) {
            console.error('Error sending DangerousTemp notification:', error);
        }
    },

    sendDangerousHumidity: async (userId, deviceName, humidity, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(options) ? options : {};
            await Notification.create({
                user_id: userId,
                device_id: normalizedOptions.deviceId || null,
                type: 'Danger',
                title: 'CẢNH BÁO: Độ ẩm bất thường',
                message: `🔴 CẢNH BÁO: Độ ẩm bất thường (${humidity}%) ở ${deviceName}!`,
            });
        } catch (error) {
            console.error('Error sending DangerousHumidity notification:', error);
        }
    },

    sendAutoControlActivated: async (userId, deviceName, presetName, options = {}) => {
        return NotificationService.sendPresetApplied(userId, deviceName, presetName, options);
    },

    sendPresetApplied: async (userId, deviceName, presetName, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(options) ? options : {};
            const normalizedPresetName = presetName || DEFAULT_PRESET_NAME;

            await Notification.create(buildNotificationPayload({
                userId,
                deviceId: normalizedOptions.deviceId,
                title: 'Preset Applied',
                message: buildPresetAppliedMessage(normalizedPresetName, deviceName),
            }));
        } catch (error) {
            console.error('Error sending PresetApplied notification:', error);
        }
    },

    sendFanCycleRunning: async (userId, presetName = DEFAULT_PRESET_NAME, durationMinutes = 3, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(durationMinutes) ? durationMinutes : options;
            const normalizedDuration = Number.isFinite(Number(durationMinutes)) ? Number(durationMinutes) : 3;
            const normalizedPresetName = presetName || DEFAULT_PRESET_NAME;

            await Notification.create(buildNotificationPayload({
                userId,
                deviceId: normalizedOptions.deviceId,
                title: 'Fan Cycle Running',
                message: buildFanCycleRunningMessage(normalizedPresetName, normalizedDuration),
            }));
        } catch (error) {
            console.error('Error sending FanCycleRunning notification:', error);
        }
    },

    sendMistPulseActive: async (userId, options = {}) => {
        try {
            const normalizedOptions = isPlainObject(options) ? options : {};

            await Notification.create(buildNotificationPayload({
                userId,
                deviceId: normalizedOptions.deviceId,
                title: 'Mist Pulse Active',
                message: buildMistPulseActiveMessage(),
            }));
        } catch (error) {
            console.error('Error sending MistPulseActive notification:', error);
        }
    },

    sendPresetScheduleNotification: async (event, {
        userId,
        deviceId = null,
        deviceName = null,
        presetName = DEFAULT_PRESET_NAME,
        durationMinutes = 3,
    } = {}) => {
        const presetEvent = getPresetNotificationEvent(event);
        const normalizedPresetName = presetName || DEFAULT_PRESET_NAME;

        if (!presetEvent) {
            console.warn(`Unsupported preset notification event: ${event}`);
            return;
        }

        if (presetEvent === 'preset_applied') {
            await NotificationService.sendPresetApplied(userId, deviceName, normalizedPresetName, { deviceId });
            return;
        }

        if (presetEvent === 'fan_cycle_running') {
            await NotificationService.sendFanCycleRunning(userId, normalizedPresetName, durationMinutes, { deviceId });
            return;
        }

        if (presetEvent === 'mist_pulse_active') {
            await NotificationService.sendMistPulseActive(userId, { deviceId });
        }
    },

    sendControlCommandSent: async (userId, deviceName, target, reason, options = {}) => {
        try {
            const normalizedTarget = normalizeStatus(target);
            const normalizedReason = normalizeStatus(reason);
            const normalizedOptions = isPlainObject(options) ? options : {};

            if (normalizedTarget === 'mist') {
                await NotificationService.sendMistPulseActive(userId, { deviceId: normalizedOptions.deviceId });
                return;
            }

            if (normalizedTarget === 'fan') {
                const presetName = normalizedReason.includes('preset')
                    ? String(reason || '').replace(/^preset:\s*/i, '').trim() || DEFAULT_PRESET_NAME
                    : DEFAULT_PRESET_NAME;
                await NotificationService.sendFanCycleRunning(userId, presetName, 3, { deviceId: normalizedOptions.deviceId });
                return;
            }

            const targetMap = { fan: 'Quạt', mist: 'Máy phun sương', heater: 'Máy sưởi', light: 'Đèn' };
            const iconMap = { fan: '💨', mist: '💧', heater: '🔥', light: '💡' };
            const icon = iconMap[normalizedTarget] || '⚙️';
            const targetName = targetMap[normalizedTarget] || target;
            const message = `${icon} ${targetName} được bật tự động (${reason})` + (deviceName ? ` ở ${deviceName}` : '');

            await Notification.create({
                user_id: userId,
                device_id: normalizedOptions.deviceId || null,
                type: 'Info',
                title: `${targetName} đã hoạt động`,
                message,
            });
        } catch (error) {
            console.error('Error sending ControlCommandSent notification:', error);
        }
    },
};

module.exports = NotificationService;
