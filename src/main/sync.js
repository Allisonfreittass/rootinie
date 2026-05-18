import { net } from 'electron';
import { getSupabase, isConfigured } from './supabase.js';
import {
  listPendingEntries,
  upsertEntry,
  patchState,
  getState,
  store
} from './store.js';

const TABLE = 'rootinie_entries';
let retryTimer = null;
const listeners = new Set();

function emit(status) {
  for (const cb of listeners) cb(status);
}

export function onStatusChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function isOnline() {
  return net.isOnline();
}

export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  return {
    user: data.session.user,
    email: data.session.user?.email,
    accessToken: data.session.access_token
  };
}

export async function getStatus() {
  const session = await getSession();
  return {
    lastSyncAt: getState().lastSyncAt,
    pending: listPendingEntries().length,
    online: isOnline(),
    loggedIn: Boolean(session),
    configured: isConfigured(),
    email: session?.email || null
  };
}

export async function signUp({ email, password }) {
  const sb = getSupabase();
  if (!sb) return { error: 'not_configured' };
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { error: error.message };
  emit(await getStatus());
  return { user: data.user };
}

export async function signIn({ email, password }) {
  const sb = getSupabase();
  if (!sb) return { error: 'not_configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  await pullAll();
  emit(await getStatus());
  return { user: data.user };
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return { error: 'not_configured' };
  await sb.auth.signOut();
  emit(await getStatus());
  return { ok: true };
}

function toRow(entry, userId) {
  return {
    user_id: userId,
    date: entry.date,
    mood: entry.mood,
    journal: entry.journal,
    tomorrow_note: entry.tomorrowNote,
    streak: getState().streak
  };
}

function fromRow(row) {
  return {
    date: row.date,
    mood: row.mood,
    journal: row.journal || '',
    tomorrowNote: row.tomorrow_note || '',
    syncedAt: new Date().toISOString()
  };
}

export async function pushPending() {
  const sb = getSupabase();
  if (!sb) return { pushed: 0, errors: ['not_configured'] };
  if (!isOnline()) return { pushed: 0, errors: ['offline'] };
  const session = await getSession();
  if (!session) return { pushed: 0, errors: ['not_logged_in'] };

  const pending = listPendingEntries();
  let pushed = 0;
  const errors = [];

  for (const entry of pending) {
    const { error } = await sb
      .from(TABLE)
      .upsert(toRow(entry, session.user.id), { onConflict: 'user_id,date' });
    if (error) {
      errors.push(error.message);
    } else {
      upsertEntry(entry.date, { syncedAt: new Date().toISOString() });
      pushed++;
    }
  }

  if (pushed > 0) patchState({ lastSyncAt: new Date().toISOString() });
  return { pushed, errors };
}

export async function pullAll() {
  const sb = getSupabase();
  if (!sb) return { pulled: 0, errors: ['not_configured'] };
  if (!isOnline()) return { pulled: 0, errors: ['offline'] };
  const session = await getSession();
  if (!session) return { pulled: 0, errors: ['not_logged_in'] };

  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('user_id', session.user.id);
  if (error) return { pulled: 0, errors: [error.message] };

  const entries = store.get('entries');
  let pulled = 0;
  for (const row of data || []) {
    const local = entries[row.date];
    const remote = fromRow(row);
    entries[row.date] = {
      ...(local || {}),
      ...remote,
      screenTimeSec: local?.screenTimeSec || 0,
      healthChecks: local?.healthChecks || []
    };
    pulled++;
  }
  store.set('entries', entries);
  patchState({ lastSyncAt: new Date().toISOString() });
  return { pulled, errors: [] };
}

export async function syncNow() {
  const pushRes = await pushPending();
  emit(await getStatus());
  return { pushed: pushRes.pushed, errors: pushRes.errors };
}

export function startBackgroundSync() {
  if (retryTimer) clearInterval(retryTimer);
  retryTimer = setInterval(() => {
    pushPending().then(async (r) => {
      if (r.pushed > 0) emit(await getStatus());
    });
  }, 5 * 60 * 1000);
}

export function stopBackgroundSync() {
  if (retryTimer) clearInterval(retryTimer);
  retryTimer = null;
}
