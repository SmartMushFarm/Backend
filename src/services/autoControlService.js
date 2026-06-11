const mqttService = require('./mqttService');
const { pool } = require('../config/db');

// Constants
const DEVICE_COMMAND_COOLDOWN_MS = 10000; // 10s
const SENSOR_STABLE_AFTER_MIST_MS = 20000; // 20s

// Memory
const lastCommandMap = new Map(); // key: `${deviceName}:${target}` -> timestamp
const mistPulseMap = new Map(); // key: deviceName -> { state: 'idle'|'pulsing'|'resting', restUntil, lastPulseAt }
// mark devices that are currently under preset-scheduler run (skip normal auto rules)
const presetRunningSet = new Set();
// maps deviceName -> { desiredFan: boolean|null, cycleEndsAt: number|null }
// null means no preset cycle active; true=preset wants fan ON, false=preset wants fan OFF
const presetDesiredFanState = new Map();

const log = (...args) => console.log(...args);

const canSendCommand = (deviceName, target) => {
    const key = `${deviceName}:${target}`;
    const last = lastCommandMap.get(key) || 0;
    return Date.now() - last >= DEVICE_COMMAND_COOLDOWN_MS;
};

const recordCommand = (deviceName, target) => {
    const key = `${deviceName}:${target}`;
    lastCommandMap.set(key, Date.now());
};

const isMistStable = (deviceName) => {
    const entry = mistPulseMap.get(deviceName);
    if (!entry) return true;
    const now = Date.now();
    if (entry.state === 'pulsing') return false;
    if (entry.state === 'resting' && entry.restUntil && now < entry.restUntil) return false;
    if (entry.lastPulseAt && now - entry.lastPulseAt < SENSOR_STABLE_AFTER_MIST_MS) return false;
    return true;
};

const sendCommandIfNeeded = async (device, target, action, currentStatus, reason) => {
    // device: device object, target: 'fan'|'heater'|'mist', action: 'on'|'off'
    const deviceName = device.device_name;
    const desired = action === 'on';
    if (currentStatus === desired) return false;
    if (!canSendCommand(deviceName, target)) return false;

    try {
        await mqttService.publishCommand({ deviceName, device: target, action });
        recordCommand(deviceName, target);
        log(`[AUTO] ${deviceName} ${target} ${action} - ${reason}`);
        return true;
    } catch (e) {
        console.error('[AUTO] publish failed', e);
        return false;
    }
};

const handleMistPulse = async (device, preset) => {
    const deviceName = device.device_name;
    const onSec = Number(preset.mist_pulse_on_seconds) || 0;
    const offSec = Number(preset.mist_pulse_off_seconds) || 0;
    if (onSec <= 0) return false;

    const entry = mistPulseMap.get(deviceName) || { state: 'idle' };
    const now = Date.now();
    if (entry.state === 'pulsing') return false; // already pulsing
    if (entry.state === 'resting' && entry.restUntil && now < entry.restUntil) return false; // in resting

    // Start pulse: ensure heater OFF first
    await sendCommandIfNeeded(device, 'heater', 'off', !!device.heater_status, 'safety: turn heater off before mist pulse');

    // Turn mist on
    const turnedOn = await sendCommandIfNeeded(device, 'mist', 'on', !!device.mist_status, `humidity below mist_on_humidity`);
    if (!turnedOn) {
        // may already on or cooldown
        // still mark lastPulseAt to avoid immediate heater start
        const now2 = Date.now();
        mistPulseMap.set(deviceName, { state: 'resting', restUntil: now2 + offSec * 1000, lastPulseAt: now2 });
        return false;
    }

    // mark pulsing
    mistPulseMap.set(deviceName, { state: 'pulsing', lastPulseAt: Date.now() });

    // schedule turning mist off after onSec
    setTimeout(async () => {
        try {
            await sendCommandIfNeeded(device, 'mist', 'off', true, 'mist pulse ended');
        } catch (_) {}
        const pulseEndAt = Date.now();
        // enter resting
        mistPulseMap.set(deviceName, { state: 'resting', restUntil: pulseEndAt + offSec * 1000, lastPulseAt: pulseEndAt });
    }, onSec * 1000);

    return true;
};

async function handleAutoControl({ device, preset, temperature, humidity }) {
    try {
        if (!device) return;
        if (device.mode !== 'Auto') return;
        if (!device.preset_id || !preset) return;

        const deviceName = device.device_name;
        // If this device is currently running a preset job, skip normal auto rules
        // but still enforce danger rules.
        const isPresetRunning = presetRunningSet.has(deviceName);

        const curMist = !!device.mist_status;
        const curFan = !!device.fan_status;
        const curHeater = !!device.heater_status;

        // Danger rules
        if (typeof preset.danger_humidity === 'number' && humidity >= Number(preset.danger_humidity)) {
            await sendCommandIfNeeded(device, 'mist', 'off', curMist, 'danger humidity');
            await sendCommandIfNeeded(device, 'heater', 'off', curHeater, 'danger humidity');
            await sendCommandIfNeeded(device, 'fan', 'on', curFan, 'danger humidity');
            return;
        }
        if (typeof preset.max_temp_danger === 'number' && temperature >= Number(preset.max_temp_danger)) {
            await sendCommandIfNeeded(device, 'heater', 'off', curHeater, 'max temp danger');
            await sendCommandIfNeeded(device, 'mist', 'off', curMist, 'max temp danger');
            await sendCommandIfNeeded(device, 'fan', 'on', curFan, 'max temp danger');
            return;
        }

        if (isPresetRunning) {
            // skip remaining normal auto control while preset is running
            return;
        }

        // Fan rule: check if preset cycle is overriding fan state first
        const presetFanOverride = presetDesiredFanState.get(deviceName);
        if (presetFanOverride === true) {
            // preset cycle wants fan ON — don't let auto rules turn it off
            await sendCommandIfNeeded(device, 'fan', 'on', curFan, 'preset cycle: fan ON');
        } else if (presetFanOverride === false) {
            // preset cycle wants fan OFF — don't let auto rules turn it on
            await sendCommandIfNeeded(device, 'fan', 'off', curFan, 'preset cycle: fan OFF');
        } else {
            // no preset override active — apply normal fan rule
            if (typeof preset.fan_on_humidity === 'number' && humidity > Number(preset.fan_on_humidity)) {
                await sendCommandIfNeeded(device, 'fan', 'on', curFan, 'humidity above fan_on_humidity');
            } else if (typeof preset.fan_off_humidity === 'number' && humidity <= Number(preset.fan_off_humidity)) {
                await sendCommandIfNeeded(device, 'fan', 'off', curFan, 'humidity below/equal fan_off_humidity');
            }
        }

        // Mist and Heater interaction
        // If humidity < mist_on_humidity => heater OFF then mist pulse
        if (typeof preset.mist_on_humidity === 'number' && humidity < Number(preset.mist_on_humidity)) {
            // ensure heater off
            await sendCommandIfNeeded(device, 'heater', 'off', curHeater, 'humidity below mist_on_humidity');
            // attempt mist pulse if stable
            if (isMistStable(deviceName)) {
                await handleMistPulse(device, preset);
            }
            return; // when below mist_on_humidity, don't check heater on
        }

        // If humidity >= mist_off_humidity => turn mist off
        if (typeof preset.mist_off_humidity === 'number' && humidity >= Number(preset.mist_off_humidity)) {
            await sendCommandIfNeeded(device, 'mist', 'off', curMist, 'humidity above/equal mist_off_humidity');
        }

        // Heater rule
        // Only consider heater if mist is off and mist stable
        const mistIsStable = isMistStable(deviceName);
        if (curMist) {
            // ensure heater off if mist on
            await sendCommandIfNeeded(device, 'heater', 'off', curHeater, 'safety: mist running');
        } else {
            if (mistIsStable) {
                if (typeof preset.heater_on_temp === 'number' && temperature < Number(preset.heater_on_temp) && (typeof preset.mist_on_humidity !== 'number' || humidity >= Number(preset.mist_on_humidity))) {
                    await sendCommandIfNeeded(device, 'heater', 'on', curHeater, 'temperature below heater_on_temp and humidity allows heater');
                }
                if (typeof preset.heater_off_temp === 'number' && temperature >= Number(preset.heater_off_temp)) {
                    await sendCommandIfNeeded(device, 'heater', 'off', curHeater, 'temperature above/equal heater_off_temp');
                }
            }
        }

    } catch (e) {
        console.error('[AUTO] handleAutoControl error', e);
    }
}

function markPresetRunning(deviceName) {
    if (!deviceName) return;
    presetRunningSet.add(deviceName);
}

function unmarkPresetRunning(deviceName) {
    if (!deviceName) return;
    presetRunningSet.delete(deviceName);
}

// Called by presetScheduler to tell autoControl what fan state the preset cycle wants.
// desiredFan: true=preset wants fan ON, false=preset wants fan OFF, null=clear override
function setPresetFanOverride(deviceName, desiredFan) {
    if (!deviceName) return;
    if (desiredFan === null || desiredFan === undefined) {
        presetDesiredFanState.delete(deviceName);
    } else {
        presetDesiredFanState.set(deviceName, desiredFan);
    }
}

function clearPresetFanOverride(deviceName) {
    if (!deviceName) return;
    presetDesiredFanState.delete(deviceName);
}

module.exports = {
    handleAutoControl,
    markPresetRunning,
    unmarkPresetRunning,
    setPresetFanOverride,
    clearPresetFanOverride,
};