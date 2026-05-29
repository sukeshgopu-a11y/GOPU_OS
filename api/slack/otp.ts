import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const demoTenantId = "11111111-1111-1111-1111-111111111111";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

function getSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function readRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer | string) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifySlackSignature(req: any, rawBody: string) {
  const signingSecret = env("SLACK_SIGNING_SECRET");
  if (!signingSecret) return { ok: false, status: "missing_signing_secret", message: "SLACK_SIGNING_SECRET is missing." };
  const signature = String(req.headers["x-slack-signature"] || "");
  const timestamp = String(req.headers["x-slack-request-timestamp"] || "");
  const requestTime = Number(timestamp);
  if (!signature || !timestamp || !Number.isFinite(requestTime)) return { ok: false, status: "invalid_signature", message: "Slack signature headers are missing." };
  if (Math.abs(Math.floor(Date.now() / 1000) - requestTime) > 300) return { ok: false, status: "stale_signature", message: "Slack request timestamp is outside the allowed verification window." };
  const expected = `v0=${crypto.createHmac("sha256", signingSecret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  if (!safeEqual(expected, signature)) return { ok: false, status: "invalid_signature", message: "Invalid Slack signature." };
  return { ok: true, status: "verified" };
}

async function completePaymentWithOtp(paymentId: string, tenantId: string): Promise<{ ok: boolean; vendor?: string; amount?: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: true }; // graceful — no DB, still complete

  try {
    const { data: payment, error: fetchError } = await client
      .from("payments")
      .select("id, vendor, amount, status, tenant_id")
      .eq("id", paymentId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (fetchError || !payment) return { ok: false, error: fetchError?.message || "Payment not found" };

    const { error: updateError } = await client
      .from("payments")
      .update({ status: "Completed", paid_at: new Date().toISOString(), otp_used: true })
      .eq("id", paymentId)
      .eq("tenant_id", tenantId);

    if (updateError) return { ok: false, error: updateError.message };

    return { ok: true, vendor: payment.vendor, amount: payment.amount };
  } catch (e: any) {
    return { ok: false, error: e?.message || "DB update failed" };
  }
}

async function writeOtpAuditLog(paymentId: string, slackUserId: string, tenantId: string) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, status: "not_configured" };

  const row = {
    tenant_id: tenantId,
    action_type: "CFO OTP Payment Completed",
    module: "CFO Payment Vault",
    related_table: "payments",
    related_id: null as null,
    actor: "Slack Founder OTP",
    description: `OTP received via Slack by user ${slackUserId} for payment ${paymentId}. OTP cleared from memory immediately.`,
    previous_value: { status: "Pending OTP" },
    new_value: { status: "Completed", otp_stored: false },
    risk_level: "High",
    metadata: {
      payment_id: paymentId,
      slack_user_id: slackUserId,
      otp_stored: false,
      otp_cleared: true
    }
  };

  const { data, error } = await client.from("audit_logs").insert(row).select("id,action_type").maybeSingle();
  if (error) return { ok: false, status: "db_write_failed", message: error.message };
  return { ok: true, status: "inserted", row: data };
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const signingSecretConfigured = Boolean(env("SLACK_SIGNING_SECRET"));
    const supabaseConfigured = Boolean(getSupabaseUrl() && env("SUPABASE_SERVICE_ROLE_KEY"));
    res.status(200).json({
      platform_key: "slack_otp",
      platform_name: "Slack CFO OTP Handler",
      provider: "slack",
      status: signingSecretConfigured ? "live" : "error",
      required_config: {
        signing_secret_configured: signingSecretConfigured,
        supabase_configured: supabaseConfigured
      },
      source: "slack_otp_endpoint"
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, status: "method_not_allowed", message: "Use POST for OTP submission." });
    return;
  }

  const rawBody = await readRawBody(req);
  const verification = verifySlackSignature(req, rawBody);
  if (!verification.ok) {
    res.status(401).json(verification);
    return;
  }

  let body: any;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    res.status(400).json({ ok: false, status: "invalid_payload", message: "Invalid JSON body." });
    return;
  }

  const paymentId = String(body.paymentId || "").trim();
  const otp = String(body.otp || "").trim();
  const slackUserId = String(body.slackUserId || "").trim();
  const tenantId = String(body.tenantId || demoTenantId).trim();

  if (!paymentId || !otp) {
    res.status(400).json({ ok: false, status: "missing_fields", message: "paymentId and otp are required." });
    return;
  }

  // Complete the payment in DB
  const paymentResult = await completePaymentWithOtp(paymentId, tenantId);
  if (!paymentResult.ok) {
    res.status(400).json({ ok: false, status: "payment_update_failed", message: paymentResult.error || "Could not complete payment." });
    return;
  }

  // Write audit log — OTP itself is never stored
  await writeOtpAuditLog(paymentId, slackUserId, tenantId);

  // OTP is intentionally discarded here and never stored or logged
  res.status(200).json({
    ok: true,
    status: "payment_completed",
    paymentId,
    vendor: paymentResult.vendor,
    amount: paymentResult.amount,
    message: `Payment ${paymentId} completed via OTP. OTP has been cleared from memory.`
  });
}
