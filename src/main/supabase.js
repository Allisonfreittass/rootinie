import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { store } from './store.js';

const url = import.meta.env.MAIN_VITE_SUPABASE_URL;
const anonKey = import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY;

const electronStoreAuthAdapter = {
  getItem: (key) => {
    const auth = store.get('auth') || {};
    return auth[key] ?? null;
  },
  setItem: (key, value) => {
    const auth = store.get('auth') || {};
    store.set('auth', { ...auth, [key]: value });
  },
  removeItem: (key) => {
    const auth = store.get('auth') || {};
    delete auth[key];
    store.set('auth', auth);
  }
};

let _client = null;
export function getSupabase() {
  if (!url || !anonKey) return null;
  if (_client) return _client;
  try {
    _client = createClient(url, anonKey, {
      auth: {
        storage: electronStoreAuthAdapter,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      realtime: {
        transport: ws
      }
    });
  } catch (err) {
    console.error('[supabase] init failed:', err.message);
    return null;
  }
  return _client;
}

export function isConfigured() {
  return Boolean(url && anonKey);
}
