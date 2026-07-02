import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { google } from 'googleapis';
import { config } from '../config.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const OAUTH_PORT = 5454;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/oauth2callback`;

function loadClientCredentials() {
  // On a host, provide the credentials JSON via env (no committed file needed).
  const rawJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (rawJson && rawJson.trim()) {
    const parsed = JSON.parse(rawJson);
    const creds = parsed.installed || parsed.web || parsed;
    if (!creds.client_id) throw new Error('GOOGLE_CREDENTIALS_JSON missing client_id.');
    return creds;
  }
  if (!fs.existsSync(config.google.credentialsPath)) {
    throw new Error(
      `Google credentials not found. Set GOOGLE_CREDENTIALS_JSON, or place credentials.json at ` +
      `${config.google.credentialsPath} (see SETUP.md).`
    );
  }
  const raw = JSON.parse(fs.readFileSync(config.google.credentialsPath, 'utf8'));
  const creds = raw.installed || raw.web;
  if (!creds) throw new Error('credentials.json missing "installed"/"web" key.');
  return creds;
}

// Read the cached OAuth token from env (host) or the token file (local). Env wins.
function readToken() {
  const envToken = process.env.GOOGLE_TOKEN_JSON;
  if (envToken && envToken.trim()) return JSON.parse(envToken);
  if (fs.existsSync(config.google.tokenPath)) {
    return JSON.parse(fs.readFileSync(config.google.tokenPath, 'utf8'));
  }
  return null;
}

function makeOAuthClient() {
  const { client_id, client_secret } = loadClientCredentials();
  return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

function saveToken(tokens) {
  // Best-effort: on a read-only host filesystem this is skipped. That's fine —
  // the refresh_token (from GOOGLE_TOKEN_JSON) stays valid, so the in-memory
  // client keeps refreshing access tokens across the process's life.
  try {
    fs.mkdirSync(path.dirname(config.google.tokenPath), { recursive: true });
    fs.writeFileSync(config.google.tokenPath, JSON.stringify(tokens, null, 2));
  } catch { /* read-only fs (e.g. serverless) — ignore */ }
}

/** Returns an authorized OAuth2 client if a cached token exists, else null. */
export function getAuthorizedClientSync() {
  const token = readToken();
  if (!token) return null;
  const client = makeOAuthClient();
  client.setCredentials(token);
  client.on('tokens', (t) => {
    const merged = { ...client.credentials, ...t };
    saveToken(merged);
  });
  return client;
}

export function isAuthorized() {
  return !!(process.env.GOOGLE_TOKEN_JSON && process.env.GOOGLE_TOKEN_JSON.trim())
    || fs.existsSync(config.google.tokenPath);
}

export function getConsentUrl() {
  const client = makeOAuthClient();
  return {
    client,
    url: client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES }),
  };
}

/**
 * Full interactive consent flow. Spins up a tiny local server to catch the
 * redirect, exchanges the code, and caches the token. Used by `npm run auth`
 * and by the dashboard's "Connect Google" button.
 */
export async function runConsentFlow({ onUrl } = {}) {
  const { client, url } = getConsentUrl();
  if (onUrl) onUrl(url);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url.startsWith('/oauth2callback')) {
        res.writeHead(404); res.end(); return;
      }
      try {
        const code = new URL(req.url, REDIRECT_URI).searchParams.get('code');
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        saveToken(tokens);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>✅ Google Calendar connected. You can close this tab and return to the dashboard.</h2>');
        server.close();
        resolve(client);
      } catch (err) {
        res.writeHead(500); res.end('Auth error: ' + err.message);
        server.close();
        reject(err);
      }
    });
    server.listen(OAUTH_PORT);
  });
}

// CLI: `npm run auth`
if (import.meta.url === `file://${process.argv[1]}`) {
  const open = (await import('open')).default;
  console.log('Opening Google consent screen in your browser…');
  await runConsentFlow({ onUrl: (u) => open(u).catch(() => console.log('Open this URL manually:\n' + u)) });
  console.log('Done. Token saved to', config.google.tokenPath);
  process.exit(0);
}
