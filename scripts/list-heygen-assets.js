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

function normalizeV2Avatars(raw) {
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

function normalizeV3Looks(raw) {
  if (!raw) return [];
  const list =
    raw.data?.looks ||
    raw.data?.data?.looks ||
    (Array.isArray(raw.data) ? raw.data : []) ||
    (Array.isArray(raw.looks) ? raw.looks : []);
  return list.map((a) => ({
    id: a.avatar_id || a.look_id || a.id || 'N/A',
    name: a.avatar_name || a.name || 'Unnamed',
    groupId: a.group_id || '',
    gender: a.gender || ''
  }));
}

function printList(title, items, formatter) {
  console.log(`\n=== ${title} (${items.length}) ===`);
  if (items.length === 0) {
    console.log('No items found.');
    return;
  }
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${formatter(item)}`);
  });
}

async function main() {
  console.log('Fetching voices...');
  const publicVoicesResult = await fetchJson(`${baseURL}/v1/audio/voices`, { type: 'public', limit: 100 });
  const privateVoicesResult = await fetchJson(`${baseURL}/v1/audio/voices`, { type: 'private', limit: 100 });

  console.log('Fetching v2 avatars (for /v2/video/generate)...');
  const v2AvatarsResult = await fetchJson(`${baseURL}/v2/avatars`, { limit: 100 });

  console.log('Fetching v3 looks (for /v3/videos)...');
  const v3LooksResult = await fetchJson(`${baseURL}/v3/avatars`, { limit: 100 });

  const publicVoices = publicVoicesResult.ok ? normalizeVoices(publicVoicesResult.data) : [];
  const privateVoices = privateVoicesResult.ok ? normalizeVoices(privateVoicesResult.data) : [];
  const v2Avatars = v2AvatarsResult.ok ? normalizeV2Avatars(v2AvatarsResult.data) : [];
  const v3Looks = v3LooksResult.ok ? normalizeV3Looks(v3LooksResult.data) : [];

  printList('PUBLIC VOICES (recommended for /v2/video/generate)', publicVoices, (v) => {
    const extras = [v.language, v.gender, v.type].filter(Boolean).join(', ');
    return `${v.name}${extras ? ` [${extras}]` : ''} -> ${v.id}`;
  });

  printList('YOUR PRIVATE VOICES (may not work with /v2/video/generate)', privateVoices, (v) => {
    const extras = [v.language, v.gender, v.type].filter(Boolean).join(', ');
    return `${v.name}${extras ? ` [${extras}]` : ''} -> ${v.id}`;
  });

  printList('V2 AVATARS -- use these HEYGEN_AVATAR_ID for /v2/video/generate', v2Avatars, (a) => {
    const extras = [a.gender, a.type].filter(Boolean).join(', ');
    return `${a.name}${extras ? ` [${extras}]` : ''} -> ${a.id}`;
  });

  printList('V3 LOOKS -- use these for /v3/videos only', v3Looks, (a) => {
    const extras = [a.gender, a.groupId].filter(Boolean).join(', ');
    return `${a.name}${extras ? ` [${extras}]` : ''} -> ${a.id}`;
  });

  console.log('\n--- DEBUG: raw response shapes ---');
  if (publicVoicesResult.ok) console.log('Public voices keys:', Object.keys(publicVoicesResult.data || {}));
  if (privateVoicesResult.ok) console.log('Private voices keys:', Object.keys(privateVoicesResult.data || {}));
  if (v2AvatarsResult.ok) console.log('V2 avatars keys:', Object.keys(v2AvatarsResult.data || {}));
  if (v3LooksResult.ok) console.log('V3 looks keys:', Object.keys(v3LooksResult.data || {}));

  console.log('\nFor /v2/video/generate set in .env:');
  console.log('HEYGEN_VOICE_ID=<id from PUBLIC VOICES>');
  console.log('HEYGEN_AVATAR_ID=<id from V2 AVATARS>');
  console.log('\nNOTE: IDs from V3 LOOKS will NOT work with /v2/video/generate.');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
