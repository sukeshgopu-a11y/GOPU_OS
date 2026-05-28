import assert from 'node:assert/strict';
import {
  canAutoPublishCmoItem,
  convertLocalScheduleToUtc,
  formatInCmoTimezone,
  getCmoDateRangeUtc,
  getNextPlatformSlot,
  isUtcWithinCmoDate
} from '../src/lib/cmoTimezone.js';

const selectedTimezone = 'Asia/Kolkata';

const scheduledUtc = convertLocalScheduleToUtc('2026-04-01', '11:00', selectedTimezone);
assert.equal(scheduledUtc, '2026-04-01T05:30:00Z', '11:00 AM IST must save as 05:30 UTC');

const aprilFirstRange = getCmoDateRangeUtc('2026-04-01', selectedTimezone);
assert.equal(aprilFirstRange.startUtc, '2026-03-31T18:30:00Z', 'India April 1 starts at previous-day 18:30 UTC');
assert.equal(aprilFirstRange.endUtc, '2026-04-01T18:29:59.999Z', 'India April 1 ends at 18:29:59.999 UTC');
assert.equal(isUtcWithinCmoDate('2026-03-31T19:00:00Z', '2026-04-01', selectedTimezone), true, 'UTC March 31 evening is India April 1');
assert.equal(isUtcWithinCmoDate('2026-04-01T19:00:00Z', '2026-04-01', selectedTimezone), false, 'UTC April 1 evening is India April 2');

const display = formatInCmoTimezone('2026-04-01T05:30:00Z', selectedTimezone);
assert.match(display, /11:00 AM/);
assert.match(display, /GMT\+5:30|IST/);

const sydneyDeviceTravelCase = getNextPlatformSlot('LinkedIn', selectedTimezone, '2026-03-31T23:00:00Z');
assert.equal(sydneyDeviceTravelCase.timezone, selectedTimezone, 'Selected GOPU OS timezone is preserved even for a travelling/device-zone user');
assert.equal(sydneyDeviceTravelCase.localTime, '11:00', 'LinkedIn slot remains 11:00 in selected timezone');

assert.equal(canAutoPublishCmoItem({
  approval_status: 'approved',
  scheduled_at_utc: '2026-04-01T05:30:00Z',
  publish_status: 'queued',
  platform_integration_connected: true
}, '2026-04-01T05:31:00Z'), 'ready_to_publish');

assert.equal(canAutoPublishCmoItem({
  approval_status: 'pending_approval',
  scheduled_at_utc: '2026-04-01T05:30:00Z',
  publish_status: 'queued',
  platform_integration_connected: true
}, '2026-04-01T05:31:00Z'), 'pending_approval');

assert.equal(canAutoPublishCmoItem({
  approval_status: 'approved',
  scheduled_at_utc: '2026-04-01T05:30:00Z',
  publish_status: 'queued',
  platform_integration_connected: false
}, '2026-04-01T05:31:00Z'), 'skipped');

console.log('CMO timezone checks passed');
