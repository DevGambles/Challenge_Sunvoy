import fetchOrig from 'node-fetch';
import fetchCookie from 'fetch-cookie';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const BASE_URL = 'https://challenge.sunvoy.com';
const API_URL = 'https://api.challenge.sunvoy.com/api/settings';
const AUTH_FILE = './auth.json';
const fetch = fetchCookie(fetchOrig);

const USERNAME = 'demo@example.org';
const PASSWORD = 'test';
const SECRET_KEY = 'mys3cr3t';

async function readAuthFile() {
  if (!existsSync(AUTH_FILE)) {
    console.log('ℹ️ No auth file found.');
    return null;
  }
  console.log('📖 Reading auth file...');
  const content = await fs.readFile(AUTH_FILE, 'utf8');
  const parsed = JSON.parse(content);
  console.log('✅ Loaded cookie from auth file.');
  return parsed;
}

async function writeAuthFile(cookie) {
  await fs.writeFile(AUTH_FILE, JSON.stringify({ cookie }, null, 2));
  console.log('💾 Cookie saved to auth file.');
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

async function getNonce() {
  console.log('🌐 Fetching login page to extract nonce...');
  const res = await fetch(`${BASE_URL}/login`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const nonce = $('input[name=nonce]').val();
  console.log('🔑 Extracted nonce:', nonce);
  return nonce;
}

async function login() {
  console.log('🔐 Attempting to log in...');
  const nonce = await getNonce();

  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ nonce, username: USERNAME, password: PASSWORD }),
    redirect: 'manual'
  });

  const cookie = res.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('Login failed: No cookie received.');
  }

  console.log('✅ Login successful. Received new session cookie.');
  await writeAuthFile(cookie);
  return cookie;
}

async function getUsers(cookie) {
  console.log('👥 Fetching users list...');
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { cookie }
  });

  if (res.status !== 200) {
    console.warn(`⚠️ Failed to fetch users. Status code: ${res.status}`);
    throw new Error('Unauthorized or invalid session');
  }

  console.log('✅ Successfully fetched users list.');
  return res.json();
}

function generateCheckcode(payload) {
  const timestamp = getTimestamp().toString();
  const signedPayload = { ...payload, timestamp };

  const query = Object.keys(signedPayload)
    .sort()
    .map(key => `${key}=${encodeURIComponent(signedPayload[key])}`)
    .join('&');

  const hmac = crypto.createHmac('sha1', SECRET_KEY);
  hmac.update(query);
  const checkcode = hmac.digest('hex').toUpperCase();

  return checkcode;
}

function extractFormValues(html) {
  const $ = cheerio.load(html);
  return {
    access_token: $('#access_token').val(),
    openId: $('#openId').val(),
    userId: $('#userId').val(),
    apiuser: $('#apiuser').val(),
    operateId: $('#operateId').val(),
    language: $('#language').val(),
  };
}

function generateApiPayload(html) {
  console.log('📦 Generating API payload...');
  const fields = extractFormValues(html);
  const timestamp = getTimestamp();

  const payload = { ...fields, timestamp };
  payload.checkcode = generateCheckcode(payload);

  console.log('✅ Generated payload with checkcode:', payload.checkcode);
  return payload;
}

async function getCurrentUser(cookie) {
  console.log('🔍 Fetching current user from token settings page...');
  const html = await fetch(`${BASE_URL}/settings/tokens`, { headers: { cookie } })
    .then(res => res.text());

  const payload = generateApiPayload(html);

  console.log('📡 Sending payload to API...');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload),
  });

  const data = await response.json();
  console.log('✅ Received current user info.');
  return data;
}

(async () => {
  try {
    let auth = await readAuthFile();
    let cookie = auth?.cookie;

    let users;
    try {
      users = await getUsers(cookie);
    } catch (err) {
      console.warn('🚫 Cookie invalid or expired. Re-authenticating...');
      cookie = await login();
      users = await getUsers(cookie); // Retry after login
    }

    const currentUser = await getCurrentUser(cookie);
    users.push({ currentUser });

    await fs.writeFile('users.json', JSON.stringify(users, null, 2));
    console.log(`📁 users.json written with ${users.length} items`);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
})();