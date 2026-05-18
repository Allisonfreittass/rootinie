import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar, nowHHMM } from './shared.jsx';

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'pt-BR');
  const [eodTime, setEodTime] = useState('18:00');
  const [morningTime, setMorningTime] = useState('09:00');
  const [reminderIntervalMin, setReminderIntervalMin] = useState(90);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.devlog.settings.get().then((s) => {
      setEodTime(s.eodTime);
      setMorningTime(s.morningTime);
      setReminderIntervalMin(s.reminderIntervalMin);
      setLanguage(s.language);
    });
  }, []);

  async function changeLanguage(lng) {
    setLanguage(lng);
    await i18n.changeLanguage(lng);
  }

  async function finish() {
    if (!name.trim()) return;
    setBusy(true);
    await window.devlog.user.onboard({
      name: name.trim(),
      eodTime,
      morningTime,
      reminderIntervalMin,
      language
    });
    await window.devlog.window.open('morning');
    window.devlog.window.close();
  }

  return (
    <div className="popup">
      <TopBar showSettings={false} showClose={false} />

      <div className="popup-body">
        <div>
          <div style={{
            fontSize: 16, fontWeight: 600,
            color: 'var(--bright)', letterSpacing: '-0.3px'
          }}>
            {t('onboarding.title')}
          </div>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10, letterSpacing: 1, color: 'var(--muted)',
            marginTop: 4
          }}>
            {t('onboarding.sub')}
          </div>
        </div>

        <div className="settings-row">
          <label>{t('onboarding.languageLabel')}</label>
          <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
            <option value="pt-BR">Português</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="settings-row">
          <label>{t('onboarding.nameLabel')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('onboarding.namePlaceholder')}
            autoFocus
          />
        </div>

        <div className="row-2">
          <div className="settings-row">
            <label>{t('settings.morningTime')}</label>
            <input
              type="time"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <label>{t('settings.eodTime')}</label>
            <input
              type="time"
              value={eodTime}
              onChange={(e) => setEodTime(e.target.value)}
            />
          </div>
        </div>

        <div className="settings-row">
          <label>{t('settings.reminderInterval')}</label>
          <input
            type="number"
            min={5}
            max={480}
            value={reminderIntervalMin}
            onChange={(e) => setReminderIntervalMin(Number(e.target.value) || 90)}
          />
        </div>
      </div>

      <div className="popup-actions">
        <button
          className="btn-main"
          onClick={finish}
          disabled={busy || !name.trim()}
        >
          {t('onboarding.finish')}
        </button>
      </div>
    </div>
  );
}
