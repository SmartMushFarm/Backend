const { pool } = require('../config/db');
const NotificationService = require('./notificationService');

// Inactivity threshold expressed directly in SQL (5 minutes)
const INACTIVITY_THRESHOLD_MINUTES = 5;
const INACTIVITY_INTERVAL_SQL = `${INACTIVITY_THRESHOLD_MINUTES} minutes`;

const runCheckOnce = async () => {
    try {
        // 1. Find devices that should be marked Inactive but are currently Active
        const transitionSql = `
            UPDATE devices
            SET status = 'Inactive'
            WHERE status = 'Active'
              AND (
                COALESCE((SELECT MAX(created_at) FROM history WHERE device_id = devices.id), devices.created_at)
                < (NOW() - INTERVAL '${INACTIVITY_INTERVAL_SQL}')
              )
            RETURNING id, device_name, owner_id`;

        const transitionResult = await pool.query(transitionSql);

        if (transitionResult && transitionResult.rowCount > 0) {
            console.log(`[DeviceInactivity] marked ${transitionResult.rowCount} devices Inactive`);
            for (const device of transitionResult.rows) {
                if (device.owner_id) {
                    await NotificationService.sendDeviceInactive(device.owner_id, device.device_name, {
                        deviceId: device.id,
                    });
                }
            }
        }

        // 2. Let notification service decide whether an inactive device needs a reminder.
        const inactiveDevicesSql = `
            SELECT id, device_name, owner_id FROM devices
            WHERE status = 'Inactive' AND owner_id IS NOT NULL`;

        const inactiveResult = await pool.query(inactiveDevicesSql);

        for (const device of inactiveResult.rows) {
            await NotificationService.sendDeviceInactive(device.owner_id, device.device_name, {
                deviceId: device.id,
                reminderOnly: true,
            });
        }

    } catch (e) {
        console.error('[DeviceInactivity] error in runCheckOnce:', e);
    }
};

const scheduleInactivityCheck = (intervalMs = 60 * 1000) => {
    runCheckOnce().catch((e) => console.error('[DeviceInactivity] error', e));
    setInterval(() => runCheckOnce().catch((e) => console.error('[DeviceInactivity] error', e)), intervalMs);
    console.log(`[DeviceInactivity] scheduled every ${intervalMs}ms (threshold: ${INACTIVITY_THRESHOLD_MINUTES} minutes)`);
};

const clearLastNotifiedAt = (deviceId) => {
    NotificationService.clearDeviceInactiveNotificationState(deviceId);
};

module.exports = { runCheckOnce, scheduleInactivityCheck, clearLastNotifiedAt };
