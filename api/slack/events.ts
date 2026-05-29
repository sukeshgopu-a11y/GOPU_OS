// @ts-nocheck
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { runPricingEngine } from "../../src/services/pricingEngineService.js";

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
    auth: { persistSession: false, autoRefreshToken: false },
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

function normalizeText(value: unknown, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function labelValue(text = "", labels: string[] = []) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // Match "label: value" OR "label value" (space-separated, start of line)
  const re = new RegExp(`(?:^|[\\n,;|])\\s*(?:${escaped})\\s*[:=-]?\\s*([^\\n,;|]+)`, "i");
  const match = String(text).match(re);
  return normalizeText(match?.[1] || "");
}

function extractEmail(text = "") {
  return normalizeText(String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "");
}

function extractLeadQuantity(text = "") {
  const explicit = labelValue(text, ["quantity", "qty"]);
  const source = explicit || text;
  const match = String(source).match(/(\d+(?:\.\d+)?)\s*(feet container|foot container|20ft|40ft|metric tons?|tons?|tonnes?|mt|kg|kgs|bags|cartons|boxes|containers?)?/i);
  const rawUnit = normalizeText(match?.[2] || labelValue(text, ["unit", "uom"]) || "mt").toLowerCase();
  const unit = /feet container|foot container|20ft|40ft/.test(rawUnit) ? "container" : rawUnit || "mt";
  return {
    value: match ? Number(match[1]) : null,
    unit,
  };
}

function inferProductAndDestination(text = "") {
  const compact = normalizeText(text);
  const match = compact.match(/(?:new lead|lead|quote|enquiry)?\s*(?:for\s+)?(?:(\d+(?:\.\d+)?)\s*(?:metric tons?|tons?|tonnes?|mt|kg|kgs|bags|cartons|boxes|containers?)\s+(?:of\s+)?)?([a-z][a-z0-9 &/-]{2,}?)(?:\s+(?:to|for|destination)\s+)([a-z][a-z .-]{2,})(?:$|[,.])/i);
  return {
    product: normalizeText(match?.[2] || ""),
    destination: normalizeText(match?.[3] || ""),
  };
}

function extractLeadName(text = "") {
  // Match "Lead <name>" at start of message (no colon needed)
  const match = String(text).match(/(?:^|\n)\s*lead\s+([A-Za-z][^\n]+)/i);
  return normalizeText(match?.[1] || "");
}

function parseSlackLead(text = "", event: Record<string, any> = {}) {
  const inferred = inferProductAndDestination(text);
  const qty = extractLeadQuantity(text);
  const buyerName = labelValue(text, ["buyer", "buyer name", "contact", "name"]) || extractLeadName(text) || normalizeText(event.user ? `Slack user ${event.user}` : "Slack lead");
  const companyName = labelValue(text, ["company", "company name", "importer"]) || buyerName;
  const product = labelValue(text, ["product", "item", "commodity"]) || inferred.product || "Requested product";
  const destinationCountry = labelValue(text, ["destination", "country", "to", "market"]) || inferred.destination || "Not provided";
  return {
    id: crypto.randomUUID(),
    tenant_id: demoTenantId,
    source: "Slack",
    buyer_name: buyerName,
    company_name: companyName,
    country: destinationCountry,
    destination_country: destinationCountry,
    email: labelValue(text, ["email"]) || extractEmail(text),
    phone: labelValue(text, ["phone", "mobile", "whatsapp"]),
    product,
    quantity: qty.value || 1,
    unit: qty.unit || "mt",
    unit_of_measure: qty.unit || "mt",
    destination_port: labelValue(text, ["port", "destination port"]),
    shipping_mode: labelValue(text, ["shipping", "mode", "shipping mode"]) || "Sea freight",
    incoterm: (labelValue(text, ["incoterm", "terms"]) || "FOB").toUpperCase(),
    currency: (labelValue(text, ["currency"]) || "USD").toUpperCase(),
    status: "Pending COO Verification",
    assigned_to: "COO Command",
    notes: normalizeText(text),
    source_channel: event.channel || "",
    source_thread_ts: event.thread_ts || event.ts || "",
  };
}

function isLeadMessage(text = "") {
  return /(?:^|\n)\s*(?:new\s+lead|lead\b|buyer\b|product\b|quote|enquiry|inquiry|pricing)/i.test(text);
}

function isMarketingCommand(text = "") {
  return /\b(promote|grow|boost|campaign|get\s+\d+\s+followers|increase\s+followers|social\s+media|run\s+ads?|digital\s+marketing|get\s+likes|grow\s+page)\b/i.test(text)
    && !isLeadMessage(text);
}

function isGopuSystemReply(text = "") {
  return /GOPU OS Slack lead received|GOPU OS Marketing Command Received|GOPU OS could not process|No quote, posting, or final invoice|Codex verified Slack outbound|Slack Connection Test/i.test(text);
}

function parseMarketingCommand(text = "") {
  const lower = text.toLowerCase();
  const platforms = ['instagram', 'linkedin', 'youtube', 'facebook', 'twitter'];
  const platform = platforms.find(p => lower.includes(p)) || 'Instagram';
  const goalTypes = ['followers', 'likes', 'reach', 'engagement', 'views'];
  const goalType = goalTypes.find(g => lower.includes(g)) || 'followers';
  const targetMatch = text.match(/(\d[\d,]*)\s*(?:followers?|likes?|reach|views?)/i);
  const targetValue = targetMatch ? parseInt(targetMatch[1].replace(/,/g, ''), 10) : 1000;
  const actions = ['promote', 'boost', 'grow', 'increase', 'run'];
  const action = actions.find(a => lower.includes(a)) || 'promote';
  const budgetMatch = text.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)/i);
  const budgetHint = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, ''), 10) : null;
  return { platform, goalType, targetValue, action, budgetHint, rawText: text };
}

function estimateBudget(platform: string, targetValue: number) {
  const cpf: Record<string, number> = { instagram: 0.8, facebook: 0.5, linkedin: 3, youtube: 1.2 };
  const rate = cpf[platform?.toLowerCase()] || 1;
  return Math.max(200, Math.min(Math.ceil((targetValue || 1000) * rate), 5000));
}

async function getOrCreateWallet(client: any) {
  const { data } = await client.from('cfo_wallet').select('*').eq('tenant_id', demoTenantId).maybeSingle();
  if (data) return data;
  const seed = { tenant_id: demoTenantId, balance: 1000.00, auto_topup_threshold: 100.00, auto_topup_amount: 500.00, transactions: [] };
  const { data: created } = await client.from('cfo_wallet').insert(seed).select('*').maybeSingle();
  return created || seed;
}

async function deductWallet(client: any, campaignId: string, amount: number, description: string) {
  const wallet = await getOrCreateWallet(client);
  const newBalance = Math.max(0, Number(wallet.balance) - amount);
  const tx = { id: crypto.randomUUID(), type: 'spend', amount: -amount, description, campaign_id: campaignId, at: new Date().toISOString() };
  await client.from('cfo_wallet').update({ balance: newBalance, transactions: [...(wallet.transactions || []), tx], updated_at: new Date().toISOString() }).eq('tenant_id', demoTenantId);
  return newBalance;
}

async function processMarketingCommand(event: Record<string, any>, text: string) {
  const client = getSupabaseClient();
  const cmd = parseMarketingCommand(text);
  const campaignId = crypto.randomUUID();
  const budgetRequested = cmd.budgetHint || estimateBudget(cmd.platform, cmd.targetValue);

  if (client) {
    // Create campaign
    await client.from('cmo_campaigns').insert({
      id: campaignId, tenant_id: demoTenantId,
      platform: cmd.platform, goal_type: cmd.goalType, target_value: cmd.targetValue,
      action: cmd.action, status: 'pending_budget', budget_requested: budgetRequested,
      slack_channel: event.channel, slack_thread_ts: event.ts, slack_user_id: event.user,
      metadata: { raw_text: cmd.rawText }
    });

    // COO → CMO
    await client.from('agent_messages').insert({ tenant_id: demoTenantId, campaign_id: campaignId, from_agent: 'COO', to_agent: 'CMO', message_type: 'marketing_command', payload: { cmd }, status: 'processed', processed_at: new Date().toISOString() });

    // CMO → CFO
    await client.from('agent_messages').insert({ tenant_id: demoTenantId, campaign_id: campaignId, from_agent: 'CMO', to_agent: 'CFO', message_type: 'budget_request', payload: { budget_requested: budgetRequested, platform: cmd.platform, goal_type: cmd.goalType, target_value: cmd.targetValue }, status: 'pending' });

    const wallet = await getOrCreateWallet(client);
    const balance = Number(wallet.balance);
    const needsApproval = budgetRequested > 500;

    if (balance >= budgetRequested && !needsApproval) {
      await deductWallet(client, campaignId, budgetRequested, `${cmd.platform} ${cmd.goalType} campaign`);
      await client.from('cmo_campaigns').update({ status: 'active', budget_allocated: budgetRequested, started_at: new Date().toISOString() }).eq('id', campaignId);
      return { campaignId, cmd, budgetRequested, walletStatus: 'auto_approved', balance: balance - budgetRequested };
    }

    await client.from('cmo_campaigns').update({ status: 'pending_founder_approval' }).eq('id', campaignId);
    return { campaignId, cmd, budgetRequested, walletStatus: 'pending_approval', balance, needsApproval };
  }

  return { campaignId, cmd, budgetRequested, walletStatus: 'no_db', balance: 0 };
}

function buildMarketingReply(result: any) {
  const { cmd, budgetRequested, walletStatus, balance, campaignId } = result;
  const lines = [
    `*GOPU OS Marketing Command Received*`,
    `COO understood: ${cmd.action} ${cmd.platform} page`,
    `Goal: Get ${cmd.targetValue.toLocaleString()} ${cmd.goalType}`,
    `Campaign ID: ${campaignId}`,
    '',
    `*Agent Routing*`,
    `COO -> CMO: Marketing command routed`,
    `CMO -> CFO: Budget request raised — ₹${budgetRequested}`
  ];

  if (walletStatus === 'auto_approved') {
    lines.push(`CFO: Auto-approved from Creative Wallet (balance now ₹${balance.toFixed(0)})`);
    lines.push(`CMO: Campaign started`);
    lines.push('');
    lines.push('CMO is now running the campaign. You will receive morning, afternoon and evening briefings with progress updates.');
  } else if (walletStatus === 'pending_approval') {
    lines.push(`CFO: Budget ₹${budgetRequested} requires your approval (>${result.needsApproval ? '₹500 threshold' : 'wallet balance low'})`);
    lines.push('');
    lines.push('Reply with *APPROVE* to authorise the spend, or *REJECT* to cancel.');
    lines.push(`Reference: campaign_id=${campaignId}`);
  } else {
    lines.push('Note: Supabase not configured — campaign tracked locally only.');
  }

  return lines.join('\n');
}

function formatMoney(value: unknown, currency = "USD") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return `${currency} 0`;
  return `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

async function safeInsert(client: any, table: string, payload: Record<string, any>, select = "id") {
  if (!client) return { ok: false, table, message: "Supabase service role env is missing." };
  const { data, error } = await client.from(table).insert(payload).select(select).maybeSingle();
  if (error) return { ok: false, table, message: error.message };
  return { ok: true, table, data };
}

async function sendSlackBotMessage(message: Record<string, any>) {
  const botToken = env("SLACK_BOT_TOKEN");
  const channel = message.channel || env("SLACK_CHANNEL_ID");
  if (!botToken || !channel) return { ok: false, status: "not_configured", message: "Slack bot token or channel id is not configured." };
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...message, channel }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) return { ok: false, status: "slack_api_failed", message: body.error || `HTTP ${response.status}` };
  return { ok: true, status: "sent", channel: body.channel, ts: body.ts };
}

async function upsertSlackStatus(status: "live" | "error", details: Record<string, string> = {}) {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from("integration_services").upsert({
    tenant_id: demoTenantId,
    platform_key: "slack",
    platform_name: "Slack Approval",
    logo_key: "slack",
    provider: "slack",
    channel_display: env("SLACK_CHANNEL_NAME_FOR_DISPLAY") || "#all-gopu-os",
    status,
    runtime: "slack_events",
    error_message: details.error_message || null,
    last_checked_at: new Date().toISOString(),
    metadata: {
      event: details.event || "lead_intake",
      approval_id: details.approval_id || "",
      bot_token_configured: Boolean(env("SLACK_BOT_TOKEN")),
      channel_configured: Boolean(env("SLACK_CHANNEL_ID")),
      signing_secret_configured: Boolean(env("SLACK_SIGNING_SECRET")),
    },
  }, { onConflict: "tenant_id,platform_key" });
}

async function processLead(event: Record<string, any>, text: string) {
  const client = getSupabaseClient();
  const lead = parseSlackLead(text, event);
  const pricing = runPricingEngine(lead);
  const amount = formatMoney(pricing.recommendedTotalPrice, pricing.currency);
  const issues: string[] = [];

  const leadResult = await safeInsert(client, "lead_intake", {
    id: lead.id,
    tenant_id: lead.tenant_id,
    source: lead.source,
    buyer_name: lead.buyer_name,
    company_name: lead.company_name,
    country: lead.country,
    email: lead.email,
    phone: lead.phone,
    product: lead.product,
    quantity: lead.quantity,
    unit: lead.unit,
    destination_port: lead.destination_port,
    shipping_mode: lead.shipping_mode,
    incoterm: lead.incoterm,
    notes: lead.notes,
    status: lead.status,
    assigned_to: lead.assigned_to,
  }, "id,status");
  if (!leadResult.ok) issues.push(`lead_intake: ${leadResult.message}`);

  const pricingResult = await safeInsert(client, "pricing_requests", {
    tenant_id: lead.tenant_id,
    lead_id: leadResult.ok ? lead.id : null,
    buyer_name: lead.buyer_name,
    product: lead.product,
    quantity: lead.quantity,
    destination: lead.destination_country,
    incoterm: lead.incoterm,
    product_cost: pricing.totalCost,
    freight_cost: pricing.lines?.find((line: any) => line.key === "freight_cost")?.lineTotal || 0,
    margin_target: pricing.targetMargin,
    currency: pricing.currency,
    status: "CFO Pricing Ready",
  }, "id,status");
  if (!pricingResult.ok) issues.push(`pricing_requests: ${pricingResult.message}`);

  const cooTask = await safeInsert(client, "tasks", {
    tenant_id: lead.tenant_id,
    title: `Verify Slack lead: ${lead.company_name}`,
    description: `Slack lead for ${lead.quantity} ${lead.unit} ${lead.product} to ${lead.destination_country}.`,
    workflow_source: "Slack Lead Intake",
    linked_record_id: leadResult.ok ? lead.id : null,
    linked_route: "/export-os/executives/coo",
    department: "Operations",
    owner_command: "COO Command",
    assigned_to: "COO Command",
    priority: "High",
    status: "Pending COO Verification",
    due_date: "Today",
    escalation_level: "Director if buyer or supplier verification is incomplete",
    blocking_reason: "COO must verify buyer, product, quantity, destination, and supplier readiness before quote or invoice release.",
    next_action: "Verify the lead before CFO pricing can be released.",
    buyer: lead.company_name,
    product: lead.product,
  }, "id,status");
  if (!cooTask.ok) issues.push(`COO task: ${cooTask.message}`);

  const cfoTask = await safeInsert(client, "tasks", {
    tenant_id: lead.tenant_id,
    title: `Price Slack lead: ${lead.company_name}`,
    description: `Pricing engine calculated ${amount} total and ${formatMoney(pricing.recommendedPricePerUnit, pricing.currency)} per ${lead.unit}.`,
    workflow_source: "Pricing Engine",
    linked_record_id: leadResult.ok ? lead.id : null,
    linked_route: "/export-os/pricing",
    department: "Finance",
    owner_command: "CFO Command",
    assigned_to: "CFO Command",
    priority: "High",
    status: "Waiting Review",
    due_date: "Today",
    escalation_level: "Director approval before buyer-facing release",
    blocking_reason: "CFO must review pricing assumptions, margin, freight, and currency before Director approval.",
    next_action: `Review ${pricing.achievedMarginPercent}% margin and ${pricing.incoterm} assumptions.`,
    buyer: lead.company_name,
    product: lead.product,
  }, "id,status");
  if (!cfoTask.ok) issues.push(`CFO task: ${cfoTask.message}`);

  const approvalId = crypto.randomUUID();
  const approval = await safeInsert(client, "founder_approvals", {
    id: approvalId,
    tenant_id: lead.tenant_id,
    approval_request_id: approvalId,
    request_type: "Slack Lead Quote Approval",
    title: `Approve Slack lead quote: ${lead.company_name}`,
    summary: `Approve ${amount} quote for ${lead.quantity} ${lead.unit} ${lead.product} to ${lead.destination_country}. COO verification and CFO pricing review are required before final invoice.`,
    source_module: "Slack Lead Intake",
    related_table: "lead_intake",
    related_record_id: leadResult.ok ? lead.id : null,
    related_record: leadResult.ok ? lead.id : `slack:${event.channel}:${event.ts}`,
    buyer_name: lead.company_name,
    amount,
    requested_by: "Slack Lead Intake",
    risk_level: pricing.achievedMarginPercent < pricing.minMargin ? "High" : "Medium",
    reason: "Director approval is required before quote, final invoice, or buyer-facing commitment proceeds.",
    status: "Pending Approval",
    approval_status: "Pending Approval",
    whatsapp_status: "Pending",
    whatsapp_provider: "slack",
    metadata: {
      lead,
      pricing,
      coo_task_id: cooTask.data?.id || null,
      cfo_task_id: cfoTask.data?.id || null,
      approval_gating_required: true,
      quote_blocked_until_director_approval: true,
      invoice_blocked_until_director_approval: true,
    },
    audit_trail: [{ event: "Slack lead routed to Director approval", status: "Pending Approval", at: new Date().toISOString() }],
  }, "id,status,approval_status");
  if (!approval.ok) issues.push(`founder_approvals: ${approval.message}`);

  return { lead, pricing, amount, issues, cooTask, cfoTask, approval };
}

function buildReply(result: any) {
  const { lead, pricing, amount, issues, cooTask, cfoTask, approval } = result;
  const rows = [
    "*GOPU OS Slack lead received*",
    `Buyer/company: ${lead.company_name}`,
    `Product: ${lead.quantity} ${lead.unit} ${lead.product}`,
    `Destination: ${lead.destination_country}`,
    `Incoterm: ${pricing.incoterm}`,
    `CFO pricing estimate: ${amount} total, ${formatMoney(pricing.recommendedPricePerUnit, pricing.currency)} per ${lead.unit}`,
    `Margin: ${pricing.achievedMarginPercent}% | Lead time: ${pricing.seaLeadTime}`,
    "",
    "*Routing*",
    `COO verification: ${cooTask.data?.id ? `created (${cooTask.data.id})` : "not created"}`,
    `CFO pricing review: ${cfoTask.data?.id ? `created (${cfoTask.data.id})` : "not created"}`,
    `Director approval: ${approval.data?.id ? `pending (${approval.data.id})` : "not created"}`,
    "",
    "No quote, posting, or final invoice will proceed until Director approval is completed.",
  ];
  if (issues.length) rows.push("", "*Blockers*", ...issues.map((issue: string) => `- ${issue}`));
  return rows.join("\n");
}

export default async function handler(req: any, res: any) {
  // Health check — lets us verify endpoint is live and config is set
  if (req.method === "GET") {
    const botToken = Boolean(env("SLACK_BOT_TOKEN"));
    const channelId = Boolean(env("SLACK_CHANNEL_ID"));
    const signingSecret = Boolean(env("SLACK_SIGNING_SECRET"));
    const supabase = Boolean(getSupabaseUrl() && env("SUPABASE_SERVICE_ROLE_KEY"));
    return res.status(200).json({
      ok: true,
      endpoint: "/api/slack/events",
      status: botToken && signingSecret ? "ready" : "missing_config",
      config: {
        bot_token: botToken,
        channel_id: channelId,
        signing_secret: signingSecret,
        supabase: supabase,
      },
      instructions: "POST Slack events here. Message must contain: lead, buyer, product, quote, enquiry, or pricing.",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  let rawBody = "";
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ ok: false, status: "invalid_payload", message: "Invalid Slack event payload." });
  }

  const verification = verifySlackSignature(req, rawBody);
  if (!verification.ok) {
    console.error("[slack/events] signature verification failed", verification);
    return res.status(401).json(verification);
  }

  let payload: Record<string, any>;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return res.status(400).json({ ok: false, status: "invalid_payload", message: "Invalid Slack event JSON." });
  }

  if (payload.type === "url_verification") return res.status(200).json({ challenge: payload.challenge });

  const event = payload.event || {};
  const text = normalizeText(event.text || "");

  console.log("[slack/events] received", { type: event.type, bot_id: event.bot_id, subtype: event.subtype, isLead: isLeadMessage(text), textPreview: text.slice(0, 80) });

  if (isGopuSystemReply(text)) {
    return res.status(200).json({ ok: true, status: "ignored_system_reply" });
  }

  const inboundCommand = isLeadMessage(text) || isMarketingCommand(text);
  if ((event.bot_id || event.subtype === "bot_message") && !inboundCommand) {
    return res.status(200).json({ ok: true, status: "ignored_bot_non_command" });
  }
  if (!["message", "app_mention"].includes(event.type)) {
    return res.status(200).json({ ok: true, status: "ignored_event_type", event_type: event.type });
  }
  if (isMarketingCommand(text)) {
    try {
      const result = await processMarketingCommand(event, text);
      await sendSlackBotMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: buildMarketingReply(result) });
      return res.status(200).json({ ok: true, status: 'marketing_command_routed', campaignId: result.campaignId });
    } catch (error: any) {
      await sendSlackBotMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text: `GOPU OS could not process marketing command: ${error?.message || 'Unknown error'}` });
      return res.status(200).json({ ok: false, status: 'marketing_command_failed', message: error?.message });
    }
  }

  if (!isLeadMessage(text)) {
    return res.status(200).json({ ok: true, status: "ignored_not_lead", hint: "Message must contain: lead, buyer, product, quote, enquiry, or pricing. For marketing: promote, grow, boost, campaign, get followers." });
  }

  try {
    const result = await processLead(event, text);
    await sendSlackBotMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: buildReply(result),
    });
    await upsertSlackStatus(result.issues.length ? "error" : "live", {
      event: "lead_intake",
      approval_id: result.approval.data?.id || "",
      error_message: result.issues.join(" | "),
    });
    return res.status(200).json({ ok: result.issues.length === 0, status: result.issues.length ? "partial" : "processed", issues: result.issues });
  } catch (error: any) {
    await sendSlackBotMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: `GOPU OS could not process this Slack lead safely: ${error?.message || "Unknown error"}. No quote or invoice was released.`,
    });
    await upsertSlackStatus("error", { event: "lead_intake", error_message: error?.message || "Unknown Slack lead processing failure" });
    return res.status(200).json({ ok: false, status: "failed_safe", message: error?.message || "Slack lead processing failed safely." });
  }
}
