import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { TopBar, nowHHMM, formatScreenTime, MOODS, moodMeta, useEscapeToClose } from './shared.jsx';

function SummaryView({ result, mood, journal, tomorrowNote, focusCompleted, focus, screenTime, t }) {
  const moodInfo = mood ? moodMeta(mood) : null;
  const journalPreview = journal?.trim() ? journal.trim().slice(0, 140) : null;
  const note = tomorrowNote?.trim() || null;

  return (
    <>
      <div className="summary-hero">
        <div className="summary-moon">🌙</div>
        <div className="summary-title">{t('endofday.summary.title')}</div>
        <div className="summary-sub">
          {t('endofday.summary.streakLine', { count: result?.streak || 0 })}
        </div>
      </div>

      <div className="popup-body" style={{ paddingTop: 6 }}>
        <div className="summary-grid">
          {moodInfo && (
            <div className="summary-row">
              <span className="summary-label">{t('endofday.summary.moodLabel')}</span>
              <span className="summary-value">
                <span style={{ fontSize: 16 }}>{moodInfo.emoji}</span>
                {t(`mood.${mood}`)}
              </span>
            </div>
          )}

          {screenTime >= 300 && (
            <div className="summary-row">
              <span className="summary-label">{t('endofday.summary.screenLabel')}</span>
              <span className="summary-value mono">{formatScreenTime(screenTime)}</span>
            </div>
          )}

          {focus && focusCompleted !== null && (
            <div className="summary-row">
              <span className="summary-label">{t('endofday.summary.focusLabel')}</span>
              <span className="summary-value">
                {focusCompleted ? `✓ ${focus}` : `· ${focus}`}
              </span>
            </div>
          )}
        </div>

        {journalPreview && (
          <div className="summary-journal">
            <div className="summary-journal-label">{t('endofday.summary.journalLabel')}</div>
            <div className="summary-journal-text">"{journalPreview}{journal.length > 140 ? '…' : ''}"</div>
          </div>
        )}

        {note && (
          <div className="summary-note">
            <div className="summary-note-icon">📌</div>
            <div className="summary-note-inner">
              <div className="summary-note-label">{t('endofday.summary.tomorrowLabel')}</div>
              <div className="summary-note-text">{note}</div>
            </div>
          </div>
        )}

        <div className="summary-goodnight">{t('endofday.summary.goodnight')}</div>
      </div>

      <div className="popup-actions">
        <button className="btn-main" onClick={() => window.devlog.window.close()}>
          {t('endofday.summary.close')}
        </button>
      </div>
    </>
  );
}

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
  const [saveResult, setSaveResult] = useState(null);

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
    const result = await window.devlog.entry.saveEod({
      mood,
      journal,
      tomorrowNote,
      focusCompleted
    });
    setSaveResult(result);
    setSaving(false);
  }

  if (saveResult) {
    return (
      <div className="popup">
        <TopBar time={time} />
        <SummaryView
          result={saveResult}
          mood={mood}
          journal={journal}
          tomorrowNote={tomorrowNote}
          focusCompleted={focusCompleted}
          focus={focus}
          screenTime={screenTime}
          t={t}
        />
      </div>
    );
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
