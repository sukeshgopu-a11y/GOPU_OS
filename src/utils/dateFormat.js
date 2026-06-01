const EMPTY_DISPLAY_VALUE = "\u2014";
const DEFAULT_LOCALE = "en-AU";

function toDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function formatWithOptions(value, options) {
  const date = toDate(value);
  if (!isValidDate(date)) return EMPTY_DISPLAY_VALUE;
  return date.toLocaleString(DEFAULT_LOCALE, options);
}

export function formatDisplayDate(value, options = {}) {
  return formatWithOptions(value, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options
  });
}

export function formatDisplayTime(value, options = {}) {
  return formatWithOptions(value, {
    hour: "2-digit",
    minute: "2-digit",
    ...options
  });
}

export function formatDisplayDateTime(value, options = {}) {
  return formatWithOptions(value, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options
  });
}

export function formatDate(value, options = {}) {
  return formatWithOptions(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options
  });
}

export const displayDate = formatDate;
export const displayTime = formatDisplayTime;
export const displayDateTime = formatDisplayDateTime;
