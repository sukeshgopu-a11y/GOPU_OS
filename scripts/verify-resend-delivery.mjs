import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const API_BASE = 'https://api.resend.com';
const DEFAULT_DEADLINE_MS = 30000;
const DEFAULT_INTERVAL_MS = 2500;
const MAX_REQUEST_MS = 8000;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function maskEmailValue(value) {
  return value.replace(
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
    (email) => maskEmail(email),
  );
}

function parseRecipients(value) {
  return value
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function failBlocked(message, details = []) {
  console.error('RESEND_E2E_BLOCKED');
  console.error(message);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const rawText = await response.text();
    let body = {};

    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = { raw: rawText };
      }
    }

    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function getEmailId(body) {
  return body?.id || body?.data?.id || '';
}

function getLastEvent(body) {
  return body?.last_event || body?.data?.last_event || 'unknown';
}

function getErrorMessage(body) {
  return body?.message || body?.error || body?.name || JSON.stringify(body);
}

function deadlineRemaining(deadlineAt) {
  return Math.max(1000, deadlineAt - Date.now());
}

loadEnvFile(path.join(process.cwd(), '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));

const apiKey = env('RESEND_API_KEY');
const from = env('RESEND_FROM_EMAIL');
const recipients = parseRecipients(env('RESEND_TEST_TO') || env('RESEND_TO_EMAIL'));
const deadlineMs = Number(env('RESEND_E2E_DEADLINE_MS')) || DEFAULT_DEADLINE_MS;
const deadlineAt = Date.now() + Math.min(deadlineMs, DEFAULT_DEADLINE_MS);

const missing = [];
if (!apiKey) missing.push('RESEND_API_KEY is missing');
if (!from) missing.push('RESEND_FROM_EMAIL is missing');
if (!recipients.length) missing.push('RESEND_TEST_TO is missing');
if (apiKey && !apiKey.startsWith('re_')) missing.push('RESEND_API_KEY must start with re_');

if (missing.length) {
  failBlocked('Live Resend delivery cannot be verified without complete server-side email configuration.', [
    ...missing,
    'Put these values in .env.local or your server/deployment environment.',
    'Do not use VITE_RESEND_API_KEY; Resend keys must stay server-side.',
  ]);
}

const idempotencyKey = `gopu-resend-e2e-${Date.now()}-${randomUUID()}`;
const startedAt = new Date();
const subject = `[GOPU Export OS] Resend delivery verification - ${startedAt.toISOString()}`;
const text = [
  'GOPU Export OS Resend delivery verification.',
  'This is a controlled CTO delivery test.',
  'No operational action is required.',
  `Verification ID: ${idempotencyKey}`,
].join('\n');

const payload = {
  from,
  to: recipients,
  subject,
  text,
  tags: [
    { name: 'category', value: 'cto_verification' },
    { name: 'system', value: 'gopu_export_os' },
  ],
};

console.log('RESEND_E2E_START');
console.log(`FROM=${maskEmailValue(from)}`);
console.log(`TO=${recipients.map(maskEmail).join(', ')}`);
console.log(`DEADLINE_MS=${Math.min(deadlineMs, DEFAULT_DEADLINE_MS)}`);

const sendStartedAt = Date.now();
const { response: sendResponse, body: sendBody } = await requestJson(
  `${API_BASE}/emails`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'User-Agent': 'GOPU-Resend-EndToEnd-Verification/1.0',
    },
    body: JSON.stringify(payload),
  },
  Math.min(MAX_REQUEST_MS, deadlineRemaining(deadlineAt)),
);

const sendElapsedMs = Date.now() - sendStartedAt;

if (!sendResponse.ok) {
  console.error('RESEND_E2E_SEND_FAILED');
  console.error(`HTTP_STATUS=${sendResponse.status}`);
  console.error(`ELAPSED_MS=${sendElapsedMs}`);
  console.error(`ERROR=${getErrorMessage(sendBody)}`);
  process.exit(1);
}

const emailId = getEmailId(sendBody);
if (!emailId) {
  console.error('RESEND_E2E_SEND_FAILED');
  console.error('Resend accepted the request but did not return an email ID.');
  process.exit(1);
}

console.log('RESEND_E2E_SEND_ACCEPTED');
console.log(`EMAIL_ID=${emailId}`);
console.log(`SEND_HTTP_STATUS=${sendResponse.status}`);
console.log(`SEND_ELAPSED_MS=${sendElapsedMs}`);

let attempt = 0;
let lastEvent = 'unknown';
let retrievedAt = null;

while (Date.now() < deadlineAt) {
  attempt += 1;
  await sleep(Math.min(DEFAULT_INTERVAL_MS, deadlineRemaining(deadlineAt)));

  const retrieveStartedAt = Date.now();
  const { response: retrieveResponse, body: retrieveBody } = await requestJson(
    `${API_BASE}/emails/${emailId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'GOPU-Resend-EndToEnd-Verification/1.0',
      },
    },
    Math.min(MAX_REQUEST_MS, deadlineRemaining(deadlineAt)),
  );

  const retrieveElapsedMs = Date.now() - retrieveStartedAt;
  if (!retrieveResponse.ok) {
    console.error('RESEND_E2E_RETRIEVE_FAILED');
    console.error(`HTTP_STATUS=${retrieveResponse.status}`);
    console.error(`ELAPSED_MS=${retrieveElapsedMs}`);
    console.error(`ERROR=${getErrorMessage(retrieveBody)}`);
    process.exit(1);
  }

  lastEvent = getLastEvent(retrieveBody);
  retrievedAt = retrieveBody?.created_at || retrieveBody?.data?.created_at || null;
  console.log(`STATUS_CHECK_${attempt}=last_event:${lastEvent};elapsed_ms:${retrieveElapsedMs}`);

  if (lastEvent === 'delivered') {
    console.log('RESEND_E2E_DELIVERED');
    console.log(`EMAIL_ID=${emailId}`);
    console.log(`LAST_EVENT=${lastEvent}`);
    if (retrievedAt) console.log(`RESEND_CREATED_AT=${retrievedAt}`);
    process.exit(0);
  }

  if (['bounced', 'complained', 'suppressed'].includes(lastEvent)) {
    console.error('RESEND_E2E_DELIVERY_FAILED');
    console.error(`EMAIL_ID=${emailId}`);
    console.error(`LAST_EVENT=${lastEvent}`);
    process.exit(2);
  }
}

console.error('RESEND_E2E_NOT_CONFIRMED_WITHIN_DEADLINE');
console.error(`EMAIL_ID=${emailId}`);
console.error(`LAST_EVENT=${lastEvent}`);
console.error('Send was accepted, but delivery was not confirmed inside the 30 second verification window.');
process.exit(2);
