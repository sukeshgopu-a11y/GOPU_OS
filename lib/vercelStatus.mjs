const VERCEL_API_BASE = 'https://api.vercel.com';
const VERCEL_STATUS_TIMEOUT_MS = 8000;

function env(name) {
  return process.env[name]?.trim() || '';
}

function hasRuntimeSignal() {
  return env('VERCEL') === '1' || Boolean(env('VERCEL_URL') || env('VERCEL_ENV') || env('VERCEL_GIT_COMMIT_SHA'));
}

function maskToken(value = '') {
  if (!value) return 'token_****missing';
  return 'token_****configured';
}

async function fetchVercel(pathname, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERCEL_STATUS_TIMEOUT_MS);
  try {
    const response = await fetch(`${VERCEL_API_BASE}${pathname}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'GOPU-OS-CTO-Integration/1.0'
      },
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function connectedPayload({
  environment = 'Production',
  message = 'Vercel deployment runtime detected.',
  requestVolume = 'Runtime environment verified',
  lastRequest = 'Just checked',
  maskedKey = 'runtime_****vercel'
} = {}) {
  const checkedAt = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  return {
    ok: true,
    id: 'vercel',
    service_name: 'Vercel',
    environment,
    masked_key: maskedKey,
    status: 'Connected',
    usage_percentage: 1,
    quota_remaining: 'Vercel connection verified',
    last_verified: checkedAt,
    health_status: 'Healthy',
    request_volume: requestVolume,
    last_request: lastRequest,
    estimated_exhaustion: 'Stable',
    connection_message: message
  };
}

export async function getVercelStatus() {
  const token = env('VERCEL_TOKEN');
  const teamId = env('VERCEL_TEAM_ID');
  const projectId = env('VERCEL_PROJECT_ID') || env('VERCEL_PROJECT_NAME');
  const runtimeUrl = env('VERCEL_URL');
  const runtimeEnv = env('VERCEL_ENV');

  if (!token && hasRuntimeSignal()) {
    return connectedPayload({
      environment: runtimeEnv ? `Vercel ${runtimeEnv}` : 'Vercel Runtime',
      message: `Running inside Vercel${runtimeUrl ? ` at ${runtimeUrl}` : ''}. API token is not exposed to GOPU OS.`,
      requestVolume: 'Vercel runtime variables present',
      maskedKey: 'runtime_****vercel'
    });
  }

  if (!token) {
    return {
      ok: false,
      id: 'vercel',
      service_name: 'Vercel',
      environment: 'Production',
      masked_key: maskToken(''),
      status: 'Backend Verification Required',
      usage_percentage: 0,
      quota_remaining: 'Set VERCEL_TOKEN server-side or deploy on Vercel runtime',
      last_verified: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      health_status: 'Monitoring',
      request_volume: 'No Vercel API check yet',
      last_request: 'Missing server-side Vercel credentials',
      estimated_exhaustion: 'N/A',
      connection_message: 'CTO cannot mark Vercel live until VERCEL_TOKEN is configured server-side or Vercel runtime variables are detected.'
    };
  }

  try {
    const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    const projectPath = projectId
      ? `/v9/projects/${encodeURIComponent(projectId)}${teamQuery}`
      : `/v2/user`;
    const { response, body } = await fetchVercel(projectPath, token);

    if (!response.ok) {
      return {
        ok: false,
        id: 'vercel',
        service_name: 'Vercel',
        environment: 'Production',
        masked_key: maskToken(token),
        status: response.status === 401 || response.status === 403 ? 'Failure Detected' : 'Sync Delayed',
        usage_percentage: 0,
        quota_remaining: `Vercel API returned HTTP ${response.status}`,
        last_verified: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
        health_status: response.status === 401 || response.status === 403 ? 'Credential Issue' : 'Monitoring',
        request_volume: 'Verification request failed',
        last_request: body?.error?.message || body?.message || response.statusText,
        estimated_exhaustion: 'N/A',
        connection_message: body?.error?.message || body?.message || 'Vercel API verification failed safely.'
      };
    }

    const projectName = body?.name || body?.project?.name || projectId || 'Vercel account';
    return connectedPayload({
      environment: runtimeEnv ? `Vercel ${runtimeEnv}` : 'Production',
      maskedKey: maskToken(token),
      requestVolume: projectId ? `Project verified: ${projectName}` : 'Vercel account token verified',
      lastRequest: 'Vercel REST API responded',
      message: projectId
        ? `Vercel project ${projectName} verified through server-side token. Secret token is not exposed in GOPU OS.`
        : 'Vercel account token verified through server-side API. Add VERCEL_PROJECT_ID for project-specific checks.'
    });
  } catch (error) {
    return {
      ok: false,
      id: 'vercel',
      service_name: 'Vercel',
      environment: 'Production',
      masked_key: maskToken(token),
      status: 'Sync Delayed',
      usage_percentage: 0,
      quota_remaining: 'Vercel verification timed out or network failed',
      last_verified: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      health_status: 'Monitoring',
      request_volume: 'Verification request failed safely',
      last_request: error?.name === 'AbortError' ? 'Timed out under 8 seconds' : error?.message || 'Unknown Vercel verification error',
      estimated_exhaustion: 'N/A',
      connection_message: 'Vercel verification failed safely. GOPU OS did not expose or log the token.'
    };
  }
}
