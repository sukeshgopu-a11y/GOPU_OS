import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const envText = await fs.readFile(path.join(root, '.env'), 'utf8').catch(() => '');

for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) continue;
  const [, key, raw] = match;
  if (!process.env[key]) process.env[key] = raw.replace(/^['"]|['"]$/g, '');
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'cmo-generated-assets';
const contentType = 'image/png';

function requireConfig() {
  const missing = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) throw new Error(`Missing Supabase Storage config: ${missing.join(', ')}`);
}

async function rest(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Supabase REST failed: ${response.status} ${text}`);
  return body;
}

async function storage(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/storage/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { ok: response.ok, status: response.status, headers: response.headers, body };
}

async function tenantId() {
  const rows = await rest('tenants?select=id&order=created_at.asc&limit=1', { method: 'GET' });
  return rows?.[0]?.id || null;
}

async function audit(actionType, description, metadata = {}, riskLevel = 'low') {
  const rows = await rest('audit_logs', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: await tenantId().catch(() => null),
      action_type: actionType,
      module: 'CMO Automation Flow',
      related_table: 'platform_integrations',
      actor: 'step4_supabase_storage_verification',
      description,
      risk_level: riskLevel,
      metadata
    })
  });
  return rows?.[0] || null;
}

async function updateStorageIntegration(status, errorMessage, metadata = {}) {
  const rows = await rest('platform_integrations?on_conflict=platform_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      platform_key: 'asset_storage',
      platform_name: 'Supabase Storage Upload',
      logo_key: 'supabase',
      provider: 'supabase_storage',
      status,
      runtime: 'supabase_storage',
      error_message: errorMessage || null,
      last_sync_at: status === 'live' ? new Date().toISOString() : null,
      last_checked_at: new Date().toISOString(),
      metadata
    })
  });
  return rows?.[0] || null;
}

async function ensureBucket() {
  const existing = await storage(`bucket/${encodeURIComponent(bucket)}`, { method: 'GET' });
  if (existing.ok) return { created: false, public: existing.body?.public === true };
  const created = await storage('bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 10485760,
      allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp']
    })
  });
  if (!created.ok) throw new Error(`Supabase Storage bucket create failed: ${created.status} ${JSON.stringify(created.body)}`);
  return { created: true, public: true };
}

async function latestPoster() {
  const dir = path.join(root, 'output', 'step3-poster-test');
  const files = await fs.readdir(dir, { withFileTypes: true });
  const posters = [];
  for (const file of files) {
    if (!file.isFile() || !/^step3-final-composed-.*\.png$/.test(file.name)) continue;
    const full = path.join(dir, file.name);
    const stat = await fs.stat(full);
    posters.push({ full, name: file.name, size: stat.size, mtimeMs: stat.mtimeMs });
  }
  posters.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return posters[0] || null;
}

const auditIds = [];
let publicUrl = null;

try {
  requireConfig();
  const poster = await latestPoster();
  if (!poster) throw new Error('No Step 3 composed poster image found.');

  const storagePath = `cmo/step4-storage-tests/${new Date().toISOString().slice(0, 10)}/${poster.name}`;
  publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;

  const start = await audit('storage_upload_test_started', 'Step 4 Supabase Storage upload test started.', {
    storage_provider: 'supabase_storage',
    bucket,
    filename: poster.name,
    content_type: contentType,
    storage_path: `${bucket}/${storagePath}`
  });
  if (start?.id) auditIds.push(start.id);

  const bucketState = await ensureBucket();
  const body = await fs.readFile(poster.full);
  const upload = await storage(`object/${encodeURIComponent(bucket)}/${storagePath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': '3600' },
    body
  });
  if (!upload.ok) throw new Error(`Supabase Storage upload failed: ${upload.status} ${JSON.stringify(upload.body)}`);

  const retrieved = await fetch(publicUrl, { method: 'GET', cache: 'no-store' });
  const retrievedBytes = Buffer.from(await retrieved.arrayBuffer()).length;
  const retrievedContentType = retrieved.headers.get('content-type') || null;
  if (!retrieved.ok) throw new Error(`Supabase Storage public URL retrieval failed: ${retrieved.status}`);
  if (!retrievedBytes) throw new Error('Supabase Storage public URL returned empty file.');

  const metadata = {
    storage_provider: 'supabase_storage',
    bucket,
    bucket_created: bucketState.created,
    bucket_public: true,
    filename: poster.name,
    content_type: contentType,
    upload_timestamp: new Date().toISOString(),
    storage_path: `${bucket}/${storagePath}`,
    public_url: publicUrl,
    source_file_size: poster.size,
    retrieved_bytes: retrievedBytes,
    retrieved_content_type: retrievedContentType
  };
  const success = await audit('storage_upload_test_succeeded', 'Step 4 Supabase Storage upload and public retrieval test succeeded.', metadata);
  if (success?.id) auditIds.push(success.id);
  await updateStorageIntegration('live', null, {
    storage_provider: 'supabase_storage',
    bucket,
    endpoint_verified: true,
    bucket_verified: true,
    credentials_verified: true,
    public_url_verified: true,
    audit_event_prefix: 'storage_upload',
    latest_upload: metadata
  });

  console.log(JSON.stringify({ ok: true, status: 'live', provider: 'supabase_storage', uploaded_file_url: publicUrl, audit_ids: auditIds }, null, 2));
} catch (error) {
  const message = error?.message || 'Supabase Storage upload test failed';
  const failed = await audit('storage_upload_test_failed', message, { storage_provider: 'supabase_storage', public_url: publicUrl }, 'medium').catch(() => null);
  if (failed?.id) auditIds.push(failed.id);
  await updateStorageIntegration('error', message, { storage_provider: 'supabase_storage', public_url: publicUrl }).catch(() => null);
  console.log(JSON.stringify({ ok: false, status: 'error', provider: 'supabase_storage', error: message, audit_ids: auditIds }, null, 2));
  process.exitCode = 1;
}
