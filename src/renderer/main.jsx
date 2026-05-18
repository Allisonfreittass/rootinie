import React from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from './i18n/index.js';
import { initTheme } from './theme.js';
import EndOfDay from './windows/EndOfDay.jsx';
import Morning from './windows/Morning.jsx';
import Reminder from './windows/Reminder.jsx';
import Settings from './windows/Settings.jsx';
import Onboarding from './windows/Onboarding.jsx';

const WINDOWS = {
  endofday: EndOfDay,
  morning: Morning,
  reminder: Reminder,
  settings: Settings,
  onboarding: Onboarding
};

async function boot() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('window') || 'morning';
  const Comp = WINDOWS[name] || Morning;

  const settings = await window.devlog.settings.get();
  await initI18n(settings.language);
  await initTheme();

  const root = createRoot(document.getElementById('root'));
  root.render(<Comp />);
}

boot();
