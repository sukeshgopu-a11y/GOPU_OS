// @ts-nocheck
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { runPricingEngine } from "../../src/services/pricingEngineService.js";
import { createExportOrder } from "../export/stages.js";

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

const AI_AGENT_PIPELINE = [
  "AI Lead Intake Agent",
  "AI COO Agent",
  "AI CFO Agent",
  "AI Logistics Agent",
  "AI Compliance Agent",
  "AI Sales Agent",
  "AI Director Agent",
];

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

export function normalizeText(value: unknown, fallback = "") {
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

export function isLeadMessage(text = "") {
  return /(?:^|\n)\s*(?:new\s+lead|lead\b|buyer\b|product\b|quote|enquiry|inquiry|pricing|chilli|chili|turmeric|pepper|spice|cumin|coriander|cardamom|export|shipment|container|reddy|gopu)/i.test(text)
    || /\d+(?:\.\d+)?\s*(?:mt|kg|kgs|ton|tons|tonne|tonnes|container|feet|bags|cartons)/i.test(text);
}

function isMarketingCommand(text = "") {
  return /\b(promote|grow|boost|campaign|get\s+\d+\s+followers|increase\s+followers|social\s+media|run\s+ads?|digital\s+marketing|get\s+likes|grow\s+page)\b/i.test(text)
    && !isLeadMessage(text);
}

export function isGopuSystemReply(text = "") {
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

async function safeUpdate(client: any, table: string, id: string, payload: Record<string, any>, select = "id,status") {
  if (!client || !id) return { ok: false, table, message: "Supabase service role env is missing." };
  const { data, error } = await client.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).select(select).maybeSingle();
  if (error) return { ok: false, table, message: error.message };
  return { ok: true, table, data };
}

async function findExistingLead(client: any, text: string) {
  if (!client) return null;
  const notes = normalizeText(text);
  const { data } = await client
    .from("lead_intake")
    .select("*")
    .eq("tenant_id", demoTenantId)
    .eq("source", "Slack")
    .eq("notes", notes)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function findExistingPricing(client: any, leadId: string) {
  if (!client || !leadId) return null;
  const { data } = await client
    .from("pricing_requests")
    .select("*")
    .eq("tenant_id", demoTenantId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function findExistingApproval(client: any, leadId: string) {
  if (!client || !leadId) return null;
  const { data } = await client
    .from("founder_approvals")
    .select("*")
    .eq("tenant_id", demoTenantId)
    .eq("related_record_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function findExistingTask(client: any, leadId: string, agentName: string) {
  if (!client || !leadId) return null;
  const { data } = await client
    .from("tasks")
    .select("*")
    .eq("tenant_id", demoTenantId)
    .eq("linked_record_id", leadId)
    .eq("workflow_source", "AI Agent Pipeline")
    .eq("owner_command", agentName)
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function ensureAgentTask(client: any, lead: any, agentName: string, payload: Record<string, any> = {}) {
  const existing = await findExistingTask(client, lead.id, agentName);
  if (existing) {
    await safeUpdate(client, "tasks", existing.id, {
      status: payload.status || "Pending",
      description: payload.description || existing.description,
      next_action: payload.next_action || existing.next_action,
      blocking_reason: payload.blocking_reason || existing.blocking_reason,
      metadata: { ...(existing.metadata || {}), ...(payload.metadata || {}) },
    });
    return { ok: true, data: { ...existing, ...payload }, table: "tasks" };
  }
  return safeInsert(client, "tasks", {
    tenant_id: lead.tenant_id,
    title: `${agentName}: ${lead.company_name}`,
    description: payload.description || `${agentName} is processing ${lead.quantity} ${lead.unit} ${lead.product} for ${lead.destination_country}.`,
    workflow_source: "AI Agent Pipeline",
    linked_record_id: lead.id,
    linked_label: agentName,
    linked_route: "/export-os/tasks",
    department: payload.department || "AI Operations",
    owner_command: agentName,
    assigned_to: agentName,
    assigned_role: agentName,
    priority: payload.priority || "High",
    status: payload.status || "Pending",
    due_date: "Today",
    escalation_level: "Director/Founder approval only",
    blocking_reason: payload.blocking_reason || "Automated AI agent workflow. Manual work is not required unless status is Needs Review.",
    next_action: payload.next_action || "AI agent will process automatically.",
    buyer: lead.company_name,
    product: lead.product,
    metadata: payload.metadata || {},
  }, "id,status,owner_command");
}

async function logAgentRun(client: any, agentName: string, status: string, context: Record<string, any>) {
  if (!client) return { ok: false, message: "Supabase service role env is missing." };
  const payload = {
    tenant_id: demoTenantId,
    lead_id: context.lead_id || null,
    pricing_request_id: context.pricing_request_id || null,
    approval_id: context.approval_id || null,
    task_id: context.task_id || null,
    agent_name: agentName,
    agent_role: agentName.replace(/^AI\s+/, ""),
    status,
    input: context.input || {},
    output: context.output || {},
    error_message: context.error_message || null,
    started_at: context.started_at || new Date().toISOString(),
    completed_at: ["Completed", "Needs Review", "Failed"].includes(status) ? new Date().toISOString() : null,
  };
  const { data, error } = await client.from("ai_agent_runs").insert(payload).select("id,status,agent_name").maybeSingle();
  if (error) return { ok: false, message: error.message };
  return { ok: true, data };
}

async function runAgent(client: any, agentName: string, lead: any, pricing: any, details: Record<string, any>) {
  const pendingTask = await ensureAgentTask(client, lead, agentName, { ...details, status: "Pending" });
  const taskId = pendingTask.data?.id;
  const processingRun = await logAgentRun(client, agentName, "Processing", { lead_id: lead.id, task_id: taskId, input: { lead, pricing } });
  await safeUpdate(client, "tasks", taskId, { status: "Processing" });
  const finalStatus = details.status || "Completed";
  await safeUpdate(client, "tasks", taskId, {
    status: finalStatus,
    description: details.description,
    next_action: details.next_action,
    blocking_reason: details.blocking_reason,
    metadata: details.metadata || {},
  });
  const run = await logAgentRun(client, agentName, finalStatus, {
    lead_id: lead.id,
    task_id: taskId,
    pricing_request_id: details.pricing_request_id,
    approval_id: details.approval_id,
    input: { lead },
    output: details.metadata || {},
    error_message: finalStatus === "Failed" ? details.blocking_reason : null,
  });
  const issue = [
    pendingTask.ok ? "" : `${agentName} task: ${pendingTask.message}`,
    processingRun.ok ? "" : `${agentName} processing log: ${processingRun.message}`,
    run.ok ? "" : `${agentName} final log: ${run.message}`,
  ].filter(Boolean).join("; ");
  return { task: pendingTask.data, run: run.data, status: finalStatus, issue };
}

function buildLogisticsPlan(lead: any, pricing: any) {
  const freight = pricing.lines?.find((line: any) => line.key === "freight_cost")?.lineTotal || 0;
  const inland = pricing.lines?.find((line: any) => line.key === "inland_logistics_cost")?.lineTotal || 0;
  const clearance = pricing.lines?.find((line: any) => line.key === "export_clearance_cost")?.lineTotal || 0;
  const packing = pricing.packingSuggestion || "Buyer-specific export packing";
  return { freight, inland, clearance, packing, lead_time: pricing.seaLeadTime, mode: lead.shipping_mode };
}

function buildCompliancePlan(lead: any) {
  const product = String(lead.product || "").toLowerCase();
  const documents = ["Commercial invoice", "Packing list", "Certificate of origin", "Shipping bill", "Bill of lading"];
  if (/chilli|chili|spice|pepper|turmeric|cumin|coriander|cardamom/.test(product)) {
    documents.push("FSSAI/APEDA or Spice Board registration evidence", "Phytosanitary certificate if buyer/country requires", "Product COA / lab test report");
  }
  return { documents, certification_check: "Prepared for compliance review. Final release requires Director approval." };
}

function buildBuyerReplyDraft(lead: any, pricing: any, amount: string) {
  return [
    `Dear ${lead.company_name},`,
    `Thank you for your enquiry for ${lead.quantity} ${lead.unit} ${lead.product} to ${lead.destination_country}.`,
    `Indicative internal quote prepared: ${amount} (${pricing.incoterm}), subject to Director approval, final freight confirmation, documents, and buyer verification.`,
    `Estimated lead time: ${pricing.seaLeadTime}.`,
    "We will share the final approved quotation after internal approval is complete.",
  ].join("\n");
}

export async function sendSlackBotMessage(message: Record<string, any>) {
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

export async function upsertSlackStatus(status: "live" | "error", details: Record<string, string> = {}) {
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

export async function processLead(event: Record<string, any>, text: string, options: Record<string, any> = {}) {
  const client = getSupabaseClient();
  const lead = parseSlackLead(text, event);

  // Fetch live market prices from Supabase — gives accurate raw material cost
  let liveMarketPrices: Record<string, any> | null = null;
  if (client) {
    const { data } = await client
      .from("commodity_prices")
      .select("product_key, price_inr_per_kg, source, updated_at")
      .eq("tenant_id", demoTenantId);
    if (data?.length) {
      liveMarketPrices = {};
      for (const row of data) {
        const daysOld = Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 86400000);
        liveMarketPrices[row.product_key] = { ...row, stale: daysOld > 7 };
      }
    }
  }

  const pricing = runPricingEngine(lead, liveMarketPrices);
  const amount = formatMoney(pricing.recommendedTotalPrice, pricing.currency);
  const issues: string[] = [];

  const existingLead = options.existingLead || await findExistingLead(client, text);
  if (existingLead && !options.force) {
    return {
      lead: { ...lead, ...existingLead, destination_country: existingLead.country || lead.destination_country, unit_of_measure: existingLead.unit || lead.unit },
      pricing,
      amount,
      issues,
      duplicate: true,
      cooTask: { ok: true, data: null },
      cfoTask: { ok: true, data: null },
      approval: { ok: true, data: null },
      agentRuns: [],
    };
  }

  const leadResult = existingLead ? { ok: true, table: "lead_intake", data: existingLead } : await safeInsert(client, "lead_intake", {
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
    status: "Pending COO Verification",
    assigned_to: lead.assigned_to,
  }, "id,status");
  if (!leadResult.ok) issues.push(`lead_intake: ${leadResult.message}`);
  const leadId = leadResult.data?.id || lead.id;
  const leadRecord = { ...lead, ...(existingLead || {}), id: leadId, status: "Completed" };

  // Create export order at Stage 1 — kicks off COO ↔ CFO ↔ Director pipeline
  const exportOrderId = await createExportOrder(client, leadRecord, pricing).catch((err: any) => {
    issues.push(`export_order: ${err?.message || "Stage 1 pipeline failed to initialize"}`);
    return null;
  });

  const leadAgent = await runAgent(client, "AI Lead Intake Agent", leadRecord, pricing, {
    status: lead.product === "Requested product" ? "Needs Review" : "Completed",
    department: "Lead Intake",
    description: `Parsed Slack lead for ${lead.company_name}.`,
    next_action: "Lead saved and routed to AI COO Agent.",
    metadata: { parsed_fields: lead },
  });

  const existingPricing = await findExistingPricing(client, leadId);
  const pricingPayload = {
    tenant_id: lead.tenant_id,
    lead_id: leadId || null,
    buyer_name: lead.buyer_name,
    product: lead.product,
    quantity: lead.quantity,
    destination: lead.destination_country,
    incoterm: lead.incoterm,
    product_cost: pricing.totalCost,
    freight_cost: pricing.lines?.find((line: any) => line.key === "freight_cost")?.lineTotal || 0,
    margin_target: pricing.targetMargin,
    currency: pricing.currency,
    status: "Completed",
    payload: {
      pricing,
      ai_agent: "AI CFO Agent",
      approval_required: true,
      blocked_until_director_approval: true,
    },
  };
  const pricingResult = existingPricing
    ? await safeUpdate(client, "pricing_requests", existingPricing.id, pricingPayload, "id,status")
    : await safeInsert(client, "pricing_requests", pricingPayload, "id,status");
  if (!pricingResult.ok) issues.push(`pricing_requests: ${pricingResult.message}`);

  const logistics = buildLogisticsPlan(lead, pricing);
  const compliance = buildCompliancePlan(lead);
  const buyerReplyDraft = buildBuyerReplyDraft(lead, pricing, amount);

  const cooTask = await runAgent(client, "AI COO Agent", leadRecord, pricing, {
    status: lead.destination_country === "Not provided" || lead.product === "Requested product" ? "Needs Review" : "Completed",
    department: "Operations",
    description: `Verified export feasibility for ${lead.quantity} ${lead.unit} ${lead.product} to ${lead.destination_country}.`,
    next_action: "COO feasibility prepared automatically. No manual COO work required.",
    metadata: { feasible: lead.destination_country !== "Not provided", checks: ["buyer captured", "product captured", "destination captured", "quantity captured"] },
  });
  if (!cooTask.task?.id) issues.push("AI COO Agent task: not created");

  const cfoTask = await runAgent(client, "AI CFO Agent", leadRecord, pricing, {
    status: pricing.achievedMarginPercent < pricing.minMargin ? "Needs Review" : "Completed",
    department: "Finance",
    description: `Calculated ${amount} total, ${formatMoney(pricing.recommendedPricePerUnit, pricing.currency)} per ${lead.unit}, ${pricing.achievedMarginPercent}% margin.`,
    next_action: "CFO pricing complete automatically. Director approval required before buyer release.",
    pricing_request_id: pricingResult.data?.id,
    metadata: { pricing, amount, profit: pricing.profitAmount, margin: pricing.achievedMarginPercent },
  });
  if (!cfoTask.task?.id) issues.push("AI CFO Agent task: not created");

  const logisticsTask = await runAgent(client, "AI Logistics Agent", leadRecord, pricing, {
    status: "Completed",
    department: "Logistics",
    description: `Estimated freight, inland logistics, clearance, packing, and lead time.`,
    next_action: "Logistics estimate prepared automatically for Director review.",
    metadata: logistics,
  });

  const complianceTask = await runAgent(client, "AI Compliance Agent", leadRecord, pricing, {
    status: "Completed",
    department: "Compliance",
    description: `Checked required export documents and likely certificates for ${lead.product}.`,
    next_action: "Compliance checklist prepared automatically. Final document release requires approval.",
    metadata: compliance,
  });

  const salesTask = await runAgent(client, "AI Sales Agent", leadRecord, pricing, {
    status: "Completed",
    department: "Sales",
    description: "Prepared buyer reply draft. It will not be sent until Director/Founder approval.",
    next_action: "Hold buyer reply until Director approval.",
    metadata: { buyer_reply_draft: buyerReplyDraft, blocked_until_director_approval: true },
  });

  const existingApproval = await findExistingApproval(client, leadId);
  const approvalId = existingApproval?.id || crypto.randomUUID();
  const approvalPayload = {
    tenant_id: lead.tenant_id,
    approval_request_id: approvalId,
    request_type: "Slack Lead Quote Approval",
    title: `Approve Slack lead quote: ${lead.company_name}`,
    summary: `Approve ${amount} quote for ${lead.quantity} ${lead.unit} ${lead.product} to ${lead.destination_country}. COO verification and CFO pricing review are required before final invoice.`,
    source_module: "Slack Lead Intake",
    related_table: "lead_intake",
    related_record_id: leadId || null,
    related_record: leadId || `slack:${event.channel}:${event.ts}`,
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
      logistics,
      compliance,
      buyer_reply_draft: buyerReplyDraft,
      coo_task_id: cooTask.task?.id || null,
      cfo_task_id: cfoTask.task?.id || null,
      logistics_task_id: logisticsTask.task?.id || null,
      compliance_task_id: complianceTask.task?.id || null,
      sales_task_id: salesTask.task?.id || null,
      approval_gating_required: true,
      quote_blocked_until_director_approval: true,
      invoice_blocked_until_director_approval: true,
      buyer_reply_blocked_until_director_approval: true,
    },
    audit_trail: [{ event: "Slack lead routed to Director approval", status: "Pending Approval", at: new Date().toISOString() }],
  };
  const approval = existingApproval
    ? await safeUpdate(client, "founder_approvals", existingApproval.id, approvalPayload, "id,status,approval_status")
    : await safeInsert(client, "founder_approvals", { id: approvalId, ...approvalPayload }, "id,status,approval_status");
  if (!approval.ok) issues.push(`founder_approvals: ${approval.message}`);

  const directorTask = await runAgent(client, "AI Director Agent", leadRecord, pricing, {
    status: "Needs Review",
    department: "Director Office",
    description: "Prepared final recommendation for manual Founder/Director decision.",
    next_action: "Founder/Director must manually approve or reject. AI cannot approve.",
    approval_id: approval.data?.id,
    metadata: {
      recommendation: pricing.achievedMarginPercent >= pricing.minMargin ? "Approve after COO/CFO evidence review." : "Review margin before approval.",
      manual_approval_required: true,
      approval_id: approval.data?.id || null,
      buyer_reply_draft: buyerReplyDraft,
    },
  });
  [leadAgent, cooTask, cfoTask, logisticsTask, complianceTask, salesTask, directorTask]
    .forEach((agentResult: any) => {
      if (agentResult.issue) issues.push(agentResult.issue);
    });

  return {
    lead: leadRecord,
    pricing,
    amount,
    issues,
    cooTask: { ok: true, data: cooTask.task },
    cfoTask: { ok: true, data: cfoTask.task },
    logisticsTask,
    complianceTask,
    salesTask,
    directorTask,
    approval,
    exportOrderId,
    agentRuns: [leadAgent, cooTask, cfoTask, logisticsTask, complianceTask, salesTask, directorTask],
  };
}

export function buildReply(result: any) {
  const { lead, pricing, amount, issues, cooTask, cfoTask, approval, exportOrderId } = result;
  const pricePerUnit = formatMoney(pricing.recommendedPricePerUnit, pricing.currency);
  const cooStatus = cooTask.data?.id ? "✅ Verified" : "⏳ Queued";
  const cfoStatus = cfoTask.data?.id ? "✅ Priced" : "⏳ Queued";
  const dirStatus = approval.data?.id ? "⏳ Pending your approval" : "⏳ Queued";

  const rows = [
    `✅ *New Lead Received — GOPU OS*`,
    ``,
    `*Buyer:* ${lead.company_name}`,
    `*Product:* ${lead.quantity} ${lead.unit.toUpperCase()} ${lead.product}`,
    `*Destination:* ${lead.destination_country}`,
    `*Incoterm:* ${pricing.incoterm || lead.incoterm}`,
    ``,
    `💰 *CFO Pricing Estimate*`,
    `• Total: *${amount}*`,
    `• Per ${lead.unit.toUpperCase()}: *${pricePerUnit}*`,
    `• Margin: ${pricing.achievedMarginPercent}%`,
    `• Delivery: ${pricing.seaLeadTime}`,
    pricing.priceSource?.stale
      ? `• ⚠️ Raw material: ₹${pricing.rawMaterialPriceInr}/kg (${pricing.priceSource.source}) — _update in CFO → Market Prices_`
      : `• ✅ Raw material: ₹${pricing.rawMaterialPriceInr}/kg (${pricing.priceSource?.source})`,
    ``,
    `📋 *Export Pipeline — Stage 1 of 7: Proforma Invoice*`,
    `• COO: ${cooStatus}`,
    `• CFO: ${cfoStatus}`,
    `• Director Approval: ${dirStatus}`,
    exportOrderId ? `• Order Ref: ${exportOrderId.slice(0, 8).toUpperCase()}` : "",
    ``,
    `*Next steps in GOPU OS:*`,
    `1️⃣ Director approves Proforma → 2️⃣ Send PI to buyer → 3️⃣ Buyer confirms order`,
    `4️⃣ Lab testing + pre-shipment docs → 5️⃣ Customs → 6️⃣ Shipping → 7️⃣ Payment`,
    ``,
    `⚠️ No quote or invoice sent to buyer until Director approval in GOPU OS.`,
  ].filter(line => line !== "");
  if (issues.length) rows.push("", `⚠️ *Note:* ${issues.slice(0, 2).join(" | ")}`);
  return rows.join("\n");
}

export const config = { api: { bodyParser: false } };

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
  let payload: Record<string, any> = {};

  // Handle both pre-parsed body (req.body) and raw stream
  if (req.body && typeof req.body === "object") {
    payload = req.body;
    rawBody = JSON.stringify(req.body);
  } else {
    try {
      rawBody = await readRawBody(req);
    } catch {
      return res.status(400).json({ ok: false, status: "invalid_payload", message: "Invalid Slack event payload." });
    }
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return res.status(400).json({ ok: false, status: "invalid_payload", message: "Invalid Slack event JSON." });
    }
  }

  // Handle URL verification BEFORE signature check — Slack sends this without a valid signature
  if (payload.type === "url_verification") return res.status(200).json({ challenge: payload.challenge });

  const verification = verifySlackSignature(req, rawBody);
  if (!verification.ok) {
    console.error("[slack/events] signature verification failed", verification);
    return res.status(401).json(verification);
  }

  // Deduplicate by Slack event_id to prevent double-processing on retries
  const slackEventId = String(payload.event_id || "");
  if (slackEventId) {
    const client = getSupabaseClient();
    if (client) {
      const { error: dedupError } = await client.from("slack_event_dedup").insert({ event_id: slackEventId });
      if (dedupError) {
        // Unique constraint violation = already processed
        return res.status(200).json({ ok: true, status: "duplicate_event_ignored", event_id: slackEventId });
      }
    }
  }

  const event = payload.event || {};
  const rawText = String(event.text || "");
  const text = normalizeText(rawText);

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
      const result = await processMarketingCommand(event, rawText);
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
    const result = await processLead(event, rawText);
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
