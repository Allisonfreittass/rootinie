import { app, Tray, Menu, nativeImage, Notification } from 'electron';
import { getState, getSettings, patchState, todayISO } from './store.js';
import { openWindow, iconPath } from './windows.js';
import { registerIpc, registerTrayTooltipUpdater } from './ipc.js';
import * as scheduler from './scheduler.js';
import { startScreenTimeTracker, stopScreenTimeTracker } from './screen-time.js';
import { startBackgroundSync, stopBackgroundSync } from './sync.js';
import { getFocusTask, isFocusModeActive, getFocusModeUntil } from './store.js';

const APP_ID = 'dev.rootinie';

let tray = null;
let isQuitting = false;

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

function trayTooltip() {
  const task = getFocusTask();
  const lines = ['Rootinie'];
  if (task) lines.push(`hoje: ${task}`);
  if (isFocusModeActive()) {
    const until = new Date(getFocusModeUntil());
    const hhmm = until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lines.push(`🎯 foco até ${hhmm}`);
  }
  return lines.join('\n');
}

function updateTrayTooltip() {
  if (tray && !tray.isDestroyed()) tray.setToolTip(trayTooltip());
}

function buildTray() {
  let image;
  try {
    image = nativeImage.createFromPath(iconPath());
    if (image.isEmpty()) image = nativeImage.createEmpty();
  } catch {
    image = nativeImage.createEmpty();
  }

  tray = new Tray(image);
  tray.setToolTip(trayTooltip());
  const menu = Menu.buildFromTemplate([
    { label: 'Abrir / Open', click: () => openWindow('morning') },
    { label: 'Fim do dia / End of day', click: () => openWindow('endofday') },
    { label: 'Configurações / Settings', click: () => openWindow('settings') },
    { type: 'separator' },
    {
      label: 'Sair / Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => openWindow('morning'));
}

function notifyAlive() {
  if (!getSettings().nativeNotifications) return;
  if (!Notification.isSupported()) return;
  try {
    const lang = getSettings().language === 'en' ? 'en' : 'pt-BR';
    const copy = lang === 'en'
      ? { title: '🌿 rootinie is running', body: 'living quietly in the tray — click the leaf to open' }
      : { title: '🌿 rootinie tá rodando', body: 'mora discreto na bandeja — clica na folha pra abrir' };
    new Notification({ ...copy, icon: iconPath(), silent: true }).show();
  } catch {}
}

app.whenReady().then(() => {
  registerIpc();
  buildTray();
  registerTrayTooltipUpdater(updateTrayTooltip);

  const state = getState();
  const isDev = !app.isPackaged;

  if (!state.onboarded) {
    openWindow('onboarding');
  } else {
    scheduler.init();
    if (isDev) {
      openWindow('morning');
    } else {
      const shownLaunch = state.trayHintShownDate === todayISO();
      const opened = scheduler.maybeShowMorningOnLaunch();
      if (!opened && !shownLaunch) {
        notifyAlive();
        patchState({ trayHintShownDate: todayISO() });
      }
    }
  }

  startScreenTimeTracker();
  startBackgroundSync();

  if (isFocusModeActive()) scheduler.scheduleFocusEnd(getFocusModeUntil());
});

app.on('window-all-closed', (e) => {
  if (!isQuitting) e.preventDefault?.();
});

app.on('before-quit', () => {
  isQuitting = true;
  scheduler.stop();
  stopScreenTimeTracker();
  stopBackgroundSync();
});

app.on('second-instance', () => {
  openWindow('morning');
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
