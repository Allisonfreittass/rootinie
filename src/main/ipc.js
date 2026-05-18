import { ipcMain, nativeTheme, BrowserWindow, app, Notification, shell } from 'electron';
import {
  getSettings,
  setSettings,
  getUser,
  setUser,
  getState,
  getEntry,
  getYesterdayEntry,
  saveEndOfDay as storeSaveEod,
  recordHealthCheck as storeRecordHealth,
  getScreenTimeToday,
  completeOnboarding as storeCompleteOnboarding,
  setFocusTask,
  setFocusCompleted,
  getFocusTask,
  setFocusModeUntil,
  getFocusModeUntil,
  isFocusModeActive,
  listRecentEntries
} from './store.js';
import * as scheduler from './scheduler.js';
import * as sync from './sync.js';
import { resetActiveSince } from './screen-time.js';
import { broadcast, openWindow, iconPath } from './windows.js';

let trayTooltipUpdater = null;
export function registerTrayTooltipUpdater(fn) { trayTooltipUpdater = fn; }

function notify(title, body) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: iconPath(), silent: true }).show();
    }
  } catch {}
}

function resolveLanguage(language) {
  if (language === 'pt-BR' || language === 'en') return language;
  const loc = app.getLocale();
  return loc && loc.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function registerIpc() {
  ipcMain.handle('settings:get', () => {
    const s = getSettings();
    return { ...s, language: resolveLanguage(s.language) };
  });

  ipcMain.handle('settings:set', (_e, patch) => {
    const prev = getSettings();
    const next = setSettings(patch);
    const langChanged = patch.language && patch.language !== prev.language;
    const timeChanged =
      patch.eodTime !== undefined ||
      patch.morningTime !== undefined ||
      patch.reminderIntervalMin !== undefined;
    if (timeChanged) scheduler.reschedule();
    if (langChanged) broadcast('language:changed', next.language);
    if (patch.theme !== undefined) broadcast('theme:changed', resolveThemeMode(next.theme));
    return { ...next, language: resolveLanguage(next.language) };
  });

  ipcMain.handle('user:get', () => getUser());
  ipcMain.handle('user:set', (_e, patch) => setUser(patch));
  ipcMain.handle('user:onboard', (_e, data) => {
    storeCompleteOnboarding({
      ...data,
      language: resolveLanguage(data.language)
    });
    scheduler.reschedule();
    return { ok: true };
  });

  ipcMain.handle('state:get', () => getState());

  ipcMain.handle('entry:get', (_e, date) => getEntry(date));
  ipcMain.handle('entry:yesterday', () => getYesterdayEntry());
  ipcMain.handle('entry:saveEod', async (_e, payload) => {
    const res = storeSaveEod(payload);
    if (payload.focusCompleted !== undefined) setFocusCompleted(payload.focusCompleted);
    sync.pushPending().catch(() => {});
    return res;
  });
  ipcMain.handle('entry:health', (_e, { type, action }) => {
    if (action === 'done' || action === 'snooze') resetActiveSince();
    return storeRecordHealth(type, action);
  });

  ipcMain.handle('stats:recent', (_e, days = 7) => listRecentEntries(days, false));

  ipcMain.handle('focus:set', (_e, { task, enableMode }) => {
    const entry = setFocusTask(task);
    if (enableMode) {
      const min = getSettings().focusModeMin || 90;
      const until = new Date(Date.now() + min * 60 * 1000).toISOString();
      setFocusModeUntil(until);
      scheduler.scheduleFocusEnd(until);
    } else {
      setFocusModeUntil(null);
    }
    trayTooltipUpdater?.();
    notify('🌿 Rootinie ativo', task ? `foco de hoje: ${task}` : 'bom trabalho');
    return { entry, focusModeUntil: getFocusModeUntil() };
  });

  ipcMain.handle('focus:status', () => ({
    task: getFocusTask(),
    focusModeUntil: getFocusModeUntil(),
    active: isFocusModeActive()
  }));

  ipcMain.handle('focus:complete', (_e, completed) => {
    const entry = setFocusCompleted(completed);
    trayTooltipUpdater?.();
    return entry;
  });

  ipcMain.handle('stats:streak', () => getState().streak || 0);
  ipcMain.handle('stats:screenTime', () => getScreenTimeToday());

  ipcMain.on('window:close', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.close();
  });
  ipcMain.handle('window:open', (_e, name) => {
    openWindow(name);
  });

  ipcMain.handle('reminder:snooze', (_e, min) => {
    scheduler.snoozeReminder(min);
    return { ok: true };
  });

  ipcMain.handle('auth:signUp', (_e, payload) => sync.signUp(payload));
  ipcMain.handle('auth:signIn', (_e, payload) => sync.signIn(payload));
  ipcMain.handle('auth:signOut', () => sync.signOut());
  ipcMain.handle('auth:session', () => sync.getSession());

  ipcMain.handle('sync:now', () => sync.syncNow());
  ipcMain.handle('sync:status', () => sync.getStatus());

  ipcMain.handle('system:openExternal', (_e, url) => {
    if (typeof url !== 'string') return false;
    if (!/^https?:\/\//i.test(url)) return false;
    shell.openExternal(url).catch(() => {});
    return true;
  });

  ipcMain.handle('theme:current', () => resolveThemeMode(getSettings().theme));

  nativeTheme.on('updated', () => {
    if (getSettings().theme === 'system') {
      broadcast('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });

  sync.onStatusChange((status) => broadcast('sync:status', status));
}

export function resolveThemeMode(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}
