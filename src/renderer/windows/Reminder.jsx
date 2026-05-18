import React, { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { playReminderChime, useEscapeToClose } from './shared.jsx';

const ICONS = { water: '💧', eyes: '👀', breathe: '🧘' };
const ALLOWED = ['water', 'eyes', 'breathe'];

function readParams() {
  const qs = new URLSearchParams(window.location.search);
  const raw = qs.get('type');
  const type = ALLOWED.includes(raw) ? raw : 'water';
  const idleSec = Math.max(0, Number(qs.get('idleSec')) || 0);
  return { type, idleSec };
}

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h <= 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, '0')}min`;
}

export default function Reminder() {
  useEscapeToClose();
  const { t } = useTranslation();
  const { type, idleSec } = readParams();
  const fresh = idleSec < 60;

  useEffect(() => {
    const id = setTimeout(() => { playReminderChime(); }, 120);
    return () => clearTimeout(id);
  }, []);

  const act = (action) => {
    window.devlog.entry.health(type, action);
    if (action === 'snooze') window.devlog.reminder.snooze(15);
    window.devlog.window.close();
  };

  return (
    <div className="reminder">
      <div className="reminder-body">
        <div className="reminder-icon">{ICONS[type]}</div>
        <div className="reminder-content">
          <div className="reminder-title">{t(`reminder.${type}.title`)}</div>
          <div className="reminder-sub">
            {fresh ? (
              t(`reminder.${type}.subFresh`)
            ) : (
              <Trans
                i18nKey={`reminder.${type}.sub`}
                values={{ duration: formatDuration(idleSec) }}
                components={[<em />]}
              />
            )}
          </div>
        </div>
      </div>
      <div className="reminder-actions">
        <button className="r-btn" onClick={() => act('snooze')}>{t('reminder.snooze15')}</button>
        <button className="r-btn" onClick={() => act('ignore')}>{t('reminder.ignore')}</button>
        <button className="r-btn ok" onClick={() => act('done')}>{t('reminder.done')}</button>
      </div>
    </div>
  );
}
