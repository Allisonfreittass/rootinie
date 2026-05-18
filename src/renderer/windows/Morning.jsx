import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar, nowHHMM, moodMeta, playStartChime } from './shared.jsx';

const HEALTH = [
  { id: 'water',   icon: '💧' },
  { id: 'breathe', icon: '🧘' },
  { id: 'eyes',    icon: '👀' }
];

function formatLongDate(locale) {
  const opts = { weekday: 'short', day: '2-digit', month: 'short' };
  const formatted = new Date().toLocaleDateString(locale, opts).replace('.', '');
  return `${formatted} · ${nowHHMM()}`;
}

function shortWeekday(iso, locale) {
  const d = new Date(`${iso}T12:00:00`);
  const w = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
  return w.slice(0, 3).toLowerCase();
}

function MoodStrip({ entries, t, locale }) {
  if (!entries?.length) return null;
  return (
    <div className="mood-strip">
      <div className="mood-strip-label">{t('morning.lastDays')}</div>
      <div className="mood-strip-row">
        {entries.map((e) => {
          const m = e.mood ? moodMeta(e.mood) : null;
          const title = `${e.date} · ${m ? t(`mood.${e.mood}`) : t('morning.noDay')}`;
          return (
            <div
              key={e.date}
              className={`mood-pip ${m ? 'has-mood' : 'empty'}`}
              title={title}
            >
              <span className="mood-pip-emoji">{m ? m.emoji : '·'}</span>
              <span className="mood-pip-day">{shortWeekday(e.date, locale)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MorningView({ user, streak, yEntry, recent, t, i18n, onNext }) {
  const yMood = yEntry?.mood ? moodMeta(yEntry.mood) : null;
  const greeting = user.name
    ? t('morning.greeting', { name: user.name })
    : t('morning.greetingNoName');

  return (
    <>
      <div className="morning-header">
        <div className="morning-left">
          <div className="morning-title">{greeting}</div>
          <div className="morning-sub">{formatLongDate(i18n.language)}</div>
        </div>
        <div className="streak-badge">
          <span>🔥</span>
          <span className="streak-text">{t('morning.streakDays', { count: streak })}</span>
        </div>
      </div>

      <div className="popup-body" style={{ paddingTop: 14 }}>
        <MoodStrip entries={recent} t={t} locale={i18n.language} />

        <div className="yday-note">
          <div className="yday-header">
            <span className="yday-label">{t('morning.ydayLabel')}</span>
            <span className="yday-date">{yEntry?.date || ''}</span>
          </div>
          <div className="yday-text">
            {yEntry?.tomorrowNote || t('morning.noYday')}
          </div>
        </div>

        <div className="mood-yday">
          <span className="mood-yday-label">{t('morning.ydayMoodLabel')}</span>
          <div className="mood-yday-val">
            <span>{yMood?.emoji || '·'}</span>
            <span>{yEntry?.mood ? t(`mood.${yEntry.mood}`) : t('morning.noYdayMood')}</span>
          </div>
        </div>

        <div className="health-row">
          {HEALTH.map((h) => (
            <div className="health-chip" key={h.id}>
              <span className="health-icon">{h.icon}</span>
              <span className="health-text">{t(`morning.health.${h.id}`)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="popup-actions">
        <button
          className="btn-ghost"
          onClick={() => {
            window.devlog.reminder.snooze(15);
            window.devlog.window.close();
          }}
        >
          {t('morning.snooze')}
        </button>
        <button className="btn-main" onClick={onNext}>
          {t('morning.go')}
        </button>
      </div>
    </>
  );
}

function FocusView({ t, onDone }) {
  const [task, setTask] = useState('');
  const [enableMode, setEnableMode] = useState(false);
  const [settings, setSettings] = useState({ focusModeMin: 90 });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    window.devlog.settings.get().then(setSettings);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  async function start() {
    setBusy(true);
    await playStartChime();
    await window.devlog.focus.set(task.trim() || null, enableMode);
    onDone();
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && task.trim() && !busy) start();
  }

  return (
    <div className="focus-view">
      <div className="focus-emoji">🎯</div>
      <div className="focus-title">{t('focus.question')}</div>
      <input
        ref={inputRef}
        className="focus-input"
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('focus.placeholder')}
        maxLength={120}
      />
      <label className="focus-toggle">
        <input
          type="checkbox"
          checked={enableMode}
          onChange={(e) => setEnableMode(e.target.checked)}
        />
        <span>{t('focus.modeToggle', { min: settings.focusModeMin || 90 })}</span>
      </label>
      <div className="focus-actions">
        <button className="btn-ghost" onClick={onDone} disabled={busy}>
          {t('focus.skip')}
        </button>
        <button className="btn-main" onClick={start} disabled={busy}>
          {t('focus.start')}
        </button>
      </div>
    </div>
  );
}

export default function Morning() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState({ name: '' });
  const [streak, setStreak] = useState(0);
  const [yEntry, setYEntry] = useState(null);
  const [recent, setRecent] = useState([]);
  const [time, setTime] = useState(nowHHMM());
  const [view, setView] = useState('morning');

  useEffect(() => {
    window.devlog.user.get().then(setUser);
    window.devlog.stats.streak().then(setStreak);
    window.devlog.entry.yesterday().then(setYEntry);
    window.devlog.stats.recent(7).then(setRecent);
    const tick = setInterval(() => setTime(nowHHMM()), 30000);
    return () => clearInterval(tick);
  }, []);

  function close() {
    window.devlog.window.close();
  }

  return (
    <div className="popup">
      <TopBar time={time} showBrand={false} />
      <div className={`view-wrap view-${view}`}>
        {view === 'morning' ? (
          <MorningView
            user={user} streak={streak} yEntry={yEntry} recent={recent}
            t={t} i18n={i18n}
            onNext={() => setView('focus')}
          />
        ) : (
          <FocusView t={t} onDone={close} />
        )}
      </div>
    </div>
  );
}
