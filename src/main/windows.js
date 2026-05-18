import { BrowserWindow, screen, nativeTheme, app } from 'electron';
import { join } from 'node:path';

const PRELOAD = join(__dirname, '../preload/index.js');

export function iconPath() {
  if (!app.isPackaged) return join(__dirname, '../../build/icon.png');
  return join(process.resourcesPath, 'icon.png');
}

const SIZES = {
  morning:    { width: 400, height: 540 },
  endofday:   { width: 400, height: 600 },
  reminder:   { width: 340, height: 160 },
  settings:   { width: 500, height: 660 },
  onboarding: { width: 480, height: 540 }
};

const TRANSIENT = new Set(['morning', 'endofday', 'reminder']);

const openWindows = new Map();

export function getOpenWindows() {
  return [...openWindows.values()];
}

function rendererUrl(name, params) {
  const qs = new URLSearchParams({ window: name, ...(params || {}) }).toString();
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/?${qs}`;
  }
  return `file://${join(__dirname, '../renderer/index.html')}?${qs}`;
}

function positionTopRight(width, _height) {
  const display = screen.getPrimaryDisplay().workArea;
  return {
    x: display.x + display.width - width - 24,
    y: display.y + 24
  };
}

function positionCentered(width, height) {
  const display = screen.getPrimaryDisplay().workArea;
  return {
    x: Math.round(display.x + (display.width - width) / 2),
    y: Math.round(display.y + (display.height - height) / 2)
  };
}

function themedBackground() {
  return nativeTheme.shouldUseDarkColors ? '#1c1f26' : '#ffffff';
}

export function openWindow(name, params) {
  const isReminder = name === 'reminder';
  if (openWindows.has(name)) {
    const w = openWindows.get(name);
    if (!w.isDestroyed()) {
      if (isReminder && params && Object.keys(params).length > 0) {
        w.destroy();
        openWindows.delete(name);
      } else {
        w.show();
        w.focus();
        return w;
      }
    }
  }

  const { width, height } = SIZES[name];
  const pos = isReminder ? positionTopRight(width, height) : positionCentered(width, height);

  const win = new BrowserWindow({
    width,
    height,
    x: pos.x,
    y: pos.y,
    frame: false,
    resizable: false,
    minimizable: !isReminder,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: isReminder,
    alwaysOnTop: isReminder,
    show: false,
    title: 'Rootinie',
    icon: iconPath(),
    backgroundColor: themedBackground(),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    if (openWindows.get(name) === win) openWindows.delete(name);
  });

  win.loadURL(rendererUrl(name, params));
  openWindows.set(name, win);
  return win;
}

export function closeWindow(name) {
  const w = openWindows.get(name);
  if (w && !w.isDestroyed()) w.close();
}

export function broadcast(channel, payload) {
  for (const w of openWindows.values()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

export { TRANSIENT };
