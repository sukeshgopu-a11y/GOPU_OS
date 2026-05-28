'use client';

import { useEffect, useState } from 'react';
import { AuthGate } from '../components/AuthGate';
import { apiGet } from '../lib/api';

type Run = {
  id: string;
  status: string;
  scheduledFor: string;
  createdAt: string;
  failureReason?: string | null;
  campaign: { name: string; productFocus: string };
  contentVariants: Array<{ platform: string; caption: string; imageUrl?: string | null; status: string }>;
  approvalRequests: Array<{ status: string; messageTs?: string | null }>;
  publishJobs: Array<{ platform: string; status: string; externalPostId?: string | null; error?: string | null }>;
};

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'published' ? 'bg-emerald-400/15 text-emerald-200' : status === 'failed' || status === 'rejected' ? 'bg-red-400/15 text-red-200' : 'bg-cyan-400/15 text-cyan-200';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>{status}</span>;
}

function RunsList({ token }: { token: string }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Run[]>('/campaign-runs', token)
      .then(setRuns)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load runs'));
  }, [token]);

  return (
    <section className="mx-auto max-w-6xl px-5 pb-12 pt-8">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">Daily Runs</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Poster, approval, and publishing status</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          One daily run creates platform captions, one branded poster, a Slack approval request, and platform publish jobs after approval.
        </p>
      </div>

      {error ? <div className="panel rounded-xl p-4 text-red-200">{error}</div> : null}
      {!error && runs.length === 0 ? (
        <div className="panel rounded-2xl p-8 text-slate-300">
          No campaign runs yet. The repeatable BullMQ job is registered for 8:00 AM IST when the API starts.
        </div>
      ) : null}
      <div className="space-y-4">
        {runs.map((run) => (
          <article key={run.id} className="panel rounded-2xl p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={run.status} />
                  <span className="text-sm text-slate-400">{new Date(run.createdAt).toLocaleString()}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">{run.campaign.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{run.campaign.productFocus}</p>
              </div>
              <p className="text-xs text-slate-500">Run ID: {run.id}</p>
            </div>

            {run.failureReason ? <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{run.failureReason}</p> : null}

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {run.contentVariants.map((variant) => (
                <div key={variant.platform} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold capitalize text-white">{variant.platform}</span>
                    <StatusBadge status={variant.status} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-400">{variant.caption}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Approval</p>
                <p className="mt-2 text-sm text-slate-300">{run.approvalRequests[0]?.status || 'not created'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Publishing</p>
                <p className="mt-2 text-sm text-slate-300">
                  {run.publishJobs.length ? `${run.publishJobs.filter((job) => job.status === 'published').length}/${run.publishJobs.length} published` : 'not queued'}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Page() {
  return <AuthGate>{(token) => <RunsList token={token} />}</AuthGate>;
}
