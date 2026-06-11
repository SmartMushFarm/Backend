const { pool } = require('../config/db');

// Inactivity threshold expressed directly in SQL (2 minutes)
const INACTIVITY_INTERVAL_SQL = "2 minutes";

const runCheckOnce = async () => {
  // Mark devices Inactive when the most recent history.created_at (if any)
  // or device.created_at is older than the threshold.
  const sql = `UPDATE devices SET status = 'Inactive'
    WHERE status = 'Active'
      AND (
        COALESCE((SELECT MAX(created_at) FROM history WHERE device_id = devices.id), devices.created_at)
        < (NOW() - INTERVAL '${INACTIVITY_INTERVAL_SQL}')
      )
    RETURNING id, owner_id, device_name`;

  const result = await pool.query(sql);
  if (result && result.rowCount) {
    console.log(`[DeviceInactivity] marked ${result.rowCount} devices Inactive`);
  }
  return result ? result.rowCount : 0;
};

const scheduleInactivityCheck = (intervalMs = 60 * 1000) => {
  runCheckOnce().catch((e) => console.error('[DeviceInactivity] error', e));
  setInterval(() => runCheckOnce().catch((e) => console.error('[DeviceInactivity] error', e)), intervalMs);
  console.log('[DeviceInactivity] scheduled every', intervalMs, 'ms (threshold: 2 minutes)');
};

module.exports = { runCheckOnce, scheduleInactivityCheck };

// --- DECORATORS FOR NOTIFICATIONS (ADDITIVE ONLY) ---
const originalQuery = pool.query;
pool.query = function (text, params) {
    if (typeof text === 'string' && /update\s+devices\s+set\s+status\s*=\s*['"]inactive['"]/i.test(text)) {
        const modifiedText = /returning\s+id\s*,\s*owner_id\s*,\s*device_name/i.test(text)
            ? text
            : text.replace(/returning\s+id/i, "RETURNING id, owner_id, device_name");
        return originalQuery.call(pool, modifiedText, params).then(result => {
            if (result && result.rows && result.rows.length) {
                const NotificationService = require('./notificationService');
                for (const device of result.rows) {
                    if (device.owner_id) {
                        NotificationService.sendDeviceInactive(device.owner_id, device.device_name, {
                            deviceId: device.id,
                        }).catch(console.error);
                    }
                }
            }
            return result;
        });
    }
    return originalQuery.apply(pool, arguments);
};
