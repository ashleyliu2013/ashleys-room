import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const IMAGE_KEYS = ['photo','breakfastPhoto','lunchPhoto','dinnerPhoto','note1Photo','note2Photo','note3Photo'];

function dataUrlToBlob(dataUrl) {
  const [meta, body] = String(dataUrl).split(',');
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bytes = atob(body || '');
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function createAshleyCloud(config = {}) {
  const url = String(config.supabaseUrl || '').trim();
  const key = String(config.supabasePublishableKey || config.supabaseAnonKey || '').trim();
  const enabled = /^https:\/\//.test(url) && key.length > 20;
  const client = enabled ? createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  async function requireOk(promise) {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  }

  async function loadWeek() {
    if (!enabled) return {};
    const rows = await requireOk(client.from('room_days').select('day,payload,updated_at'));
    const out = {};
    for (const row of rows || []) if (row?.day && row?.payload) out[row.day] = row.payload;
    return out;
  }

  async function uploadImage(day, field, value) {
    if (!enabled || !String(value || '').startsWith('data:image/')) return value || '';
    const blob = dataUrlToBlob(value);
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const path = `${day.toLowerCase()}/${field}.${ext}`;
    const { error } = await client.storage.from('room-media').upload(path, blob, {
      cacheControl: '3600', upsert: true, contentType: blob.type
    });
    if (error) throw error;
    const { data } = client.storage.from('room-media').getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  async function saveDay(day, payload) {
    if (!enabled) return payload;
    const next = { ...payload };
    for (const field of IMAGE_KEYS) next[field] = await uploadImage(day, field, next[field]);
    await requireOk(client.from('room_days').upsert({ day, payload: next, updated_at: new Date().toISOString() }, { onConflict: 'day' }).select('day'));
    return next;
  }

  async function loadMessages(day) {
    if (!enabled) return [];
    const rows = await requireOk(client.from('messages').select('id,day,from_name,body,created_at').eq('day', day).order('created_at', { ascending: true }).limit(30));
    return (rows || []).map(r => ({ day:r.day, from:r.from_name || 'Visitor', text:r.body, time:new Date(r.created_at).getTime() }));
  }

  async function addMessage(day, from, text) {
    if (!enabled) return;
    await requireOk(client.from('messages').insert({ day, from_name: from || 'Visitor', body: text }));
  }

  async function addVisit(day, visitorId) {
    if (!enabled) return;
    await requireOk(client.from('visits').insert({ day, visitor_id: visitorId || null }));
  }

  async function signIn(email, password) {
    if (!enabled) throw new Error('Cloud is not configured');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    if (enabled) await client.auth.signOut();
  }

  async function getSession() {
    if (!enabled) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  return { enabled, client, loadWeek, saveDay, loadMessages, addMessage, addVisit, signIn, signOut, getSession };
}
