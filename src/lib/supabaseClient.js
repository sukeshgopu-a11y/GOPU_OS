import { createClient } from '@supabase/supabase-js';

const viteEnv = import.meta.env || {};
const supabaseUrl = viteEnv.NEXT_PUBLIC_SUPABASE_URL || viteEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = viteEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || viteEnv.VITE_SUPABASE_ANON_KEY || viteEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigStatus = {
  hasUrl: Boolean(supabaseUrl),
  hasAnonKey: Boolean(supabaseAnonKey),
  projectUrl: supabaseUrl || '',
  projectRef: supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1] || ''
};

export const backendStatus = {
  mode: isSupabaseConfigured ? 'Connected' : 'Integration Pending',
  message: isSupabaseConfigured ? 'Supabase credentials configured. Live connection active.' : 'Supabase integration pending - project URL and anon key required.'
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'gopu-export-os-auth'
      }
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    return {
      client: null,
      error: {
        code: 'SUPABASE_NOT_CONFIGURED',
        message: 'Supabase credentials are not configured. Live integration is pending.'
      }
    };
  }

  return { client: supabase, error: null };
}

export async function requireSupabaseSession() {
  const { client, error } = requireSupabase();
  if (error) return { client: null, session: null, error };

  try {
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      return {
        client: null,
        session: null,
        error: {
          code: sessionError.code || 'SUPABASE_SESSION_ERROR',
          message: sessionError.message || 'Unable to verify the Supabase session.'
        }
      };
    }

    if (!data?.session) {
      return {
        client: null,
        session: null,
        error: {
          code: 'SUPABASE_SESSION_REQUIRED',
          message: 'Supabase credentials are configured, but no Supabase session is active.'
        }
      };
    }

    return { client, session: data.session, error: null };
  } catch (sessionError) {
    return {
      client: null,
      session: null,
      error: {
        code: 'SUPABASE_SESSION_ERROR',
        message: sessionError?.message || 'Unable to verify the Supabase session.'
      }
    };
  }
}

export async function checkSupabaseConnection(tableName = 'platform_health') {
  if (!supabaseUrl) {
    return {
      live: false,
      mode: 'Integration Pending',
      status: 'Missing Project URL',
      health: 'Configuration Missing',
      message: 'VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not configured.',
      lastChecked: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      projectRef: ''
    };
  }

  if (!supabaseAnonKey) {
    return {
      live: false,
      mode: 'Integration Pending',
      status: 'Missing Anon Key',
      health: 'Configuration Missing',
      message: 'Supabase project URL exists, but VITE_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY or publishable key env is missing.',
      lastChecked: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      projectRef: supabaseConfigStatus.projectRef
    };
  }

  const { client, error } = requireSupabase();
  if (error) {
    return {
      live: false,
      mode: 'Integration Pending',
      status: 'Client Not Ready',
      health: 'Configuration Missing',
      message: error.message,
      lastChecked: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      projectRef: supabaseConfigStatus.projectRef
    };
  }

  const checkedAt = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();

    const { error: queryError, status, count } = await client
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (queryError) {
      const isRlsBlocked = queryError.code === '42501' || status === 401 || status === 403;
      return {
        live: false,
        mode: isRlsBlocked ? 'Verification Required' : 'Error',
        status: isRlsBlocked ? 'Verification Required' : 'Error Detected',
        health: isRlsBlocked ? 'Auth Required' : 'Connection Error',
        message: isRlsBlocked
          ? `Supabase is configured, but ${tableName} is not readable with the current session. Sign in or expose the CTO health table through RLS. (${queryError.code || status || 'unknown'})`
          : `${queryError.message} (${queryError.code || status || 'unknown'})`,
        lastChecked: checkedAt,
        projectRef: supabaseConfigStatus.projectRef
      };
    }

    const authNote = sessionError
      ? ` Auth session check warning: ${sessionError.message}`
      : sessionData?.session
        ? ' Founder session restored.'
        : ' Public CTO health read verified; founder sign-in still required for protected writes.';

    return {
      live: true,
      mode: 'Live Connected',
      status: 'Live Connected',
      health: 'Healthy',
      message: `Supabase Data API responded from ${tableName}${typeof count === 'number' ? ` (${count} rows visible)` : ''}.${authNote}`,
      lastChecked: checkedAt,
      projectRef: supabaseConfigStatus.projectRef
    };
  } catch (error) {
    return {
      live: false,
      mode: 'Error',
      status: 'Network Error',
      health: 'Connection Error',
      message: error?.message || 'Supabase connection check failed.',
      lastChecked: checkedAt,
      projectRef: supabaseConfigStatus.projectRef
    };
  }
}

export async function getCurrentSession() {
  if (!supabase) return { session: null, user: null, error: null };
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session || null, user: data?.session?.user || null, error };
}

export async function getCurrentUser() {
  if (!supabase) return { user: null, error: null };
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user || null, error };
}

export async function signInWithPassword(email, password) {
  const { client, error } = requireSupabase();
  if (error) return { data: null, error };
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

export async function sendPasswordReset(email) {
  const { client, error } = requireSupabase();
  if (error) return { data: null, error };
  return client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`
  });
}
