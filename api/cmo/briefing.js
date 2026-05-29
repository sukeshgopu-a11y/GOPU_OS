import { getSupabaseClient } from '../../lib/marketingAgentRouter.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, status: 'method_not_allowed' });
  }

  const client = getSupabaseClient();
  if (!client) {
    return res.status(200).json({ ok: true, briefings: [], _fallback: true });
  }

  const { data, error } = await client
    .from('agent_messages')
    .select('id,payload,created_at')
    .eq('message_type', 'daily_briefing')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return res.status(200).json({ ok: false, status: 'db_read_failed', message: error.message });
  }

  return res.status(200).json({ ok: true, briefings: data || [] });
}
