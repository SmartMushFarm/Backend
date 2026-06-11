const { pool } = require('../config/db');
const NotificationService = require('./notificationService');

// Inactivity threshold expressed directly in SQL (5 minutes)
const INACTIVITY_THRESHOLD_MINUTES = 5;
const INACTIVITY_INTERVAL_SQL = `${INACTIVITY_THRESHOLD_MINUTES} minutes`;
const REPEAT_NOTIFICATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Memory to track when we last sent an Inactive notification for a device
// Key: deviceId, Value: timestamp (ms)
const lastNotifiedAt = new Map();

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

        const now = Date.now();

        if (transitionResult && transitionResult.rowCount > 0) {
            console.log(`[DeviceInactivity] marked ${transitionResult.rowCount} devices Inactive`);
            for (const device of transitionResult.rows) {
                if (device.owner_id) {
                    await NotificationService.sendDeviceInactive(device.owner_id, device.device_name, { deviceId: device.id });
                    lastNotifiedAt.set(device.id, now);
                }
            }
        }

        // 2. Check devices already Inactive for repeat notification (every 30 mins)
        const inactiveDevicesSql = `
            SELECT id, device_name, owner_id FROM devices
            WHERE status = 'Inactive' AND owner_id IS NOT NULL`;

        const inactiveResult = await pool.query(inactiveDevicesSql);

        for (const device of inactiveResult.rows) {
            const lastTime = lastNotifiedAt.get(device.id);

            // If we have a record of notifying them, check if it's been 30 mins
            // If we DON'T have a record (e.g. server restarted), we could decide to notify or wait.
            // Let's notify if it's been 30 mins since the last record, or if no record exists but it's been inactive for a long time.
            // To keep it simple: if no record, we set it now so the next 30 min cycle will trigger it.

            if (lastTime) {
                if (now - lastTime >= REPEAT_NOTIFICATION_INTERVAL_MS) {
                    await NotificationService.sendDeviceInactive(device.owner_id, device.device_name, { deviceId: device.id });
                    lastNotifiedAt.set(device.id, now);
                    console.log(`[DeviceInactivity] Repeat notification sent for ${device.device_name} (${device.id})`);
                }
            } else {
                // Initialize the timer for already inactive devices found after restart
                lastNotifiedAt.set(device.id, now);
            }
        }

    } catch (e) {
        console.error('[DeviceInactivity] error in runCheckOnce:', e);
    }
};

const scheduleInactivityCheck = (intervalMs = 60 * 1000) => {
    runCheckOnce().catch((e) => console.error('[DeviceInactivity] error', e));
    setInterval(() => runCheckOnce().catch((e) => console.error('[DeviceInactivity] error', e)), intervalMs);
    console.log(`[DeviceInactivity] scheduled every ${intervalMs}ms (threshold: ${INACTIVITY_THRESHOLD_MINUTES} minutes, repeat: 30 minutes)`);
};

const clearLastNotifiedAt = (deviceId) => {
    lastNotifiedAt.delete(deviceId);
};

module.exports = { runCheckOnce, scheduleInactivityCheck, lastNotifiedAt, clearLastNotifiedAt };
