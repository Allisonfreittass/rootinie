import Store from 'electron-store';

const defaults = {
  user: { name: '' },
  settings: {
    eodTime: '18:00',
    morningTime: '09:00',
    reminderIntervalMin: 90,
    theme: 'system',
    language: null,
    sound: true,
    focusModeMin: 90,
    skipWeekends: false,
    nativeNotifications: true
  },
  state: {
    streak: 0,
    lastLogDate: null,
    morningShownDate: null,
    onboarded: false,
    lastSyncAt: null,
    focusModeUntil: null,
    trayHintShownDate: null
  },
  auth: {},
  entries: {}
};

export const store = new Store({ name: 'config', defaults });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const yesterdayISO = (base = new Date()) => {
  const d = new Date(base);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export function previousWorkdayISO(base = new Date(), skipWeekends = false) {
  const d = new Date(base);
  d.setDate(d.getDate() - 1);
  if (skipWeekends) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export function getSettings() {
  return store.get('settings');
}

function clampSettings(patch) {
  const out = { ...patch };
  if (out.reminderIntervalMin !== undefined) {
    const n = Number(out.reminderIntervalMin);
    out.reminderIntervalMin = Number.isFinite(n) ? Math.max(5, Math.min(480, n)) : 90;
  }
  if (out.focusModeMin !== undefined) {
    const n = Number(out.focusModeMin);
    out.focusModeMin = Number.isFinite(n) ? Math.max(15, Math.min(240, n)) : 90;
  }
  return out;
}

export function setSettings(patch) {
  const merged = { ...store.get('settings'), ...clampSettings(patch) };
  store.set('settings', merged);
  return merged;
}

export function getUser() {
  return store.get('user');
}

export function setUser(patch) {
  const merged = { ...store.get('user'), ...patch };
  store.set('user', merged);
  return merged;
}

export function getState() {
  return store.get('state');
}

export function patchState(patch) {
  const merged = { ...store.get('state'), ...patch };
  store.set('state', merged);
  return merged;
}

export function getEntry(date) {
  const entries = store.get('entries');
  return entries[date] || null;
}

export function getYesterdayEntry() {
  return getEntry(yesterdayISO());
}

export function upsertEntry(date, patch) {
  const entries = store.get('entries');
  const prev = entries[date] || {
    date,
    mood: null,
    journal: '',
    tomorrowNote: '',
    screenTimeSec: 0,
    healthChecks: [],
    focusTask: null,
    focusCompleted: null,
    syncedAt: null
  };
  const next = { ...prev, ...patch };
  store.set('entries', { ...entries, [date]: next });
  return next;
}

export function setFocusTask(task) {
  return upsertEntry(todayISO(), { focusTask: task || null, focusCompleted: null });
}

export function setFocusCompleted(completed) {
  return upsertEntry(todayISO(), { focusCompleted: completed });
}

export function getFocusTask() {
  return getEntry(todayISO())?.focusTask || null;
}

export function setFocusModeUntil(timestamp) {
  return patchState({ focusModeUntil: timestamp });
}

export function isFocusModeActive() {
  const until = getState().focusModeUntil;
  return until && new Date(until).getTime() > Date.now();
}

export function getFocusModeUntil() {
  return getState().focusModeUntil;
}

export function listEntries() {
  return Object.values(store.get('entries'));
}

export function listRecentEntries(days = 7, includeToday = false) {
  const entries = store.get('entries');
  const out = [];
  const base = new Date();
  const start = includeToday ? 0 : 1;
  for (let i = start; i < start + days; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const entry = entries[iso] || null;
    out.push({
      date: iso,
      mood: entry?.mood || null,
      hasJournal: !!(entry?.journal && entry.journal.trim())
    });
  }
  return out.reverse();
}

export function lastHealthAt(type = null) {
  const entry = getEntry(todayISO());
  if (!entry?.healthChecks?.length) return null;
  const filtered = type
    ? entry.healthChecks.filter((h) => h.type === type)
    : entry.healthChecks;
  if (!filtered.length) return null;
  return filtered[filtered.length - 1].at;
}

export function listPendingEntries() {
  return listEntries().filter((e) => !e.syncedAt);
}

export function recordHealthCheck(type, action) {
  const date = todayISO();
  const entry = getEntry(date) || {
    date,
    mood: null,
    journal: '',
    tomorrowNote: '',
    screenTimeSec: 0,
    healthChecks: [],
    syncedAt: null
  };
  const healthChecks = [...(entry.healthChecks || []), { type, action, at: new Date().toISOString() }];
  return upsertEntry(date, { healthChecks });
}

export function saveEndOfDay({ mood, journal, tomorrowNote }) {
  const date = todayISO();
  const state = getState();
  const skipWeekends = getSettings().skipWeekends;
  const expectedPrev = previousWorkdayISO(new Date(), skipWeekends);

  const hasMeaningfulData =
    Boolean(mood) ||
    Boolean(journal && journal.trim()) ||
    Boolean(tomorrowNote && tomorrowNote.trim());

  const entry = upsertEntry(date, {
    mood,
    journal,
    tomorrowNote,
    syncedAt: null
  });

  if (!hasMeaningfulData) {
    return { entry, streak: state.streak || 0, counted: false };
  }

  let streak;
  if (state.lastLogDate === expectedPrev) streak = (state.streak || 0) + 1;
  else if (state.lastLogDate === date) streak = state.streak || 1;
  else streak = 1;

  patchState({ streak, lastLogDate: date });
  return { entry, streak, counted: true };
}

export function bumpScreenTime(seconds) {
  const date = todayISO();
  const entry = getEntry(date);
  const current = entry?.screenTimeSec || 0;
  return upsertEntry(date, { screenTimeSec: current + seconds });
}

export function getScreenTimeToday() {
  return getEntry(todayISO())?.screenTimeSec || 0;
}

export function completeOnboarding({ name, eodTime, morningTime, reminderIntervalMin, language }) {
  setUser({ name });
  setSettings({ eodTime, morningTime, reminderIntervalMin, language });
  patchState({ onboarded: true });
}
