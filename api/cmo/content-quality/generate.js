import { generateManualContent } from '../../../lib/contentQualityEngine.mjs';

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
  res.status(200).json(result);
}
