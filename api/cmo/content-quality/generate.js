import { generateManualContent } from '../../../lib/contentQualityEngine.mjs';
import { ensureCmoCanvaDesignForApproval } from '../../../lib/cmoChatGPTImageWorkflow.mjs';
import { createClient } from '@supabase/supabase-js';

function env(name) {
  return process.env[name]?.trim() || '';
}

function getClient() {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, status: 'method_not_allowed' });
    return;
  }

  let payload = req.body || {};
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      res.status(400).json({ ok: false, status: 'invalid_payload', message: 'Invalid content generation payload.' });
      return;
    }
  }

  const result = await generateManualContent(payload);
  const shouldGenerateImage = payload.generate_image === true || payload.generateImage === true || payload.generate_canva === true || payload.generateCanva === true;

  if (result?.ok && shouldGenerateImage && result.content_history_id) {
    const client = getClient();
    if (client) {
      const latest = await client.from('content_history').select('*').eq('id', result.content_history_id).maybeSingle();
      if (!latest.error && latest.data) {
        const imageResult = await ensureCmoCanvaDesignForApproval(latest.data, { client, force: payload.force_canva === true || payload.forceCanva === true || payload.force_image === true });
        result.chatgpt_image = { ok: imageResult.ok, status: imageResult.status, message: imageResult.message || '', missing: imageResult.missing || [] };
        result.content_history = imageResult.content_history || latest.data;
        result.image_url = imageResult.content_history?.image_url || imageResult.content_history?.poster_url || '';
        result.generated_content.generated_image_url = result.image_url;
      }
    } else {
      result.chatgpt_image = { ok: false, status: 'not_configured', message: 'Supabase server env is missing.' };
    }
  }

  res.status(200).json(result);
}
