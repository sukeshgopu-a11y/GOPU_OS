// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
function env(k: string) { return process.env[k]?.trim() || ""; }
function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { approval_id, buyer_name, product, quantity, amount, currency } = req.body || {};

  if (!approval_id || !buyer_name || !product || !quantity || !amount || !currency) {
    return res.status(400).json({ error: "Missing required fields: approval_id, buyer_name, product, quantity, amount, currency" });
  }

  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_WHATSAPP_FROM");
  const to = env("DIRECTOR_WHATSAPP_NUMBER");

  if (!accountSid || !authToken || !from || !to) {
    // Log skipped attempt
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("agent_decisions").insert({
        tenant_id: TENANT_ID,
        agent: "CTO",
        decision_type: "whatsapp_approval_sent",
        context: { approval_id, buyer_name, product, quantity, amount, currency, skipped: true, reason: "twilio_not_configured" },
        created_at: new Date().toISOString(),
      });
    }
    return res.status(200).json({ ok: true, skipped: true, reason: "twilio_not_configured" });
  }

  const messageBody = `🏢 *GOPU OS — Director Approval Required*

📋 *Approval ID:* ${approval_id}
👤 *Buyer:* ${buyer_name}
📦 *Product:* ${product} — ${quantity}
💰 *Amount:* ${currency} ${amount}

Reply *APPROVE ${approval_id}* or *REJECT ${approval_id}*`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  let messageSid: string | null = null;
  let sent = false;

  try {
    const params = new URLSearchParams();
    params.append("From", from);
    params.append("To", to);
    params.append("Body", messageBody);

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio error:", twilioData);
      return res.status(502).json({ ok: false, error: "Twilio API error", details: twilioData });
    }

    messageSid = twilioData.sid;
    sent = true;
  } catch (err: any) {
    console.error("Failed to send WhatsApp message:", err);
    return res.status(500).json({ ok: false, error: "Failed to send WhatsApp message", details: err?.message });
  }

  // Log to agent_decisions
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from("agent_decisions").insert({
      tenant_id: TENANT_ID,
      agent: "CTO",
      decision_type: "whatsapp_approval_sent",
      context: { approval_id, buyer_name, product, quantity, amount, currency, message_sid: messageSid, sent },
      created_at: new Date().toISOString(),
    });
  }

  return res.status(200).json({ ok: true, message_sid: messageSid, sent });
}
