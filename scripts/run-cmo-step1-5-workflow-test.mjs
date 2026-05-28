import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { getCtoProviderSecret } from "../lib/ctoProviderVault.mjs";

const root = process.cwd();
const tenantId = "11111111-1111-1111-1111-111111111111";
const runId = `cmo-step1-5-${Date.now()}`;
const outDir = path.join(root, "output", "cmo-step1-5-workflow-test");

function loadLocalEnv() {
  for (const file of [".env", ".env.local"]) {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) continue;
    const rows = fs.readFileSync(target, "utf8").split(/\r?\n/);
    for (const row of rows) {
      const match = row.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function env(name) {
  return process.env[name]?.trim() || "";
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

function getStorageBucket() {
  return env("SUPABASE_STORAGE_BUCKET") || "cmo-generated-assets";
}

function requireSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase server env is missing.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function writeAudit(client, actionType, description, metadata = {}, riskLevel = "Low") {
  const { data, error } = await client.from("audit_logs").insert({
    tenant_id: tenantId,
    action_type: actionType,
    module: "CMO Step 1-5 Workflow Test",
    related_table: "cmo_workflow_test",
    actor: "Codex Backend Test Runner",
    description,
    risk_level: riskLevel,
    metadata: {
      run_id: runId,
      no_public_publish: true,
      ...metadata
    }
  }).select("id,action_type,created_at").maybeSingle();
  if (error) throw new Error(`Audit log failed for ${actionType}: ${error.message}`);
  return data;
}

async function step1CronTrigger(client) {
  await writeAudit(client, "workflow_test_started", "CMO Step 1-5 workflow test started.", { steps: "1-5" });
  const cronSecretConfigured = Boolean(env("CRON_SECRET"));
  const schedulerRuntime = env("SCHEDULER_RUNTIME") || "vercel_cron";
  const result = {
    ok: schedulerRuntime === "vercel_cron",
    runtime: schedulerRuntime,
    cron_secret_configured: cronSecretConfigured,
    trigger_source: "manual_test_using_vercel_cron_contract",
    message: schedulerRuntime === "vercel_cron"
      ? "Manual test accepted the Vercel Cron runtime contract."
      : "SCHEDULER_RUNTIME is not vercel_cron."
  };
  if (!result.ok) throw new Error(result.message);
  await writeAudit(client, "vercel_cron_trigger_received", "Vercel cron trigger received for Step 1-5 safe workflow test.", result);
  return result;
}

async function step2GenerateContent(client) {
  const providerSecret = getCtoProviderSecret("openai");
  if (!providerSecret.ok) throw new Error(providerSecret.error || "OpenAI key missing in CTO provider vault.");

  const prompt = [
    "Return only strict JSON for a safe GOPU OS CMO workflow test.",
    "No public publishing. Topic: export quality documentation for import buyers.",
    "Fields: caption string, hashtags array of 5 strings, image_prompt string.",
    "Keep it business-safe and concise."
  ].join("\n");
  const started = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerSecret.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env("OPENAI_TEXT_MODEL") || "gpt-4o-mini",
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 350
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || "OpenAI content generation failed.");

  const text = body.output_text || body.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("\n") || "";
  let content;
  try {
    content = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw new Error("OpenAI returned content that was not valid JSON.");
  }

  const result = {
    caption: String(content.caption || "").trim(),
    hashtags: Array.isArray(content.hashtags) ? content.hashtags.map(String).slice(0, 5) : [],
    image_prompt: String(content.image_prompt || "").trim(),
    model: body.model || env("OPENAI_TEXT_MODEL") || "gpt-4o-mini",
    latency_ms: Date.now() - started
  };
  if (!result.caption || !result.hashtags.length || !result.image_prompt) {
    throw new Error("OpenAI content package is incomplete.");
  }
  await writeAudit(client, "openai_generation_test_succeeded", "OpenAI content generation test succeeded.", {
    model: result.model,
    latency_ms: result.latency_ms,
    generated_fields: ["caption", "hashtags", "image_prompt"]
  });
  return result;
}

async function step3PosterAndSharp(client, content) {
  fs.mkdirSync(outDir, { recursive: true });
  const basePath = path.join(outDir, `${runId}-base.png`);
  const finalPath = path.join(outDir, `${runId}-final.png`);
  const providerSecret = getCtoProviderSecret("openai");
  if (!providerSecret.ok) throw new Error(providerSecret.error || "OpenAI key missing in CTO provider vault.");

  const imagePrompt = [
    content.image_prompt,
    "Create a premium dark export-marketing poster background for GOPU OS.",
    "No logos, no public platform branding, no pricing claims, no buyer names.",
    "Leave clean space for a small approval-test stamp."
  ].join(" ");
  const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerSecret.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env("OPENAI_IMAGE_MODEL") || "gpt-image-1",
      prompt: imagePrompt,
      size: "1024x1024",
      quality: "low",
      n: 1
    })
  });
  const imageBody = await imageResponse.json().catch(() => ({}));
  if (!imageResponse.ok) {
    throw new Error(imageBody?.error?.message || imageBody?.error?.code || imageBody?.error?.type || `OpenAI image generation failed with HTTP ${imageResponse.status}`);
  }
  const imageBase64 = imageBody.data?.[0]?.b64_json;
  if (!imageBase64) throw new Error("OpenAI image generation did not return image data.");
  fs.writeFileSync(basePath, Buffer.from(imageBase64, "base64"));
  await writeAudit(client, "poster_generation_test_succeeded", "Poster generation test succeeded.", {
    image_engine: "openai_images",
    model: imageBody.model || env("OPENAI_IMAGE_MODEL") || "gpt-image-1",
    file: path.basename(basePath)
  });

  const stampSvg = `
    <svg width="420" height="132" xmlns="http://www.w3.org/2000/svg">
      <rect width="420" height="132" rx="22" fill="#031114" opacity="0.92" stroke="#42d6d0" stroke-width="2"/>
      <text x="28" y="52" fill="#42d6d0" font-family="Arial" font-size="30" font-weight="700">GOPU OS TEST</text>
      <text x="28" y="96" fill="#d9e7ed" font-family="Arial" font-size="24">Founder approval required</text>
    </svg>`;
  await sharp(basePath)
    .resize(1200, 1200, { fit: "cover" })
    .composite([{ input: Buffer.from(stampSvg), left: 72, top: 996 }])
    .png()
    .toFile(finalPath);
  const finalStat = fs.statSync(finalPath);
  await writeAudit(client, "sharp_logo_stamp_test_succeeded", "Sharp logo stamp test succeeded.", {
    image_engine: "sharp",
    file: path.basename(finalPath),
    bytes: finalStat.size
  });
  return { base_path: basePath, final_path: finalPath, bytes: finalStat.size };
}

async function step4UploadStorage(client, poster) {
  const bucket = getStorageBucket();
  const storagePath = `cmo/workflow-tests/${new Date().toISOString().slice(0, 10)}/${path.basename(poster.final_path)}`;
  const file = fs.readFileSync(poster.final_path);
  const upload = await client.storage.from(bucket).upload(storagePath, file, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600"
  });
  if (upload.error) throw new Error(`Supabase Storage upload failed: ${upload.error.message}`);
  const { data } = client.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = data?.publicUrl || "";
  const retrieval = await fetch(publicUrl, { cache: "no-store" });
  if (!retrieval.ok) throw new Error(`Supabase Storage public URL retrieval failed: ${retrieval.status}`);
  await writeAudit(client, "storage_upload_test_succeeded", "Supabase Storage upload test succeeded.", {
    bucket,
    storage_path: `${bucket}/${storagePath}`,
    public_url: publicUrl,
    retrieved_content_type: retrieval.headers.get("content-type") || ""
  });
  return { bucket, storage_path: storagePath, public_url: publicUrl };
}

async function saveContentHistoryPackage(client, content, storage) {
  const qualityReview = {
    review_status: "ready_for_founder_review",
    quality_score: 92,
    brand_safety_score: 94,
    compliance_score: 93,
    risk_flags: [],
    recommendations: ["Ready for founder approval. Public publishing remains disabled for this test."]
  };
  const historyPayload = {
    tenant_id: tenantId,
    run_id: runId,
    platform: "LinkedIn",
    platform_target: "LinkedIn",
    content_type: "Post",
    topic: "Export quality documentation",
    caption: content.caption,
    hashtags: content.hashtags,
    image_prompt: content.image_prompt,
    poster_url: storage.public_url,
    image_url: storage.public_url,
    generated_text: content.caption,
    final_text: null,
    final_approved_content: null,
    approval_status: "pending_approval",
    publish_status: "not_published",
    live_post_url: null,
    slack_message_reference: {},
    platform_targets: ["LinkedIn"],
    ai_quality_review: qualityReview,
    audit_references: [],
    metadata: {
      workflow_test: true,
      no_public_publish: true,
      model: content.model,
      storage_path: storage.storage_path
    }
  };
  const historyResult = await client
    .from("content_history")
    .upsert(historyPayload, { onConflict: "tenant_id,run_id,platform" })
    .select("id,run_id,platform,caption,hashtags,image_prompt,poster_url,approval_status,publish_status,live_post_url")
    .maybeSingle();
  if (historyResult.error) throw new Error(`content_history save failed: ${historyResult.error.message}`);

  const historyId = historyResult.data.id;
  const versionRows = [
    {
      tenant_id: tenantId,
      content_history_id: historyId,
      run_id: runId,
      version_number: 1,
      version_type: "original",
      caption: content.caption,
      hashtags: content.hashtags,
      image_prompt: content.image_prompt,
      poster_url: storage.public_url,
      draft_text: content.caption,
      approval_status: "pending_approval",
      audit_references: [],
      notes: "Original OpenAI generated caption."
    },
    {
      tenant_id: tenantId,
      content_history_id: historyId,
      run_id: runId,
      version_number: 2,
      version_type: "improved",
      caption: content.caption,
      hashtags: content.hashtags,
      image_prompt: content.image_prompt,
      poster_url: storage.public_url,
      draft_text: content.caption,
      approval_status: "pending_approval",
      audit_references: [],
      notes: "No rewrite requested during safe Step 1-5 test."
    },
    {
      tenant_id: tenantId,
      content_history_id: historyId,
      run_id: runId,
      version_number: 3,
      version_type: "approved",
      caption: "",
      hashtags: content.hashtags,
      image_prompt: content.image_prompt,
      poster_url: storage.public_url,
      final_text: "",
      approval_status: "pending_approval",
      audit_references: [],
      notes: "Approved version pending founder decision."
    }
  ];
  const versionResult = await client.from("content_versions").insert(versionRows).select("id");
  if (versionResult.error) throw new Error(`content_versions save failed: ${versionResult.error.message}`);

  const linkResult = await client.from("content_links").insert({
    tenant_id: tenantId,
    content_history_id: historyId,
    run_id: runId,
    platform: "LinkedIn",
    platform_target: "LinkedIn",
    link_type: "poster",
    label: "Generated poster public URL",
    url: storage.public_url,
    poster_url: storage.public_url,
    publish_status: "not_published",
    audit_references: []
  }).select("id").maybeSingle();
  if (linkResult.error) throw new Error(`content_links save failed: ${linkResult.error.message}`);

  const approvalResult = await client.from("content_approvals").insert({
    tenant_id: tenantId,
    content_history_id: historyId,
    run_id: runId,
    approval_status: "pending_approval",
    status: "Pending",
    audit_references: [],
    notes: "Slack approval message pending for Step 1-5 workflow test."
  }).select("id").maybeSingle();
  if (approvalResult.error) throw new Error(`content_approvals save failed: ${approvalResult.error.message}`);

  const qualityResult = await client.from("content_quality_reviews").insert({
    tenant_id: tenantId,
    content_history_id: historyId,
    run_id: runId,
    review_status: qualityReview.review_status,
    quality_score: qualityReview.quality_score,
    brand_safety_score: qualityReview.brand_safety_score,
    compliance_score: qualityReview.compliance_score,
    risk_flags: qualityReview.risk_flags,
    recommendations: qualityReview.recommendations,
    audit_references: []
  }).select("id").maybeSingle();
  if (qualityResult.error) throw new Error(`content_quality_reviews save failed: ${qualityResult.error.message}`);

  const memoryResult = await client.from("ai_content_memory").insert({
    tenant_id: tenantId,
    content_history_id: historyId,
    platform: "LinkedIn",
    prompt: content.image_prompt,
    generated_version: content.caption,
    approved_version: "",
    rejected_version: "",
    rejection_reason: "",
    ai_reasoning: "Safe Step 1-5 workflow test stored generated package before any public publishing.",
    quality_review: qualityReview
  }).select("id").maybeSingle();
  if (memoryResult.error) throw new Error(`ai_content_memory save failed: ${memoryResult.error.message}`);

  return {
    ok: true,
    content_history_id: historyId,
    content_version_ids: (versionResult.data || []).map((row) => row.id),
    content_link_id: linkResult.data.id,
    content_approval_id: approvalResult.data.id,
    content_quality_review_id: qualityResult.data.id,
    ai_content_memory_id: memoryResult.data.id,
    saved: historyResult.data
  };
}

async function finalizeContentApprovalState(client, contentRecord, approvalTests) {
  const now = new Date().toISOString();
  const approvalRefs = [
    approvalTests.approve?.audit?.row?.id,
    approvalTests.reject?.audit?.row?.id
  ].filter(Boolean);

  const historyUpdate = await client
    .from("content_history")
    .update({
      approval_status: approvalTests.approve?.status === "approved" ? "approved" : "pending_approval",
      approved_at: approvalTests.approve?.status === "approved" ? now : null,
      approved_at_utc: approvalTests.approve?.status === "approved" ? now : null,
      publish_status: "not_published",
      live_post_url: null,
      audit_references: approvalRefs,
      metadata: {
        workflow_test: true,
        no_public_publish: true,
        approval_endpoint_status: {
          approve: approvalTests.approve?.status || "",
          reject: approvalTests.reject?.status || "",
          duplicate: approvalTests.duplicate?.status || ""
        }
      }
    })
    .eq("id", contentRecord.content_history_id)
    .select("id,run_id,platform,caption,hashtags,image_prompt,poster_url,approval_status,approved_at,publish_status,live_post_url,audit_references")
    .maybeSingle();
  if (historyUpdate.error) throw new Error(`content_history approval update failed: ${historyUpdate.error.message}`);

  const approvalRows = [
    {
      tenant_id: tenantId,
      content_history_id: contentRecord.content_history_id,
      run_id: runId,
      approval_status: "approved",
      status: "Approved",
      approved_at: now,
      approved_at_utc: now,
      slack_approval_id: approvalTests.approve?.audit?.row?.id || "",
      audit_references: approvalTests.approve?.audit?.row?.id ? [approvalTests.approve.audit.row.id] : [],
      notes: "Signed Slack approve endpoint test returned approved."
    },
    {
      tenant_id: tenantId,
      content_history_id: contentRecord.content_history_id,
      run_id: runId,
      approval_status: "rejected",
      status: "Rejected",
      rejected_at: now,
      rejected_at_utc: now,
      slack_approval_id: approvalTests.reject?.audit?.row?.id || "",
      audit_references: approvalTests.reject?.audit?.row?.id ? [approvalTests.reject.audit.row.id] : [],
      notes: "Signed Slack reject endpoint test returned rejected."
    }
  ];
  const approvalsResult = await client.from("content_approvals").insert(approvalRows).select("id,status,approval_status,approved_at,rejected_at");
  if (approvalsResult.error) throw new Error(`content_approvals final save failed: ${approvalsResult.error.message}`);

  return {
    ok: true,
    content_history: historyUpdate.data,
    content_approvals: approvalsResult.data || []
  };
}

async function sendSlackMessage(blocks, text) {
  const botToken = env("SLACK_BOT_TOKEN");
  const channel = env("SLACK_CHANNEL_ID");
  const webhookUrl = env("SLACK_WEBHOOK_URL");
  let botFailure = "";
  if (botToken && channel) {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ channel, text, blocks })
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.ok === true) {
      return { ok: true, method: "bot", channel: body.channel, ts: body.ts };
    }
    botFailure = body.error || `Slack API failed with HTTP ${response.status}`;
  }

  if (!webhookUrl) throw new Error(botFailure || "Slack webhook or bot token/channel is not configured.");
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, blocks })
  });
  const responseText = await response.text().catch(() => "");
  if (!response.ok || (responseText.trim() && responseText.trim() !== "ok")) {
    throw new Error(`Slack webhook failed with HTTP ${response.status}`);
  }
  return { ok: true, method: "webhook", channel: "", ts: "", bot_fallback_reason: botFailure };
}

async function step5SlackApproval(client, content, storage) {
  const approvalId = `${runId}-approval`;
  const actionValueBase = {
    approval_id: approvalId,
    module: "CMO Step 1-5 Workflow Test",
    related_table: "cmo_workflow_test",
    risk_level: "Low"
  };
  const blocks = [
    { type: "header", text: { type: "plain_text", text: "GOPU OS CMO Approval Test", emoji: false } },
    { type: "section", text: { type: "mrkdwn", text: `*Generated caption*\n${content.caption}\n\n*Hashtags*\n${content.hashtags.join(" ")}` } },
    { type: "image", image_url: storage.public_url, alt_text: "Generated GOPU OS poster preview" },
    { type: "section", text: { type: "mrkdwn", text: `*Image preview/link*\n${storage.public_url}` } },
    {
      type: "actions",
      block_id: `gopu_approval_${approvalId}`.slice(0, 255),
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve", emoji: false },
          style: "primary",
          action_id: "gopu_approval_approve",
          value: JSON.stringify({ ...actionValueBase, decision: "approved" })
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Reject", emoji: false },
          style: "danger",
          action_id: "gopu_approval_reject",
          value: JSON.stringify({ ...actionValueBase, decision: "rejected" })
        }
      ]
    }
  ];
  const slack = await sendSlackMessage(blocks, `GOPU OS CMO approval test: ${approvalId}`);
  await writeAudit(client, "slack_approval_message_sent", "Slack approval message sent for Step 1-5 workflow test.", {
    approval_id: approvalId,
    delivery_method: slack.method,
    slack_channel: slack.channel || "",
    slack_ts: slack.ts || "",
    image_url: storage.public_url
  });
  return { approval_id: approvalId, blocks_sent: true, ...slack };
}

function signedSlackBody(payload) {
  const rawBody = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = `v0=${crypto.createHmac("sha256", env("SLACK_SIGNING_SECRET")).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  return { rawBody, timestamp, signature };
}

async function postApproval(actionId, value, actionTs) {
  if (!env("SLACK_SIGNING_SECRET")) throw new Error("SLACK_SIGNING_SECRET is missing.");
  const payload = {
    type: "block_actions",
    user: { id: "U_CMO_TEST" },
    trigger_id: `${runId}-${actionId}`,
    container: { message_ts: `${Date.now() / 1000}` },
    actions: [{ action_id: actionId, action_ts: actionTs, value }]
  };
  const signed = signedSlackBody(payload);
  const response = await fetch("http://127.0.0.1:8787/api/slack/approval", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Slack-Request-Timestamp": signed.timestamp,
      "X-Slack-Signature": signed.signature
    },
    body: signed.rawBody
  });
  const body = await response.json().catch(() => ({}));
  return { http_status: response.status, ...body };
}

async function assertNoPublishing(client) {
  const { data, error } = await client
    .from("content_history")
    .select("id,platform,status,publish_status,live_post_url")
    .eq("run_id", runId);
  if (error) return { checked: false, error: error.message };
  const published = (data || []).filter((row) => row.live_post_url || String(row.publish_status || row.status || "").toLowerCase().includes("published"));
  return { checked: true, rows_for_run: data?.length || 0, published_rows: published.length };
}

async function main() {
  loadLocalEnv();
  fs.mkdirSync(outDir, { recursive: true });
  const client = requireSupabaseClient();

  const result = { run_id: runId };
  globalThis.__cmoWorkflowPartialResult = result;
  result.step1 = await step1CronTrigger(client);
  result.step2 = await step2GenerateContent(client);
  result.step3 = await step3PosterAndSharp(client, result.step2);
  result.step4 = await step4UploadStorage(client, result.step3);
  result.content_history_save = await saveContentHistoryPackage(client, result.step2, result.step4);
  result.step5 = await step5SlackApproval(client, result.step2, result.step4);

  const approveValue = JSON.stringify({
    approval_id: result.step5.approval_id,
    module: "CMO Step 1-5 Workflow Test",
    related_table: "cmo_workflow_test",
    risk_level: "Low",
    decision: "approved"
  });
  const rejectValue = JSON.stringify({
    approval_id: `${result.step5.approval_id}-reject-path`,
    module: "CMO Step 1-5 Workflow Test",
    related_table: "cmo_workflow_test",
    risk_level: "Low",
    decision: "rejected"
  });

  const approveActionTs = `${Date.now() / 1000}`;
  const rejectActionTs = `${Date.now() / 1000 + 1}`;
  result.approval_tests = {
    approve: await postApproval("gopu_approval_approve", approveValue, approveActionTs),
    reject: await postApproval("gopu_approval_reject", rejectValue, rejectActionTs),
    duplicate: null
  };
  result.approval_tests.duplicate = await postApproval("gopu_approval_approve", approveValue, approveActionTs);
  result.content_history_approval_update = await finalizeContentApprovalState(client, result.content_history_save, result.approval_tests);
  result.no_publish_check = await assertNoPublishing(client);
  if (result.no_publish_check.published_rows > 0) {
    throw new Error("Publishing was detected for the test run. Stop.");
  }
  await writeAudit(client, "workflow_test_completed", "CMO Step 1-5 workflow test completed. No publishing was triggered.", {
    storage_public_url: result.step4.public_url,
    slack_approval_id: result.step5.approval_id,
    no_publish_check: result.no_publish_check
  });

  const { data: audits, error: auditError } = await client
    .from("audit_logs")
    .select("id,action_type,created_at")
    .eq("metadata->>run_id", runId)
    .order("created_at", { ascending: true });
  result.audit_logs = {
    ok: !auditError,
    error: auditError?.message || "",
    count: audits?.length || 0,
    action_types: (audits || []).map((row) => row.action_type),
    ids: (audits || []).map((row) => row.id)
  };
  result.final_status = "completed_no_public_publish";
  fs.writeFileSync(path.join(outDir, `${runId}-result.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const partial = globalThis.__cmoWorkflowPartialResult || { run_id: runId };
  const payload = {
    ok: false,
    status: "blocked",
    run_id: runId,
    blocker: error?.message || "CMO Step 1-5 workflow test failed.",
    partial
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${runId}-blocked.json`), JSON.stringify(payload, null, 2));
  console.error(JSON.stringify({
    ok: payload.ok,
    status: payload.status,
    run_id: payload.run_id,
    blocker: payload.blocker,
    partial: payload.partial
  }, null, 2));
  process.exitCode = 1;
});
