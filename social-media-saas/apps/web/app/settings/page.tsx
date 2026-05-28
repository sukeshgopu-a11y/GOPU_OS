'use client';

import { useEffect, useState } from 'react';
import { AuthGate } from '../../components/AuthGate';
import { apiGet, apiPut } from '../../lib/api';

type SettingsResponse = {
  product: string;
  status: Record<string, boolean | string>;
  scheduleOptions: Array<{ country: string; timezone: string }>;
  schedule: {
    campaignId: string;
    source: string;
    country: string;
    timezone: string;
    postingTimeLocal: string;
    nextRunAtUtc: string;
    nextRunPreview: string;
  } | null;
};

function Flag({ label, value }: { label: string; value: boolean | string }) {
  const configured = value === true || (typeof value === 'string' && value.length > 0 && value !== 'false');
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${configured ? 'text-emerald-300' : 'text-amber-300'}`}>{String(value)}</p>
    </div>
  );
}

function Settings({ token }: { token: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [postingTimeLocal, setPostingTimeLocal] = useState('08:00');

  useEffect(() => {
    apiGet<SettingsResponse>('/settings', token)
      .then((result) => {
        setSettings(result);
        setCountry(result.schedule?.country || result.scheduleOptions[0]?.country || '');
        setTimezone(result.schedule?.timezone || result.scheduleOptions[0]?.timezone || '');
        setPostingTimeLocal(result.schedule?.postingTimeLocal || '08:00');
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load settings'));
  }, [token]);

  function updateCountry(nextCountry: string) {
    setCountry(nextCountry);
    const match = settings?.scheduleOptions.find((option) => option.country === nextCountry);
    if (match) setTimezone(match.timezone);
  }

  async function saveSchedule() {
    setError('');
    setSaveMessage('');
    try {
      const result = await apiPut<{ ok: boolean; schedule: SettingsResponse['schedule'] }>('/settings/schedule', token, {
        country,
        timezone,
        postingTimeLocal
      });
      setSettings((current) => (current ? { ...current, schedule: result.schedule } : current));
      setSaveMessage('Schedule saved. Daily automation now uses the selected country/timezone.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save schedule');
    }
  }

  const timezoneOptions = settings?.scheduleOptions.filter((option) => option.country === country) || [];

  return (
    <section className="mx-auto max-w-6xl px-5 pb-12 pt-8">
      <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">Settings</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">Provider and feature flag visibility</h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        This page shows whether required provider credentials are configured. Secret values are never displayed in the frontend.
      </p>
      {error ? <div className="panel mt-6 rounded-xl p-4 text-red-200">{error}</div> : null}
      {settings ? (
        <div className="space-y-6">
          <div className="panel mt-6 rounded-2xl p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Country and timezone posting schedule</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-400">
                  Business schedule uses this selected country/timezone only. Device, browser, and travel timezone are ignored for posting logic.
                </p>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                {settings.schedule?.source || 'env_fallback'}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="text-sm text-slate-300">
                Country
                <select
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                  value={country}
                  onChange={(event) => updateCountry(event.target.value)}
                >
                  {settings.scheduleOptions.map((option) => (
                    <option key={option.country} value={option.country}>
                      {option.country}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Timezone
                <select
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                >
                  {(timezoneOptions.length ? timezoneOptions : settings.scheduleOptions).map((option) => (
                    <option key={option.timezone} value={option.timezone}>
                      {option.timezone}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-300">
                Posting time
                <input
                  type="time"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
                  value={postingTimeLocal}
                  onChange={(event) => setPostingTimeLocal(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Next run preview</p>
                <p className="mt-1 text-base font-semibold text-white">{settings.schedule?.nextRunPreview || 'Save a schedule to preview the next run.'}</p>
                <p className="mt-1 text-xs text-slate-500">Stored UTC: {settings.schedule?.nextRunAtUtc || 'not stored yet'}</p>
              </div>
              <button
                className="rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
                type="button"
                onClick={saveSchedule}
              >
                Save Schedule
              </button>
            </div>
            {saveMessage ? <p className="mt-3 text-sm text-emerald-300">{saveMessage}</p> : null}
          </div>

          <div className="panel rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">{settings.product}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(settings.status).map(([key, value]) => (
                <Flag key={key} label={key} value={value} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function SettingsPage() {
  return <AuthGate>{(token) => <Settings token={token} />}</AuthGate>;
}
