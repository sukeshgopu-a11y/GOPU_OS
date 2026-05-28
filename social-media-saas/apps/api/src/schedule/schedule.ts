export type ScheduleSettings = {
  country: string;
  timezone: string;
  postingTimeLocal: string;
};

export const supportedScheduleOptions = [
  { country: 'India', timezone: 'Asia/Kolkata' },
  { country: 'UAE', timezone: 'Asia/Dubai' },
  { country: 'Singapore', timezone: 'Asia/Singapore' },
  { country: 'United Kingdom', timezone: 'Europe/London' },
  { country: 'United States Eastern', timezone: 'America/New_York' },
  { country: 'Australia Eastern', timezone: 'Australia/Sydney' }
];

export function assertValidSchedule(input: ScheduleSettings) {
  const supported = supportedScheduleOptions.some((option) => option.country === input.country && option.timezone === input.timezone);
  if (!supported) throw new Error('Unsupported country/timezone combination.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.postingTimeLocal)) throw new Error('Posting time must use HH:mm 24-hour format.');

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: input.timezone }).format(new Date());
  } catch {
    throw new Error('Unsupported timezone.');
  }
}

export function localPostingTimeToCron(postingTimeLocal: string) {
  const [hour, minute] = postingTimeLocal.split(':').map(Number);
  return `${minute} ${hour} * * *`;
}

function timeZoneParts(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const rawHour = Number(values.hour);
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const parts = timeZoneParts(timeZone, date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedLocalTimeToUtc(timeZone: string, year: number, month: number, day: number, hour: number, minute: number) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMs(timeZone, utcGuess);
  let utcDate = new Date(utcGuess.getTime() - offset);
  const secondOffset = getTimeZoneOffsetMs(timeZone, utcDate);
  if (secondOffset !== offset) utcDate = new Date(utcGuess.getTime() - secondOffset);
  return utcDate;
}

function addOneLocalDay(year: number, month: number, day: number) {
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  };
}

export function computeNextRunUtc(settings: ScheduleSettings, now = new Date()) {
  assertValidSchedule(settings);
  const [hour, minute] = settings.postingTimeLocal.split(':').map(Number);
  const currentLocal = timeZoneParts(settings.timezone, now);
  let next = zonedLocalTimeToUtc(settings.timezone, currentLocal.year, currentLocal.month, currentLocal.day, hour, minute);
  if (next.getTime() <= now.getTime()) {
    const tomorrow = addOneLocalDay(currentLocal.year, currentLocal.month, currentLocal.day);
    next = zonedLocalTimeToUtc(settings.timezone, tomorrow.year, tomorrow.month, tomorrow.day, hour, minute);
  }
  return next;
}

export function formatInSelectedTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true
  }).format(date);
}

export function dbScheduleFromCampaign(campaign: {
  scheduleCountry?: string | null;
  scheduleTimezone?: string | null;
  postingTimeLocal?: string | null;
}) {
  if (!campaign.scheduleCountry || !campaign.scheduleTimezone || !campaign.postingTimeLocal) return null;
  return {
    country: campaign.scheduleCountry,
    timezone: campaign.scheduleTimezone,
    postingTimeLocal: campaign.postingTimeLocal
  };
}
