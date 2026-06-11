const Device = require('../models/deviceModel');
const deviceService = require('./deviceService');
const autoControl = require('./autoControlService');

// In-memory job map: deviceId -> { intervalId, currentOffTimeout }
const jobMap = new Map();

// Default: run every 30 minutes for 3 minutes
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
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

    if (String(device.mode || '').toLowerCase() !== 'auto' || !device.preset_id) {
      log('device not in Auto or no preset, skipping', deviceId);
      return;
    }

    try {
      autoControl.setPresetFanOverride(device.device_name, true);
    } catch (_) {}

    try {
      await deviceService.controlViaMqtt(device.id, { device: 'fan', action: 'on' });
      log('fan ON for', device.device_name);
    } catch (e) {
      log('failed to turn fan on for', device.device_name, e.message || e);
    }

    const offTimeout = setTimeout(async () => {
      try {
        // Set override to OFF BEFORE clearing, so auto-control never sees a gap
        try { autoControl.setPresetFanOverride(device.device_name, false); } catch (_) {}

        const refreshedDevice = await Device.findById(deviceId);
        if (refreshedDevice) {
          await deviceService.controlViaMqtt(refreshedDevice.id, { device: 'fan', action: 'off' });
          log('fan OFF for', refreshedDevice.device_name);
        } else {
          log('device gone at OFF time for', device.device_name);
        }

        // Clear override after OFF is confirmed sent
        try { autoControl.clearPresetFanOverride(device.device_name); } catch (_) {}
      } catch (e) {
        log('failed to turn fan off for', device.device_name, e.message || e);
      }
    }, durationMs);

    const job = jobMap.get(deviceId) || {};
    job.currentOffTimeout = offTimeout;
    job._deviceName = device.device_name;
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
  jobMap.set(deviceId, { intervalId, currentOffTimeout: null, intervalMs, durationMs, _deviceName: null });
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
  // Also clear any active preset fan override for this device
  if (job._deviceName) {
    try { autoControl.clearPresetFanOverride(job._deviceName); } catch (_) {}
  }
  log('stopped preset job for device', deviceId);
  return true;
}

async function initScheduler() {
  try {
    // Load devices that are in Auto mode with preset applied
    const all = await Device.getAll();
    const candidates = all.filter(d => String(d.mode || '').toLowerCase() === 'auto' && d.preset_id);
    for (const d of candidates) {
        startDevicePresetJob(d.id);
        // Store device name so stopDevicePresetJob can clear override on restart
        const existing = jobMap.get(d.id);
        if (existing) existing._deviceName = d.device_name;
    }
    log('initialized scheduler for', candidates.length, 'devices');
  } catch (e) {
    log('initScheduler error', e.message || e);
  }
}

module.exports = { startDevicePresetJob, stopDevicePresetJob, initScheduler };
