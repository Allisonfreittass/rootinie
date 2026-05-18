import React from 'react';
import { useTranslation } from 'react-i18next';

export function TopBar({ time, showBrand = true, showSettings = true }) {
  const { t } = useTranslation();
  return (
    <div className="popup-topbar">
      <div className="topbar-left">
        {showBrand && (
          <div className="popup-brand">
            <div className="brand-dot" />
            <div className="brand-name">
              root<span className="accent">{t('brand')}</span>
            </div>
          </div>
        )}
      </div>
      <div className="topbar-right">
        {time && <div className="popup-time">{time}</div>}
        <div className="win-controls">
          {showSettings && (
            <button
              className="win-btn settings"
              aria-label="settings"
              title={t('settings.title')}
              onClick={() => window.devlog.window.open('settings')}
            >
              ⚙
            </button>
          )}
          <button
            className="win-btn close"
            aria-label="close"
            onClick={() => window.devlog.window.close()}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export function nowHHMM() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatScreenTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h <= 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function relativeTime(iso, t) {
  if (!iso) return t('settings.sync.neverSynced');
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return t('time.justNow');
  if (diffSec < 3600) return t('time.minAgo', { count: Math.floor(diffSec / 60) });
  if (diffSec < 86400) return t('time.hAgo', { count: Math.floor(diffSec / 3600) });
  return t('time.dAgo', { count: Math.floor(diffSec / 86400) });
}

export const MOODS = [
  { id: 'flow',       emoji: '🔥' },
  { id: 'frustrated', emoji: '😤' },
  { id: 'tired',      emoji: '😴' },
  { id: 'great',      emoji: '😎' }
];

export function moodMeta(id) {
  return MOODS.find((m) => m.id === id) || null;
}

let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx) return _audioCtx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    _audioCtx = new Ctor();
    return _audioCtx;
  } catch {
    return null;
  }
}

export async function playStartChime() {
  try {
    const settings = await window.devlog.settings.get();
    if (!settings.sound) return;
  } catch {
    return;
  }
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, start: 0,    dur: 0.12 },
    { freq: 783.99, start: 0.09, dur: 0.18 }
  ];
  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.08, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  });
}
