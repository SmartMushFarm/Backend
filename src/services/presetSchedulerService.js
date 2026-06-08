const Device = require('../models/deviceModel');
const deviceService = require('./deviceService');

// In-memory job map: deviceId -> { intervalId, currentOffTimeout }
const jobMap = new Map();

const ONE_HOUR_MS = 60 * 60 * 1000;

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
    }, durationMs);

    const job = jobMap.get(deviceId) || {};
    job.currentOffTimeout = offTimeout;
    jobMap.set(deviceId, job);
  } catch (e) {
    log('runFanCycle error for', deviceId, e.message || e);
  }
}

async function startDevicePresetJob(deviceId, { intervalMs = ONE_HOUR_MS, durationMs = 10 * 60 * 1000 } = {}) {
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
      // default: every 1 hour run 10 minutes
      startDevicePresetJob(d.id);
    }
    log('initialized scheduler for', candidates.length, 'devices');
  } catch (e) {
    log('initScheduler error', e.message || e);
  }
}

module.exports = { startDevicePresetJob, stopDevicePresetJob, initScheduler };
