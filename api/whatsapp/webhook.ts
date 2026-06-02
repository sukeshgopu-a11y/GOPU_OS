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

function twiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${message}</Message></Response>`;
}

async function sendSlackNotification(text: string) {
  const webhookUrl = env("SLACK_WEBHOOK_URL");
  const botToken = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL") || "#approvals";

  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return;
  }

  if (botToken) {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify({ channel, text }),
    });
  }
}

function appBaseUrl(req: any) {
  const configured = env("APP_BASE_URL") || env("SITE_URL") || env("NEXT_PUBLIC_SITE_URL") || env("VERCEL_URL");
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return host ? `${proto}://${host}` : "";
}

async function runLeadRelease(req: any, approvalId: string) {
  const baseUrl = appBaseUrl(req);
  if (!baseUrl || !approvalId) {
    return { ok: false, skipped: true, reason: "missing_app_base_url_or_approval_id" };
  }
  try {
    const response = await fetch(`${baseUrl}/api/director/approve-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval_id: approvalId, note: "Approved via WhatsApp" }),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok && body?.ok !== false, status: response.status, ...body };
  } catch (error) {
    return { ok: false, status: "release_failed", message: error instanceof Error ? error.message : "Lead release failed." };
  }
}

export default async function handler(req: any, res: any) {
  // Handle GET for webhook verification
  if (req.method === "GET") {
    return res.status(200).send("OK");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  // Parse form-encoded body from Twilio
  let body: string = "";
  if (typeof req.body === "string") {
    body = req.body;
  } else if (req.body && typeof req.body === "object") {
    // bodyParser may have already parsed it as an object
    body = new URLSearchParams(req.body).toString();
  }

  const params = new URLSearchParams(body);
  const messageText = (params.get("Body") || "").trim();
  const from = params.get("From") || "";
  const to = params.get("To") || "";

  console.log("WhatsApp webhook received:", { messageText, from, to });

  const upper = messageText.toUpperCase();
  const approveMatch = upper.match(/^APPROVE\s+(.+)$/);
  const rejectMatch = upper.match(/^REJECT\s+(.+)$/);

  if (!approveMatch && !rejectMatch) {
    // Not a recognized command — respond with neutral TwiML
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twiml("Message received. Send APPROVE {id} or REJECT {id} to process an approval."));
  }

  const isApprove = !!approveMatch;
  // Extract approval_id preserving original casing from message (not upper)
  const idIndex = isApprove
    ? messageText.toUpperCase().indexOf("APPROVE ") + "APPROVE ".length
    : messageText.toUpperCase().indexOf("REJECT ") + "REJECT ".length;
  const approval_id = messageText.slice(idIndex).trim();
  const newStatus = isApprove ? "Approved" : "Rejected";

  const supabase = getSupabase();

  let approvalRecord: any = null;
  let releaseResult: any = null;

  if (supabase) {
    // Fetch approval record before updating (for buyer_name in Slack message)
    const { data: fetchedRecord } = await supabase
      .from("founder_approvals")
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .eq("id", approval_id)
      .single();

    approvalRecord = fetchedRecord;

    const decidedAt = new Date().toISOString();

    // Update approval status
    await supabase
      .from("founder_approvals")
      .update({
        status: newStatus,
        approval_status: newStatus,
        decision_note: isApprove ? "Approved via WhatsApp" : "Rejected via WhatsApp",
        decided_by: "Director WhatsApp",
        decided_at: decidedAt,
        updated_at: decidedAt,
      })
      .eq("tenant_id", TENANT_ID)
      .eq("id", approval_id);

    if (isApprove) {
      releaseResult = await runLeadRelease(req, approval_id);
    }

    // Log to agent_decisions
    await supabase.from("agent_decisions").insert({
      tenant_id: TENANT_ID,
      agent: "CTO",
      decision_type: isApprove ? "whatsapp_approval_approved" : "whatsapp_approval_rejected",
      context: { approval_id, from, status: newStatus, release_result: releaseResult },
      created_at: new Date().toISOString(),
    });
  }

  // Send Slack notification
  try {
    if (isApprove) {
      const buyerName = approvalRecord?.buyer_name || "Unknown Buyer";
      const releaseText = releaseResult?.ok
        ? "Buyer email/proforma release started."
        : `Buyer release not completed: ${releaseResult?.reason || releaseResult?.message || releaseResult?.status || "unknown"}`;
      await sendSlackNotification(`✅ Director approved via WhatsApp: ${buyerName} — ${approval_id}\n${releaseText}`);
    } else {
      await sendSlackNotification(`❌ Director rejected via WhatsApp: ${approval_id}`);
    }
  } catch (slackErr) {
    console.error("Slack notification failed:", slackErr);
  }

  res.setHeader("Content-Type", "text/xml");
  return res.status(200).send(twiml(`✅ Action processed for approval ${approval_id}`));
}
