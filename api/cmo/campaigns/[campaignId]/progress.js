import { getSupabaseClient } from '../../../../lib/marketingAgentRouter.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, status: 'method_not_allowed' });
  }

  const { campaignId } = req.query || {};
  if (!campaignId) {
    return res.status(400).json({ ok: false, message: 'Campaign ID required' });
  }

  const currentValue = Number(req.body?.current_value);
  if (!Number.isFinite(currentValue)) {
    return res.status(400).json({ ok: false, message: 'current_value required' });
  }

  const client = getSupabaseClient();
  if (!client) {
    return res.status(503).json({ ok: false, message: 'Supabase not configured' });
  }

  const { data: campaign, error: readError } = await client
    .from('cmo_campaigns')
    .select('target_value')
    .eq('id', campaignId)
    .maybeSingle();

  if (readError) {
    return res.status(200).json({ ok: false, status: 'db_read_failed', message: readError.message });
  }

  const updates = { current_value: currentValue };
  if (campaign && currentValue >= Number(campaign.target_value || 0)) {
    updates.status = 'completed';
    updates.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await client
    .from('cmo_campaigns')
    .update(updates)
    .eq('id', campaignId);

  if (updateError) {
    return res.status(200).json({ ok: false, status: 'db_update_failed', message: updateError.message });
  }

  return res.status(200).json({ ok: true, current_value: currentValue, completed: updates.status === 'completed' });
}
