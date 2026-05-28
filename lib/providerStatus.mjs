import { getCtoProviderSecret } from './ctoProviderVault.mjs';

const outputs = [
  'Instagram caption',
  'Facebook caption',
  'LinkedIn copy',
  'Hashtags',
  'Image prompt'
];

const openAIModel = process.env.OPENAI_STATUS_MODEL?.trim() || process.env.OPENAI_CONTENT_PREMIUM_MODEL?.trim() || 'gpt-5.5';

function baseProviderStatus(providerKey, status = 'pending') {
  return {
    provider_key: providerKey,
    platform_key: providerKey,
    platform_name: providerKey === 'openai' ? 'OpenAI' : providerKey,
    status,
    source: 'cto_provider_vault',
    model: providerKey === 'openai' ? openAIModel : null,
    latency_ms: null,
    last_checked_at: new Date().toISOString(),
    last_success_at: null,
    error_message: null,
    validated: false,
    outputs: providerKey === 'openai' ? outputs : []
  };
}

function safeOpenAIError(response, body = {}) {
  const code = body?.error?.code || body?.error?.type || '';
  const message = String(body?.error?.message || '').toLowerCase();
  if (response.status === 401 || response.status === 403) return 'Invalid API key';
  if (response.status === 429) return 'Rate limit exceeded';
  if (response.status === 404 || code === 'model_not_found' || message.includes('model')) return 'Model unavailable';
  return 'API request failed';
}

function extractText(body = {}) {
  if (typeof body.output_text === 'string') return body.output_text;
  const messageText = body.output?.flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .join('')
    .trim();
  if (messageText) return messageText;
  return body.choices?.map((choice) => choice.message?.content || choice.text || '').join('').trim() || '';
}

async function writeProviderAudit(action, status) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.log('[provider-audit]', JSON.stringify({ action, provider_key: status.provider_key, status: status.status, error_message: status.error_message || null }));
    return;
  }
  try {
    await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        action_type: action,
        module: 'CTO Provider Vault',
        related_table: 'provider_vault',
        actor: 'Provider Status Resolver',
        description: status.error_message || `${status.provider_key} provider status ${status.status}.`,
        risk_level: status.status === 'live' ? 'Low' : 'High',
        metadata: {
          provider_key: status.provider_key,
          source: status.source,
          validated: status.validated,
          latency_ms: status.latency_ms,
          model: status.model
        }
      })
    });
  } catch {
    console.log('[provider-audit-failed]', JSON.stringify({ action, provider_key: status.provider_key, status: status.status }));
  }
}

async function validateOpenAI(context = 'provider_status') {
  const providerStatus = baseProviderStatus('openai', 'pending');
  const providerSecret = getCtoProviderSecret('openai');
  if (!providerSecret.ok) {
    const missing = {
      ...providerStatus,
      status: 'error',
      error_message: 'OpenAI key missing in CTO provider vault.'
    };
    await writeProviderAudit(context === 'cmo_step_2' ? 'CMO Step 2 reads provider error' : 'OpenAI key missing', missing);
    return missing;
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${providerSecret.secret}` }
    });
    const latency = Date.now() - started;
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const failed = {
        ...providerStatus,
        status: 'error',
        latency_ms: latency,
        error_message: safeOpenAIError(response, body)
      };
      await writeProviderAudit('OpenAI provider validation failed', failed);
      return failed;
    }

    if (!Array.isArray(body.data)) {
      const failed = {
        ...providerStatus,
        status: 'error',
        latency_ms: latency,
        error_message: 'API request failed'
      };
      await writeProviderAudit('OpenAI provider validation failed', failed);
      return failed;
    }

    const live = {
      ...providerStatus,
      status: 'live',
      latency_ms: latency,
      last_success_at: new Date().toISOString(),
      validated: true
    };
    await writeProviderAudit('OpenAI provider validated live', live);
    return live;
  } catch {
    const failed = {
      ...providerStatus,
      status: 'error',
      latency_ms: Date.now() - started,
      error_message: 'API request failed'
    };
    await writeProviderAudit('OpenAI provider validation failed', failed);
    return failed;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getProviderStatus(providerKey, options = {}) {
  const key = String(providerKey || '').trim().toLowerCase();
  if (key === 'openai') return validateOpenAI(options.context || 'provider_status');
  return {
    ...baseProviderStatus(key || 'unknown', 'error'),
    error_message: 'API request failed'
  };
}
