import { DateTime } from 'luxon';

export const DEFAULT_CMO_TIMEZONE = 'Asia/Kolkata';

const priorityTimezoneOptions = [
  { timezone: 'Asia/Kolkata', country: 'India', label: 'India', abbreviation: 'IST' },
  { timezone: 'Asia/Dubai', country: 'United Arab Emirates', label: 'UAE', abbreviation: 'GST' },
  { timezone: 'Asia/Muscat', country: 'Oman', label: 'Oman', abbreviation: 'GST' },
  { timezone: 'Australia/Sydney', country: 'Australia', label: 'Australia', abbreviation: 'AEDT/AEST' },
  { timezone: 'Europe/London', country: 'United Kingdom', label: 'United Kingdom', abbreviation: 'GMT/BST' },
  { timezone: 'America/New_York', country: 'United States', label: 'United States', abbreviation: 'ET' }
];

const fallbackTimezoneIds = [
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Caracas', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Mexico_City', 'America/New_York', 'America/Phoenix', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
  'Asia/Baghdad', 'Asia/Bahrain', 'Asia/Bangkok', 'Asia/Colombo', 'Asia/Dhaka', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Jerusalem', 'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Asia/Kuwait', 'Asia/Manila', 'Asia/Muscat', 'Asia/Qatar', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Taipei', 'Asia/Tokyo',
  'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Darwin', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Dublin', 'Europe/Istanbul', 'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'Europe/Moscow', 'Europe/Paris', 'Europe/Rome', 'Europe/Zurich',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Guam', 'Pacific/Honolulu'
];

function getSupportedTimezoneIds() {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone');
    }
  } catch {
    return fallbackTimezoneIds;
  }
  return fallbackTimezoneIds;
}

function labelFromTimezone(timezone) {
  const [region, ...cityParts] = timezone.split('/');
  const city = cityParts.join(' / ').replaceAll('_', ' ');
  return city ? `${city} (${region})` : timezone;
}

function optionFromTimezone(timezone) {
  return {
    timezone,
    country: labelFromTimezone(timezone),
    label: labelFromTimezone(timezone),
    abbreviation: DateTime.utc().setZone(timezone).offsetNameShort || timezone
  };
}

const priorityTimezoneSet = new Set(priorityTimezoneOptions.map((option) => option.timezone));

export const CMO_TIMEZONE_OPTIONS = [
  ...priorityTimezoneOptions,
  ...getSupportedTimezoneIds()
    .filter((timezone) => !priorityTimezoneSet.has(timezone) && isValidIanaTimezone(timezone))
    .map(optionFromTimezone)
].sort((a, b) => {
  const aPriority = priorityTimezoneSet.has(a.timezone) ? 0 : 1;
  const bPriority = priorityTimezoneSet.has(b.timezone) ? 0 : 1;
  if (aPriority !== bPriority) return aPriority - bPriority;
  return a.label.localeCompare(b.label);
});

export const CMO_PLATFORM_DEFAULT_SLOTS = {
  LinkedIn: '09:00',
  Facebook: '09:00',
  Instagram: '09:00',
  YouTube: '20:00',
  X: '09:30',
  Blog: '10:00',
  Email: '08:30'
};

const storedPreferenceKeys = [
  'gopu:cmo_timezone_preferences.timezone',
  'gopu:cmo_posting_settings.timezone',
  'cmo_timezone_preferences.timezone',
  'cmo_posting_settings.timezone'
];

export function isValidIanaTimezone(timezone) {
  return Boolean(timezone && DateTime.now().setZone(timezone).isValid);
}

export function getSelectedCmoTimezone(preference = {}) {
  const candidate = preference?.timezone
    || preference?.cmo_timezone_preferences?.timezone
    || preference?.cmo_posting_settings?.timezone
    || storedPreferenceKeys.map((key) => {
      try {
        return window?.localStorage?.getItem(key);
      } catch {
        return '';
      }
    }).find(Boolean)
    || DEFAULT_CMO_TIMEZONE;

  return isValidIanaTimezone(candidate) ? candidate : DEFAULT_CMO_TIMEZONE;
}

export function getCmoTimezoneOption(timezone = DEFAULT_CMO_TIMEZONE) {
  const selected = getSelectedCmoTimezone({ timezone });
  return CMO_TIMEZONE_OPTIONS.find((option) => option.timezone === selected) || {
    timezone: selected,
    country: '',
    label: selected,
    abbreviation: DateTime.utc().setZone(selected).offsetNameShort || selected
  };
}

export function getCmoTimezoneLabel(timezone = DEFAULT_CMO_TIMEZONE) {
  const selected = getSelectedCmoTimezone({ timezone });
  return getCmoTimezoneOption(selected).abbreviation || DateTime.utc().setZone(selected).offsetNameShort || selected;
}

export function convertLocalScheduleToUtc(date, time, timezone = DEFAULT_CMO_TIMEZONE) {
  const selected = getSelectedCmoTimezone({ timezone });
  const value = DateTime.fromISO(`${date}T${time}`, { zone: selected });
  if (!value.isValid) {
    throw new Error(`Invalid CMO schedule date/time for ${selected}: ${value.invalidExplanation || 'unknown error'}`);
  }
  return value.toUTC().toISO({ suppressMilliseconds: true });
}

export function formatInCmoTimezone(utcDate, timezone = DEFAULT_CMO_TIMEZONE, options = {}) {
  if (!utcDate) return 'Not recorded';
  const selected = getSelectedCmoTimezone({ timezone });
  const value = DateTime.fromISO(String(utcDate), { zone: 'utc' }).setZone(selected);
  if (!value.isValid) return String(utcDate);
  const text = options.dateOnly ? value.toFormat('LLLL d, yyyy') : value.toFormat('LLL d, yyyy, h:mm a');
  return `${text} ${getCmoTimezoneLabel(selected)}`;
}

export function getCmoLocalIsoDate(utcDate, timezone = DEFAULT_CMO_TIMEZONE) {
  if (!utcDate) return '';
  const selected = getSelectedCmoTimezone({ timezone });
  const value = DateTime.fromISO(String(utcDate), { zone: 'utc' }).setZone(selected);
  return value.isValid ? value.toISODate() : '';
}

export function getCmoDateRangeUtc(selectedDate, timezone = DEFAULT_CMO_TIMEZONE) {
  const selected = getSelectedCmoTimezone({ timezone });
  const start = DateTime.fromISO(selectedDate, { zone: selected }).startOf('day');
  if (!start.isValid) {
    throw new Error(`Invalid CMO date filter for ${selected}: ${start.invalidExplanation || 'unknown error'}`);
  }
  const end = start.endOf('day');
  return {
    startUtc: start.toUTC().toISO({ suppressMilliseconds: true }),
    endUtc: end.toUTC().toISO({ suppressMilliseconds: true }),
    timezone: selected
  };
}

export function isUtcWithinCmoDate(utcDate, selectedDate, timezone = DEFAULT_CMO_TIMEZONE) {
  if (!utcDate || !selectedDate) return false;
  const selected = getSelectedCmoTimezone({ timezone });
  const value = DateTime.fromISO(String(utcDate), { zone: 'utc' }).setZone(selected);
  return value.isValid && value.toISODate() === selectedDate;
}

export function getCmoRollingRangeStartUtc(days, timezone = DEFAULT_CMO_TIMEZONE, referenceUtc) {
  const selected = getSelectedCmoTimezone({ timezone });
  const reference = referenceUtc
    ? DateTime.fromISO(String(referenceUtc), { zone: 'utc' }).setZone(selected)
    : DateTime.utc().setZone(selected);
  return reference.startOf('day').minus({ days: Math.max(Number(days) || 1, 1) - 1 }).toUTC().toISO({ suppressMilliseconds: true });
}

export function isUtcOnOrAfter(utcDate, utcStart) {
  if (!utcDate || !utcStart) return false;
  const value = DateTime.fromISO(String(utcDate), { zone: 'utc' });
  const start = DateTime.fromISO(String(utcStart), { zone: 'utc' });
  return value.isValid && start.isValid && value >= start;
}

export function isUtcOnOrBefore(utcDate, utcEnd) {
  if (!utcDate || !utcEnd) return false;
  const value = DateTime.fromISO(String(utcDate), { zone: 'utc' });
  const end = DateTime.fromISO(String(utcEnd), { zone: 'utc' });
  return value.isValid && end.isValid && value <= end;
}

export function getNextPlatformSlot(platform, timezone = DEFAULT_CMO_TIMEZONE, referenceUtc) {
  const selected = getSelectedCmoTimezone({ timezone });
  const slot = CMO_PLATFORM_DEFAULT_SLOTS[platform] || CMO_PLATFORM_DEFAULT_SLOTS.LinkedIn;
  const [hour, minute] = slot.split(':').map(Number);
  const now = referenceUtc
    ? DateTime.fromISO(String(referenceUtc), { zone: 'utc' }).setZone(selected)
    : DateTime.utc().setZone(selected);
  let localSlot = now.set({ hour, minute, second: 0, millisecond: 0 });
  if (localSlot <= now) localSlot = localSlot.plus({ days: 1 });
  return {
    platform,
    localDate: localSlot.toISODate(),
    localTime: localSlot.toFormat('HH:mm'),
    scheduled_at_utc: localSlot.toUTC().toISO({ suppressMilliseconds: true }),
    display: formatInCmoTimezone(localSlot.toUTC().toISO(), selected),
    timezone: selected,
    country: getCmoTimezoneOption(selected).country
  };
}

export function getCmoNowUtc() {
  return DateTime.utc().toISO({ suppressMilliseconds: true });
}

export function canAutoPublishCmoItem(item, nowUtc = getCmoNowUtc()) {
  const scheduledAt = DateTime.fromISO(String(item?.scheduled_at_utc || ''), { zone: 'utc' });
  const current = DateTime.fromISO(String(nowUtc), { zone: 'utc' });
  if (item?.approval_status !== 'approved') return 'pending_approval';
  if (!item?.platform_integration_connected) return 'skipped';
  if (item?.publish_status !== 'queued') return item?.publish_status || 'skipped';
  if (!scheduledAt.isValid) return 'failed';
  if (scheduledAt > current) return 'queued_next_slot';
  return 'ready_to_publish';
}
