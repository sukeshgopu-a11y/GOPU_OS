import { createClient } from '@supabase/supabase-js';

function env(name) {
  return process.env[name]?.trim() || '';
}

function getSupabaseUrl() {
  return env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL') || env('VITE_SUPABASE_URL');
}

function getSupabaseProjectRef(supabaseUrl = '') {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

function getSupabaseKeyRef(key = '') {
  const parts = String(key).split('.');
  if (parts.length !== 3) return '';
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload?.ref || '';
  } catch {
    return '';
  }
}

function getSupabaseServiceRoleKey(supabaseUrl = '') {
  const projectRef = getSupabaseProjectRef(supabaseUrl);
  const candidates = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SECRET_KEY'
  ].map((name) => ({ name, key: env(name) })).filter((candidate) => candidate.key);

  const matchingCandidate = candidates.find((candidate) => {
    const keyRef = getSupabaseKeyRef(candidate.key);
    return !keyRef || !projectRef || keyRef === projectRef;
  });

  return {
    key: matchingCandidate?.key || '',
    hasCandidate: candidates.length > 0,
    mismatch: candidates.length > 0 && !matchingCandidate
  };
}

function safeSchedulerRow(row = {}) {
  return {
    id: row.id,
    platform_key: row.platform_key,
    platform_name: row.platform_name,
    logo_key: row.logo_key,
    provider: row.provider,
    status: row.status,
    runtime: row.runtime || row.metadata?.scheduler_runtime || 'vercel_cron',
    error_message: row.error_message || '',
    last_sync_at: row.last_sync_at,
    last_checked_at: row.last_checked_at,
    metadata: row.metadata || {}
  };
}

function safePostingRow(row = {}) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    platform: row.platform,
    timezone: row.timezone,
    country: row.country,
    local_post_time: row.local_post_time,
    schedule_mode: row.schedule_mode,
    schedule_days: row.schedule_days || [],
    trigger_window_minutes: row.trigger_window_minutes,
    last_triggered_at_utc: row.last_triggered_at_utc
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, status: 'method_not_allowed' });
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRole = getSupabaseServiceRoleKey(supabaseUrl);
  if (!supabaseUrl || !serviceRole.key) {
    if (serviceRole.mismatch) {
      return res.status(200).json({
        ok: false,
        status: 'not_configured',
        message: 'Scheduler health Supabase service role key does not match the current Supabase project.'
      });
    }
    return res.status(200).json({ ok: false, status: 'not_configured', message: 'Scheduler health server env is missing.' });
  }

  const client = createClient(supabaseUrl, serviceRole.key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const [healthResult, postingResult] = await Promise.all([
      client
        .from('platform_integrations')
        .select('id,platform_key,platform_name,logo_key,provider,status,runtime,error_message,last_sync_at,last_checked_at,metadata')
        .eq('platform_key', 'vercel_cron_scheduler')
        .maybeSingle(),
      client
        .from('cmo_posting_settings')
        .select('id,tenant_id,platform,timezone,country,local_post_time,schedule_mode,schedule_days,trigger_window_minutes,last_triggered_at_utc')
        .order('updated_at', { ascending: false })
    ]);

    if (healthResult.error || postingResult.error) {
      return res.status(200).json({
        ok: false,
        status: 'db_read_failed',
        message: healthResult.error?.message || postingResult.error?.message || 'Scheduler health could not be read.'
      });
    }

    return res.status(200).json({
      ok: true,
      source: 'scheduler_health_api',
      integration: healthResult.data ? safeSchedulerRow(healthResult.data) : null,
      postingSettings: (postingResult.data || []).map(safePostingRow)
    });
  } catch {
    return res.status(200).json({ ok: false, status: 'failed_safely', message: 'Scheduler health check failed safely.' });
  }
}
