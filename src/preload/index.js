import { contextBridge, ipcRenderer } from 'electron';

const sub = (channel) => (cb) => {
  const listener = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

const api = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch)
  },
  user: {
    get: () => ipcRenderer.invoke('user:get'),
    set: (patch) => ipcRenderer.invoke('user:set', patch),
    onboard: (data) => ipcRenderer.invoke('user:onboard', data)
  },
  state: {
    get: () => ipcRenderer.invoke('state:get')
  },
  entry: {
    get: (date) => ipcRenderer.invoke('entry:get', date),
    yesterday: () => ipcRenderer.invoke('entry:yesterday'),
    saveEod: (payload) => ipcRenderer.invoke('entry:saveEod', payload),
    health: (type, action) => ipcRenderer.invoke('entry:health', { type, action })
  },
  focus: {
    set: (task, enableMode) => ipcRenderer.invoke('focus:set', { task, enableMode }),
    status: () => ipcRenderer.invoke('focus:status'),
    complete: (completed) => ipcRenderer.invoke('focus:complete', completed)
  },
  stats: {
    streak: () => ipcRenderer.invoke('stats:streak'),
    screenTime: () => ipcRenderer.invoke('stats:screenTime'),
    recent: (days) => ipcRenderer.invoke('stats:recent', days)
  },
  reminder: {
    snooze: (min) => ipcRenderer.invoke('reminder:snooze', min)
  },
  window: {
    close: () => ipcRenderer.send('window:close'),
    open: (name) => ipcRenderer.invoke('window:open', name)
  },
  theme: {
    current: () => ipcRenderer.invoke('theme:current'),
    onChange: sub('theme:changed')
  },
  i18n: {
    onLanguageChange: sub('language:changed')
  },
  auth: {
    signUp: (payload) => ipcRenderer.invoke('auth:signUp', payload),
    signIn: (payload) => ipcRenderer.invoke('auth:signIn', payload),
    signOut: () => ipcRenderer.invoke('auth:signOut'),
    session: () => ipcRenderer.invoke('auth:session')
  },
  sync: {
    now: () => ipcRenderer.invoke('sync:now'),
    status: () => ipcRenderer.invoke('sync:status'),
    onStatus: sub('sync:status')
  },
  system: {
    version: () => ipcRenderer.invoke('system:version'),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  }
};

contextBridge.exposeInMainWorld('devlog', api);
