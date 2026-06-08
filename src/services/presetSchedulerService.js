const Device = require('../models/deviceModel');
const deviceService = require('./deviceService');
const autoControl = require('./autoControlService');

// In-memory job map: deviceId -> { intervalId, currentOffTimeout }
const jobMap = new Map();

// Default: run every 20 minutes for 3 minutes
const DEFAULT_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const DEFAULT_DURATION_MS = 3 * 60 * 1000; // 3 minutes

const log = (...args) => console.log('[PRESET-SCHED]', ...args);

async function runFanCycle(deviceId, durationMs) {
  try {
    const device = await Device.findById(deviceId);
    if (!device) {
      log('device not found, stopping job for', deviceId);
      stopDevicePresetJob(deviceId);
      return;
    }

    // Only run when device still in Auto mode and has preset
    if (device.mode !== 'Auto' || !device.preset_id) {
      log('device not in Auto or no preset, skipping', deviceId);
      return;
    }

    // Mark preset running to prevent auto-control conflicts
    try { autoControl.markPresetRunning(device.device_name); } catch (_) {}

    // Turn fan ON
    try {
      await deviceService.controlViaMqtt(device.id, { device: 'fan', action: 'on' });
      log('fan ON for', device.device_name);
    } catch (e) {
      log('failed to turn fan on for', device.device_name, e.message || e);
    }

    // Schedule OFF after durationMs
    const offTimeout = setTimeout(async () => {
      try {
        await deviceService.controlViaMqtt(device.id, { device: 'fan', action: 'off' });
        log('fan OFF for', device.device_name);
      } catch (e) {
        log('failed to turn fan off for', device.device_name, e.message || e);
      }
      // unmark preset running after turning off
      try { autoControl.unmarkPresetRunning(device.device_name); } catch (_) {}
    }, durationMs);

    const job = jobMap.get(deviceId) || {};
    job.currentOffTimeout = offTimeout;
    jobMap.set(deviceId, job);
  } catch (e) {
    log('runFanCycle error for', deviceId, e.message || e);
  }
}

async function startDevicePresetJob(deviceId, { intervalMs = DEFAULT_INTERVAL_MS, durationMs = DEFAULT_DURATION_MS } = {}) {
  // If a job exists, restart with new params
  stopDevicePresetJob(deviceId);

  // Immediate first run, then every intervalMs
  await runFanCycle(deviceId, durationMs);

  const intervalId = setInterval(() => runFanCycle(deviceId, durationMs), intervalMs);
  jobMap.set(deviceId, { intervalId, currentOffTimeout: null, intervalMs, durationMs });
  log('scheduled preset job for device', deviceId, `every ${intervalMs}ms for ${durationMs}ms`);
}

function stopDevicePresetJob(deviceId) {
  const job = jobMap.get(deviceId);
  if (!job) return false;
  try {
    if (job.intervalId) clearInterval(job.intervalId);
    if (job.currentOffTimeout) clearTimeout(job.currentOffTimeout);
  } catch (_) {}
  jobMap.delete(deviceId);
  log('stopped preset job for device', deviceId);
  return true;
}

async function initScheduler() {
  try {
    // Load devices that are in Auto mode with preset applied
    const all = await Device.getAll();
    const candidates = all.filter(d => d.mode === 'Auto' && d.preset_id);
    for (const d of candidates) {
      // default: every 20 minutes run 3 minutes
        startDevicePresetJob(d.id);
    }
    log('initialized scheduler for', candidates.length, 'devices');
  } catch (e) {
    log('initScheduler error', e.message || e);
  }
}

module.exports = { startDevicePresetJob, stopDevicePresetJob, initScheduler };
