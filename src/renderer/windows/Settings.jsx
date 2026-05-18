import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar, nowHHMM, relativeTime } from './shared.jsx';

const SUPPORT_URL = 'https://buymeacoffee.com/allisonfreitas';

function SupportSection() {
  const { t } = useTranslation();
  return (
    <div className="settings-section">
      <div className="settings-section-title">{t('settings.support.title')}</div>
      <div className="support-card">
        <div className="support-text">{t('settings.support.line')}</div>
        <button
          className="support-btn"
          onClick={() => window.devlog.system.openExternal(SUPPORT_URL)}
        >
          {t('settings.support.cta')}
        </button>
      </div>
    </div>
  );
}

function SyncSection() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    const s = await window.devlog.sync.status();
    setStatus(s);
  }

  useEffect(() => {
    refresh();
    const off = window.devlog.sync.onStatus(setStatus);
    return off;
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    const fn = mode === 'signup' ? window.devlog.auth.signUp : window.devlog.auth.signIn;
    const res = await fn({ email, password });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setEmail('');
      setPassword('');
      refresh();
    }
  }

  async function logout() {
    setBusy(true);
    await window.devlog.auth.signOut();
    setBusy(false);
    refresh();
  }

  async function syncNow() {
    setBusy(true);
    await window.devlog.sync.now();
    setBusy(false);
    refresh();
  }

  if (!status) return null;

  if (!status.configured) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">{t('settings.sync.title')}</div>
        <div className="sync-status">{t('settings.sync.notConfigured')}</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">{t('settings.sync.title')}</div>

      {status.loggedIn ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="sync-status">
            <div>
              <span className={`dot ${status.online ? 'on' : 'off'}`} />
              {t('settings.sync.loggedInAs', { email: status.email })}
            </div>
            <div>
              {status.lastSyncAt
                ? t('settings.sync.lastSync', { when: relativeTime(status.lastSyncAt, t) })
                : t('settings.sync.neverSynced')}
            </div>
            {status.pending > 0 && (
              <div>{t('settings.sync.pending', { count: status.pending })}</div>
            )}
            <div>{status.online ? t('settings.sync.online') : t('settings.sync.offline')}</div>
          </div>
          <div className="row-2">
            <button className="btn-ghost" onClick={logout} disabled={busy}>
              {t('settings.sync.signOut')}
            </button>
            <button className="btn-main" onClick={syncNow} disabled={busy || !status.online}>
              {t('settings.sync.syncNow')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="sync-status">{t('settings.sync.loggedOutHint')}</div>
          <div className="settings-row">
            <label>{t('settings.sync.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="settings-row">
            <label>{t('settings.sync.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <div className="row-2">
            <button
              className="link-btn"
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            >
              {mode === 'signup' ? t('settings.sync.switchToSignIn') : t('settings.sync.switchToSignUp')}
            </button>
            <button className="btn-main" onClick={submit} disabled={busy || !email || !password}>
              {mode === 'signup' ? t('settings.sync.signUp') : t('settings.sync.signIn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    window.devlog.settings.get().then(setSettings);
  }, []);

  async function update(patch) {
    const next = await window.devlog.settings.set(patch);
    setSettings(next);
    if (patch.language) i18n.changeLanguage(patch.language);
  }

  if (!settings) return null;

  return (
    <div className="popup">
      <TopBar time={nowHHMM()} showSettings={false} />

      <div className="popup-body">
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: 'var(--bright)', letterSpacing: '-0.3px'
        }}>
          {t('settings.title')}
        </div>

        <div className="row-2">
          <div className="settings-row">
            <label>{t('settings.morningTime')}</label>
            <input
              type="time"
              value={settings.morningTime}
              onChange={(e) => update({ morningTime: e.target.value })}
            />
          </div>
          <div className="settings-row">
            <label>{t('settings.eodTime')}</label>
            <input
              type="time"
              value={settings.eodTime}
              onChange={(e) => update({ eodTime: e.target.value })}
            />
          </div>
        </div>

        <div className="row-2">
          <div className="settings-row">
            <label>{t('settings.reminderInterval')}</label>
            <input
              type="number"
              min={5}
              max={480}
              value={settings.reminderIntervalMin}
              onChange={(e) =>
                update({ reminderIntervalMin: Number(e.target.value) || 90 })
              }
            />
          </div>
          <div className="settings-row">
            <label>{t('settings.focusModeMin')}</label>
            <input
              type="number"
              min={15}
              max={240}
              value={settings.focusModeMin}
              onChange={(e) =>
                update({ focusModeMin: Number(e.target.value) || 90 })
              }
            />
          </div>
        </div>

        <div className="row-2">
          <div className="settings-row">
            <label>{t('settings.sound')}</label>
            <select
              value={settings.sound ? 'on' : 'off'}
              onChange={(e) => update({ sound: e.target.value === 'on' })}
            >
              <option value="on">{t('settings.soundOn')}</option>
              <option value="off">{t('settings.soundOff')}</option>
            </select>
          </div>
          <div className="settings-row">
            <label>{t('settings.nativeNotifications')}</label>
            <select
              value={settings.nativeNotifications ? 'on' : 'off'}
              onChange={(e) => update({ nativeNotifications: e.target.value === 'on' })}
            >
              <option value="on">{t('settings.nativeNotificationsOn')}</option>
              <option value="off">{t('settings.nativeNotificationsOff')}</option>
            </select>
          </div>
        </div>

        <div className="settings-row">
          <label>{t('settings.skipWeekends')}</label>
          <select
            value={settings.skipWeekends ? 'on' : 'off'}
            onChange={(e) => update({ skipWeekends: e.target.value === 'on' })}
          >
            <option value="off">{t('settings.skipWeekendsOff')}</option>
            <option value="on">{t('settings.skipWeekendsOn')}</option>
          </select>
        </div>

        <div className="row-2">
          <div className="settings-row">
            <label>{t('settings.theme')}</label>
            <select
              value={settings.theme}
              onChange={(e) => update({ theme: e.target.value })}
            >
              <option value="system">{t('settings.themeSystem')}</option>
              <option value="light">{t('settings.themeLight')}</option>
              <option value="dark">{t('settings.themeDark')}</option>
            </select>
          </div>
          <div className="settings-row">
            <label>{t('settings.language')}</label>
            <select
              value={settings.language}
              onChange={(e) => update({ language: e.target.value })}
            >
              <option value="pt-BR">Português</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <SyncSection />
        <SupportSection />
      </div>

      <div className="popup-actions">
        <button className="btn-main" onClick={() => window.devlog.window.close()}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
