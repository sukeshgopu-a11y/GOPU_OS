import React from 'react';

export function GopuLogoMark({ size = 40, className = '' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`gopu-logomark ${className}`}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2.5" opacity="0.35" />
      <path
        d="M36 24c0 6.627-5.373 12-12 12S12 30.627 12 24 17.373 12 24 12c4.418 0 8.291 2.392 10.392 5.971"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      />
      <path d="M30 24h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.2" fill="currentColor" />
      <circle cx="38" cy="18" r="1.4" fill="currentColor" opacity="0.6" />
      <circle cx="10" cy="30" r="1.4" fill="currentColor" opacity="0.6" />
      <circle cx="24" cy="6" r="1.4" fill="currentColor" opacity="0.45" />
      <path d="M24 22 L38 18" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
      <path d="M24 26 L10 30" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  );
}

export function GopuWordmark({ size = 'md' }) {
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.4 : 1;
  return (
    <div className="gopu-wordmark" style={{ '--wm-scale': scale }}>
      <GopuLogoMark size={Math.round(32 * scale)} />
      <div className="gopu-wordmark-text">
        <span className="gopu-wordmark-name">GOPU OS</span>
        <span className="gopu-wordmark-sub">Export Command</span>
      </div>
    </div>
  );
}

export function ExportOSIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="26" cy="26" r="18" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="26" cy="26" rx="8" ry="18" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <ellipse cx="26" cy="26" rx="18" ry="6" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <path d="M10 26 Q18 14 36 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M33 19 L36 22 L32 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="26" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function DirectorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14 3 L25 9 L25 19 L14 25 L3 19 L3 9 Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 3 L14 25 M3 9 L25 19 M25 9 L3 19" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
      <circle cx="14" cy="14" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function COOIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="10" width="7" height="15" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10.5" y="6" width="7" height="19" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="18" y="13" width="7" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7 Q10 3 14 3 Q20 3 24 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 1.5" />
    </svg>
  );
}

export function CTOIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 25 L19 25 M14 18 L14 25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 10 L11 12 L9 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14 L16 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CFOIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 6 L14 22 M10 9 Q14 7.5 18 9 M10 19 Q14 20.5 18 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 14 L19 14" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function CMOIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 20 Q8 10 14 12 Q20 14 24 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14" cy="12" r="2.2" fill="currentColor" />
      <circle cx="7" cy="18" r="1.6" fill="currentColor" opacity="0.6" />
      <circle cx="22" cy="8" r="1.6" fill="currentColor" opacity="0.6" />
      <path d="M7 24 L10 22 L14 20 L18 22 L21 24" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}

export function CIOIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="14" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 5 L14 8 M14 20 L14 23 M5 14 L8 14 M20 14 L23 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 7.5 L9.8 9.8 M18.2 18.2 L20.5 20.5 M7.5 20.5 L9.8 18.2 M18.2 9.8 L20.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function LearningIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 10 L14 6 L23 10 L14 14 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 12.5 L8 19 Q14 22 20 19 L20 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 10 L23 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="23" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}
