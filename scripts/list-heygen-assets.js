require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.HEYGEN_API_KEY;
if (!apiKey) {
  console.error('Missing HEYGEN_API_KEY in .env');
  process.exit(1);
}

const baseURL = 'https://api.heygen.com';
const headers = { 'X-Api-Key': apiKey };

async function fetchJson(url, params = {}) {
  try {
    const response = await axios.get(url, { headers, params });
    return { ok: true, data: response.data, status: response.status };
  } catch (err) {
    const responseBody = err.response?.data;
    return {
      ok: false,
      status: err.response?.status,
      error: responseBody ? JSON.stringify(responseBody, null, 2) : err.message
    };
  }
}

function normalizeVoices(raw) {
  if (!raw) return [];
  const list =
    raw.data?.voices ||
    raw.data?.data?.voices ||
    (Array.isArray(raw.data) ? raw.data : []) ||
    (Array.isArray(raw.voices) ? raw.voices : []);
  return list.map((v) => ({
    id: v.voice_id || v.id || 'N/A',
    name: v.name || v.display_name || 'Unnamed',
    language: v.language || v.locale || '',
    gender: v.gender || '',
    type: v.type || ''
  }));
}

function normalizeAvatars(raw) {
  if (!raw) return [];
  const list =
    raw.data?.avatars ||
    raw.data?.data?.avatars ||
    (Array.isArray(raw.data) ? raw.data : []) ||
    (Array.isArray(raw.avatars) ? raw.avatars : []);
  return list.map((a) => ({
    id: a.avatar_id || a.id || 'N/A',
    name: a.avatar_name || a.name || 'Unnamed',
    gender: a.gender || '',
    type: a.type || ''
  }));
}

function printList(title, items) {
  console.log(`\n=== ${title} (${items.length}) ===`);
  if (items.length === 0) {
    console.log('No items found.');
    return;
  }
  items.forEach((item, index) => {
    const extras = [item.language, item.gender, item.type].filter(Boolean).join(', ');
    console.log(`${index + 1}. ${item.name}${extras ? ` [${extras}]` : ''} → ${item.id}`);
  });
}

async function main() {
  console.log('Fetching voices from HeyGen library...');
  const publicVoicesResult = await fetchJson(`${baseURL}/v1/audio/voices`, { type: 'public', limit: 100 });
  if (!publicVoicesResult.ok) {
    console.error('Failed to fetch public voices:', publicVoicesResult.error);
  } else {
    console.log(`Raw public voices response status: ${publicVoicesResult.status}`);
  }

  console.log('\nFetching your private voices...');
  const privateVoicesResult = await fetchJson(`${baseURL}/v1/audio/voices`, { type: 'private', limit: 100 });
  if (!privateVoicesResult.ok) {
    console.error('Failed to fetch private voices:', privateVoicesResult.error);
  } else {
    console.log(`Raw private voices response status: ${privateVoicesResult.status}`);
  }

  console.log('\nFetching avatars...');
  const avatarsResult = await fetchJson(`${baseURL}/v2/avatars/list`, { limit: 100 });
  if (!avatarsResult.ok) {
    // Fallback to older endpoint
    const fallback = await fetchJson(`${baseURL}/v2/avatars`, { limit: 100 });
    if (!fallback.ok) {
      console.error('Failed to fetch avatars from /v2/avatars/list and /v2/avatars:', avatarsResult.error, fallback.error);
    } else {
      avatarsResult.ok = true;
      avatarsResult.data = fallback.data;
      avatarsResult.status = fallback.status;
      console.log(`Raw avatars response status (fallback): ${fallback.status}`);
    }
  } else {
    console.log(`Raw avatars response status: ${avatarsResult.status}`);
  }

  const publicVoices = publicVoicesResult.ok ? normalizeVoices(publicVoicesResult.data) : [];
  const privateVoices = privateVoicesResult.ok ? normalizeVoices(privateVoicesResult.data) : [];
  const avatars = avatarsResult.ok ? normalizeAvatars(avatarsResult.data) : [];

  printList('PUBLIC VOICES (recommended for /v2/video/generate)', publicVoices);
  printList('YOUR PRIVATE VOICES (My voices — may not work with /v2/video/generate)', privateVoices);
  printList('AVATARS', avatars);

  console.log('\n--- DEBUG: raw response shapes ---');
  if (publicVoicesResult.ok) console.log('Public voices keys:', Object.keys(publicVoicesResult.data || {}));
  if (privateVoicesResult.ok) console.log('Private voices keys:', Object.keys(privateVoicesResult.data || {}));
  if (avatarsResult.ok) console.log('Avatars keys:', Object.keys(avatarsResult.data || {}));

  console.log('\nCopy the desired IDs into your .env file:');
  console.log('HEYGEN_VOICE_ID=<voice_id>');
  console.log('HEYGEN_AVATAR_ID=<avatar_id>');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
