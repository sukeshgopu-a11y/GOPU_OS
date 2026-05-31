import React from 'react';

export function announceToSR(message, priority = 'polite') {
  const id = priority === 'assertive' ? 'sr-alert' : 'sr-announcer';
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 50);
}

export function getRouteAnnouncement(path) {
  const leaf = String(path || '/export-os').split('/').filter(Boolean).pop() || 'dashboard';
  return leaf.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function highlightMatch(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="search-highlight">{part}</mark>
      : part
  );
}
