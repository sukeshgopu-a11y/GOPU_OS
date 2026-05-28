import crypto from 'node:crypto';
import { optionalEnv } from '../env';

export function verifySlackSignature(input: { timestamp?: string; signature?: string; rawBody?: string }) {
  const secret = optionalEnv('SLACK_SIGNING_SECRET');
  if (!secret) return false;
  if (!input.timestamp || !input.signature || !input.rawBody) return false;

  const requestTime = Number(input.timestamp);
  if (!Number.isFinite(requestTime)) return false;
  const fiveMinutes = 60 * 5;
  if (Math.abs(Math.floor(Date.now() / 1000) - requestTime) > fiveMinutes) return false;

  const base = `v0:${input.timestamp}:${input.rawBody}`;
  const digest = `v0=${crypto.createHmac('sha256', secret).update(base).digest('hex')}`;
  const expected = Buffer.from(digest);
  const actual = Buffer.from(input.signature);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
