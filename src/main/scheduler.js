import { Notification } from 'electron';
import {
  getSettings,
  getState,
  patchState,
  todayISO,
  isFocusModeActive,
  setFocusModeUntil
} from './store.js';
import { openWindow, iconPath } from './windows.js';
import { isUserIdle, getContinuousActiveSec } from './screen-time.js';

let eodTimer = null;
let morningTimer = null;
let reminderTimer = null;
let focusEndTimer = null;
let reminderRotation = 0;

const REMINDER_TYPES = ['water', 'eyes', 'breathe'];

const NOTIF_COPY = {
  'pt-BR': {
    water:   { title: '💧 hora da água',   body: 'levanta, bebe, volta — sem pressa' },
    eyes:    { title: '👀 descansa os olhos', body: 'olha pra longe por 20s — janela, parede, qualquer coisa' },
    breathe: { title: '🧘 respiro de 2min',  body: 'inspira fundo. solta. agora outra vez.' }
  },
  en: {
    water:   { title: '💧 water time',    body: 'stand up, drink, come back — no rush' },
    eyes:    { title: '👀 rest your eyes', body: 'look far for 20s — window, wall, anything' },
    breathe: { title: '🧘 2min breath',    body: 'deep in. slow out. once more.' }
  }
};

function parseHHMM(str) {
  const [h, m] = (str || '00:00').split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

function nextOccurrence(hhmm) {
  const { h, m } = parseHHMM(hhmm);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function isWeekend(d = new Date()) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function skipForWeekend() {
  return getSettings().skipWeekends && isWeekend();
}

function nextReminderType() {
  const t = REMINDER_TYPES[reminderRotation % REMINDER_TYPES.length];
  reminderRotation++;
  return t;
}

function copyFor(type) {
  const lang = getSettings().language === 'en' ? 'en' : 'pt-BR';
  return NOTIF_COPY[lang][type];
}

function fireNativeNotification(type) {
  if (!getSettings().nativeNotifications) return;
  if (!Notification.isSupported()) return;
  try {
    const c = copyFor(type);
    const n = new Notification({
      title: c.title,
      body: c.body,
      icon: iconPath(),
      silent: !getSettings().sound
    });
    n.on('click', () => openWindow('reminder', { type, idleSec: getContinuousActiveSec() }));
    n.show();
  } catch {}
}

function fireReminder() {
  if (isUserIdle()) return;
  if (isFocusModeActive()) return;
  if (skipForWeekend()) return;
  const type = nextReminderType();
  const idleSec = getContinuousActiveSec();
  openWindow('reminder', { type, idleSec });
  fireNativeNotification(type);
}

function scheduleEod() {
  if (eodTimer) clearTimeout(eodTimer);
  const settings = getSettings();
  const delay = nextOccurrence(settings.eodTime);
  eodTimer = setTimeout(() => {
    if (!skipForWeekend()) openWindow('endofday');
    scheduleEod();
  }, delay);
}

function scheduleMorning() {
  if (morningTimer) clearTimeout(morningTimer);
  const settings = getSettings();
  const delay = nextOccurrence(settings.morningTime);
  morningTimer = setTimeout(() => {
    const today = todayISO();
    if (!skipForWeekend() && getState().morningShownDate !== today) {
      openWindow('morning');
      patchState({ morningShownDate: today });
    }
    scheduleMorning();
  }, delay);
}

function scheduleReminder() {
  if (reminderTimer) clearInterval(reminderTimer);
  const settings = getSettings();
  const intervalMs = Math.max(1, settings.reminderIntervalMin) * 60 * 1000;
  reminderTimer = setInterval(fireReminder, intervalMs);
}

export function scheduleFocusEnd(untilIso) {
  if (focusEndTimer) clearTimeout(focusEndTimer);
  const delay = new Date(untilIso).getTime() - Date.now();
  if (delay <= 0) {
    setFocusModeUntil(null);
    return;
  }
  focusEndTimer = setTimeout(() => {
    setFocusModeUntil(null);
    try {
      if (Notification.isSupported()) {
        new Notification({
          title: '🌿 foco terminado',
          body: 'hora de respirar — beba uma água, alongue',
          icon: iconPath(),
          silent: false
        }).show();
      }
    } catch {}
  }, delay);
}

export function maybeShowMorningOnLaunch() {
  const settings = getSettings();
  const state = getState();
  const today = todayISO();
  if (state.morningShownDate === today) return false;
  if (skipForWeekend()) return false;

  const { h, m } = parseHHMM(settings.morningTime);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  if (now >= target) {
    openWindow('morning');
    patchState({ morningShownDate: today });
    return true;
  }
  return false;
}

export function init() {
  scheduleEod();
  scheduleMorning();
  scheduleReminder();
}

export function reschedule() {
  init();
}

export function snoozeReminder(min) {
  if (reminderTimer) clearInterval(reminderTimer);
  const delayMs = min * 60 * 1000;
  setTimeout(() => {
    fireReminder();
    scheduleReminder();
  }, delayMs);
}

export function stop() {
  if (eodTimer) clearTimeout(eodTimer);
  if (morningTimer) clearTimeout(morningTimer);
  if (reminderTimer) clearInterval(reminderTimer);
  if (focusEndTimer) clearTimeout(focusEndTimer);
  eodTimer = morningTimer = reminderTimer = focusEndTimer = null;
}
