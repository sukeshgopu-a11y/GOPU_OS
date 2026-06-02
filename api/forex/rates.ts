// @ts-nocheck
import { FOREX_REFRESH_MS, getForexRates } from "../../lib/forexRates.mjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  const force = ["1", "true", "live"].includes(String(req.query?.force || "").toLowerCase());
  const snapshot = await getForexRates({ force });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ...snapshot,
    refresh_interval_minutes: FOREX_REFRESH_MS / 60000
  });
}
