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
    RETURNING id`;

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
