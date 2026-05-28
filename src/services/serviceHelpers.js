import { backendStatus, isSupabaseConfigured, requireSupabase } from '../lib/supabaseClient.js';

function cleanError(error, tableName) {
  return {
    ok: false,
    data: [],
    error: {
      code: error?.code || 'SUPABASE_QUERY_FAILED',
      message: error?.message || `Unable to load ${tableName}.`
    },
    backend: backendStatus
  };
}

export function createTableService(tableName, fallback = []) {
  return {
    async list(filters = {}) {
      const { client, error } = requireSupabase();
      if (error) return { ok: true, data: [], error: null, backend: backendStatus };

      let query = client.from(tableName).select('*');
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'All') query = query.eq(key, value);
      });

      const { data, error: queryError } = await query;
      if (queryError) return cleanError(queryError, tableName);
      return { ok: true, data: data || [], error: null, backend: backendStatus };
    },

    async getById(id) {
      const { client, error } = requireSupabase();
      if (error) return { ok: true, data: null, error: null, backend: backendStatus };

      const { data, error: queryError } = await client.from(tableName).select('*').eq('id', id).maybeSingle();
      if (queryError) return cleanError(queryError, tableName);
      return { ok: true, data, error: null, backend: backendStatus };
    },

    async create(payload) {
      const { client, error } = requireSupabase();
      if (error) return { ok: false, data: null, error, backend: backendStatus };

      const { data, error: queryError } = await client.from(tableName).insert(payload).select('*').single();
      if (queryError) return cleanError(queryError, tableName);
      return { ok: true, data, error: null, backend: backendStatus };
    },

    async update(id, payload) {
      const { client, error } = requireSupabase();
      if (error) return { ok: false, data: null, error, backend: backendStatus };

      const { data, error: queryError } = await client.from(tableName).update(payload).eq('id', id).select('*').single();
      if (queryError) return cleanError(queryError, tableName);
      return { ok: true, data, error: null, backend: backendStatus };
    }
  };
}
