require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.HEYGEN_API_KEY;
if (!apiKey) {
  console.error('Missing HEYGEN_API_KEY in .env');
  process.exit(1);
}

const baseURL = 'https://api.heygen.com';
const headers = { 'X-Api-Key': apiKey };

async function fetchVoices() {
  try {
    const response = await axios.get(`${baseURL}/v2/voices`, { headers });
    return response.data?.data?.voices || response.data?.data || [];
  } catch (err) {
    console.error('Failed to fetch voices:', err.message);
    return [];
  }
}

async function fetchAvatars() {
  try {
    const response = await axios.get(`${baseURL}/v2/avatars`, { headers });
    return response.data?.data?.avatars || response.data?.data || [];
  } catch (err) {
    console.error('Failed to fetch avatars:', err.message);
    return [];
  }
}

function printList(title, items, formatter) {
  console.log(`\n=== ${title} ===`);
  if (items.length === 0) {
    console.log('No items found or request failed.');
    return;
  }
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${formatter(item)}`);
  });
}

async function main() {
  const [voices, avatars] = await Promise.all([fetchVoices(), fetchAvatars()]);

  printList('VOICES', voices, (v) => {
    const id = v.voice_id || v.id || 'N/A';
    const name = v.name || v.display_name || 'Unnamed';
    const language = v.language || v.locale || '';
    return `${name} ${language ? `(${language}) ` : ''}→ ${id}`;
  });

  printList('AVATARS', avatars, (a) => {
    const id = a.avatar_id || a.id || 'N/A';
    const name = a.avatar_name || a.name || 'Unnamed';
    const gender = a.gender || '';
    return `${name} ${gender ? `(${gender}) ` : ''}→ ${id}`;
  });

  console.log('\nCopy the desired voice_id and avatar_id into your .env file.');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
