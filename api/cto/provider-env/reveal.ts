// @ts-nocheck
import { getCtoProviderSecret } from "../../../lib/ctoProviderVault.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const { fieldId } = req.body || {};
  if (!fieldId || typeof fieldId !== "string") {
    return res.status(400).json({ ok: false, error: "fieldId required" });
  }

  const resolved = getCtoProviderSecret(fieldId);
  if (!resolved.ok) {
    return res.status(404).json({ ok: false, error: "not_configured" });
  }

  return res.status(200).json({ ok: true, value: resolved.secret, source: resolved.source });
}
