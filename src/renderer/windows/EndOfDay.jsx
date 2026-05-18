import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { TopBar, nowHHMM, formatScreenTime, MOODS, useEscapeToClose } from './shared.jsx';

export default function EndOfDay() {
  useEscapeToClose();
  const { t } = useTranslation();
  const [mood, setMood] = useState(null);
  const [journal, setJournal] = useState('');
  const [tomorrowNote, setTomorrowNote] = useState('');
  const [screenTime, setScreenTime] = useState(0);
  const [time, setTime] = useState(nowHHMM());
  const [saving, setSaving] = useState(false);
  const [focus, setFocus] = useState(null);
  const [focusCompleted, setFocusCompleted] = useState(null);
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    window.devlog.stats.screenTime().then(setScreenTime);
    window.devlog.focus.status().then((s) => {
      setFocus(s.task);
    });
    const tick = setInterval(() => setTime(nowHHMM()), 30000);
    return () => clearInterval(tick);
  }, []);

  async function save() {
    setSaving(true);
    await window.devlog.entry.saveEod({
      mood,
      journal,
      tomorrowNote,
      focusCompleted
    });
    window.devlog.window.close();
  }

  return (
    <div className="popup">
      <TopBar time={time} />

      <div className="popup-body">
        <div className="app-msg">
          <div className="app-avatar">🤖</div>
          <div className="msg-bubble">
            <div className="msg-text">
              {screenTime < 300 ? (
                t('endofday.greetingShort')
              ) : (
                <Trans
                  i18nKey="endofday.greeting"
                  values={{ time: formatScreenTime(screenTime) }}
                  components={[<span className="chip" />]}
                />
              )}
            </div>
          </div>
        </div>

        {focus && (
          <div className="focus-check">
            <div className="focus-check-label">{t('focus.todayLabel')}</div>
            <div className="focus-check-task">🎯 {focus}</div>
            <div className="focus-check-q">{t('focus.completedQ')}</div>
            <div className="focus-check-row">
              <button
                type="button"
                className={`focus-pill yes${focusCompleted === true ? ' sel' : ''}`}
                onClick={() => setFocusCompleted(focusCompleted === true ? null : true)}
              >
                {t('focus.yes')}
              </button>
              <button
                type="button"
                className={`focus-pill no${focusCompleted === false ? ' sel' : ''}`}
                onClick={() => setFocusCompleted(focusCompleted === false ? null : false)}
              >
                {t('focus.no')}
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="mood-label">{t('endofday.moodLabel')}</div>
          <div className="mood-row">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`mood-btn${mood === m.id ? ' sel' : ''}`}
                onClick={() => setMood(m.id)}
                aria-pressed={mood === m.id}
                aria-label={t(`mood.${m.id}`)}
              >
                <span className="mood-emoji">{m.emoji}</span>
                <span className="mood-text">{t(`mood.${m.id}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {!showExtras ? (
          <button
            type="button"
            className="extras-toggle"
            onClick={() => setShowExtras(true)}
          >
            <span>{t('endofday.addExtras')}</span>
            <span className="extras-hint">{t('endofday.extrasHint')}</span>
          </button>
        ) : (
          <>
            <div className="input-area">
              <div className="input-label">{t('endofday.journalLabel')}</div>
              <textarea
                rows={3}
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder={t('endofday.journalPlaceholder')}
              />
            </div>

            <div className="note-card">
              <div className="note-icon">📌</div>
              <div className="note-inner">
                <div className="note-label">{t('endofday.noteLabel')}</div>
                <input
                  type="text"
                  value={tomorrowNote}
                  onChange={(e) => setTomorrowNote(e.target.value)}
                  placeholder={t('endofday.notePlaceholder')}
                />
              </div>
            </div>

            <button
              type="button"
              className="extras-toggle subtle"
              onClick={() => {
                setShowExtras(false);
                setJournal('');
                setTomorrowNote('');
              }}
            >
              {t('endofday.hideExtras')}
            </button>
          </>
        )}
      </div>

      <div className="popup-actions">
        <button className="btn-ghost" onClick={() => window.devlog.window.close()}>
          {t('common.skip')}
        </button>
        <button className="btn-main" onClick={save} disabled={saving}>
          {t('endofday.save')}
        </button>
      </div>
    </div>
  );
}
