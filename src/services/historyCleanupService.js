const Device = require('../models/deviceModel');
const historyModel = require('../models/historyModel');

const runCleanupOnce = async () => {
  try {
    // Perform cleanup: remove history older than the most recent day for each device
    const deleted = await historyModel.cleanupKeepLatestDayPerDevice();
    console.log(`[HistoryCleanup] completed, deleted ${deleted} old history rows`);
    return deleted;
  } catch (e) {
    console.error('[HistoryCleanup] error', e);
    throw e;
  }
};

// Schedule cleanup every N milliseconds (default 2 days)
const scheduleCleanup = (intervalMs = 2 * 24 * 60 * 60 * 1000) => {
  // run immediately at startup
  runCleanupOnce().catch(() => {});

  setInterval(() => {
    runCleanupOnce().catch(() => {});
  }, intervalMs);

  console.log('[HistoryCleanup] scheduled every', intervalMs, 'ms');
};

module.exports = { runCleanupOnce, scheduleCleanup };
