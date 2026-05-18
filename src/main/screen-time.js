import { powerMonitor } from 'electron';
import { bumpScreenTime } from './store.js';

const TICK_SEC = 30;
const IDLE_THRESHOLD_SEC = 60;
let timer = null;
let activeSinceMs = Date.now();
let wasIdle = false;

export function startScreenTimeTracker() {
  if (timer) return;
  activeSinceMs = Date.now();
  wasIdle = false;
  timer = setInterval(() => {
    const idle = powerMonitor.getSystemIdleTime();
    const isIdle = idle >= IDLE_THRESHOLD_SEC;
    if (!isIdle) {
      if (wasIdle) activeSinceMs = Date.now();
      bumpScreenTime(TICK_SEC);
    }
    wasIdle = isIdle;
  }, TICK_SEC * 1000);
}

export function stopScreenTimeTracker() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function isUserIdle(thresholdSec = 5 * 60) {
  return powerMonitor.getSystemIdleTime() >= thresholdSec;
}

export function resetActiveSince() {
  activeSinceMs = Date.now();
}

export function getContinuousActiveSec() {
  const idle = powerMonitor.getSystemIdleTime();
  if (idle >= IDLE_THRESHOLD_SEC) return 0;
  return Math.max(0, Math.floor((Date.now() - activeSinceMs) / 1000));
}
