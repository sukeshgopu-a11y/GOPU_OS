import { createClient } from "@supabase/supabase-js";

const MAX_PUBLISH_ATTEMPTS = 3;
const ALLOWED_STATUSES = new Set(["queued", "publishing", "published", "failed", "retry_scheduled"]);

function env(name) {
  return process.env[name]?.trim() || "";
}

function nowIso() {
  return new Date().toISOString();
}

function supabaseUrl() {
  return env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
}

function supabaseServiceRoleKey() {
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

function getSupabaseClient() {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url) throw new Error("Missing Supabase URL.");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isTestMode(row = {}) {
  return row?.metadata?.test_mode === true || row?.metadata?.test_mode === "true";
}

function metadata(row = {}) {
  return row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
}

function safeErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown publishing error");
}

function selectedCaption(row = {}) {
  return row.final_approved_content || row.final_text || row.caption || row.generated_text || "";
}

function normalizePlatform(value = "") {
  const platform = String(value || "").trim().toLowerCase();
  if (platform === "linkedin" || platform === "linked in") return "LinkedIn";
  if (platform === "instagram") return "Instagram";
  if (platform === "facebook") return "Facebook";
  return value || "";
}

function metaConfig() {
  const token = env("META_ACCESS_TOKEN");
  const instagramId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  const facebookPageId = env("FACEBOOK_PAGE_ID");
  return {
    token,
    instagramId,
    facebookPageId,
    instagramConfigured: Boolean(token && instagramId),
    facebookConfigured: Boolean(token && facebookPageId),
    missingInstagram: [token ? "" : "META_ACCESS_TOKEN", instagramId ? "" : "INSTAGRAM_BUSINESS_ACCOUNT_ID"].filter(Boolean),
    missingFacebook: [token ? "" : "META_ACCESS_TOKEN", facebookPageId ? "" : "FACEBOOK_PAGE_ID"].filter(Boolean)
  };
}

async function generatePostImage(imagePrompt, platform = "Instagram") {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) {
    console.warn("[cmo-publishing] OPENAI_API_KEY not set — skipping image generation");
    return null;
  }
  if (!imagePrompt?.trim()) return null;

  const size = platform === "LinkedIn" ? "1792x1024" : "1024x1024";
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "dall-e-3", prompt: imagePrompt, n: 1, size })
    });
    if (!response.ok) {
      const err = await response.text().catch(() => "");
      console.warn("[cmo-publishing] DALL-E image generation failed:", err);
      return null;
    }
    const json = await response.json();
    return json?.data?.[0]?.url || null;
  } catch (error) {
    console.warn("[cmo-publishing] Image generation error (non-fatal):", safeErrorMessage(error));
    return null;
  }
}

async function publishInstagram(row) {
  const config = metaConfig();
  if (!config.instagramConfigured) {
    return { ok: false, status: "missing_credentials", error: `Missing Instagram credentials: ${config.missingInstagram.join(", ")}.` };
  }

  const caption = selectedCaption(row);
  if (!caption.trim()) return { ok: false, status: "missing_content", error: "Instagram caption is empty." };

  const imageUrl = row.image_url || await generatePostImage(row.metadata?.image_prompt, "Instagram");
  const base = `https://graph.facebook.com/v19.0/${config.instagramId}`;

  // Step 1: create media container
  const containerBody = { caption, access_token: config.token };
  if (imageUrl) containerBody.image_url = imageUrl;

  const containerRes = await fetch(`${base}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody)
  });
  const containerJson = await containerRes.json().catch(() => ({}));
  if (!containerRes.ok || !containerJson.id) {
    return { ok: false, status: "instagram_container_failed", error: containerJson.error?.message || `Instagram container creation failed (HTTP ${containerRes.status}).` };
  }

  // Step 2: publish container
  const publishRes = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerJson.id, access_token: config.token })
  });
  const publishJson = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok || !publishJson.id) {
    return { ok: false, status: "instagram_publish_failed", error: publishJson.error?.message || `Instagram publish failed (HTTP ${publishRes.status}).` };
  }

  return {
    ok: true,
    status: "published",
    provider_post_id: publishJson.id,
    post_url: `https://www.instagram.com/p/${publishJson.id}/`
  };
}

async function publishFacebook(row) {
  const config = metaConfig();
  if (!config.facebookConfigured) {
    return { ok: false, status: "missing_credentials", error: `Missing Facebook credentials: ${config.missingFacebook.join(", ")}.` };
  }

  const message = selectedCaption(row);
  if (!message.trim()) return { ok: false, status: "missing_content", error: "Facebook post message is empty." };

  const imageUrl = row.image_url || await generatePostImage(row.metadata?.image_prompt, "Facebook");
  const body = { message, access_token: config.token };
  if (imageUrl) body.link = imageUrl;

  const response = await fetch(`https://graph.facebook.com/v19.0/${config.facebookPageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.id) {
    return { ok: false, status: "facebook_api_failed", error: json.error?.message || `Facebook API returned HTTP ${response.status}.` };
  }

  return {
    ok: true,
    status: "published",
    provider_post_id: json.id,
    post_url: `https://www.facebook.com/${config.facebookPageId}/posts/${json.id.split("_")[1] || json.id}`
  };
}

function linkedinConfig() {
  const token = env("LINKEDIN_ACCESS_TOKEN");
  const authorUrn = env("LINKEDIN_AUTHOR_URN")
    || (env("LINKEDIN_ORGANIZATION_ID") ? `urn:li:organization:${env("LINKEDIN_ORGANIZATION_ID")}` : "")
    || (env("LINKEDIN_PERSON_URN") ? `urn:li:person:${env("LINKEDIN_PERSON_URN")}` : "");
  return {
    configured: Boolean(token && authorUrn),
    missing: [
      token ? "" : "LINKEDIN_ACCESS_TOKEN",
      authorUrn ? "" : "LINKEDIN_AUTHOR_URN or LINKEDIN_ORGANIZATION_ID"
    ].filter(Boolean),
    token,
    authorUrn
  };
}

async function writeAudit(client, row, eventType, description, extra = {}) {
  const audit = await client
    .from("audit_logs")
    .insert({
      tenant_id: row.tenant_id,
      action_type: eventType,
      action: eventType,
      module: "CMO Publishing",
      related_table: "content_history",
      related_record_id: row.id,
      record_type: "content_history",
      record_id: row.id,
      actor: "CMO Publishing Engine",
      actor_role: "System",
      description,
      notes: description,
      risk_level: extra.risk_level || "Medium",
      metadata: {
        run_id: row.run_id,
        platform: row.platform,
        publish_status: extra.publish_status || row.publish_status,
        test_mode: isTestMode(row),
        no_public_publish: extra.no_public_publish === true,
        ...extra.metadata
      }
    })
    .select("id")
    .maybeSingle();

  if (audit.error) {
    return { ok: false, error: audit.error.message };
  }
  return { ok: true, id: audit.data?.id || null };
}

async function sendPublishingSlackNotification({ type, priority = "INFO", row, status, message }) {
  const webhookUrl = env("SLACK_WEBHOOK_URL");
  if (!webhookUrl) return { ok: false, status: "not_configured" };

  const text = [
    "GOPU OS CMO PUBLISHING",
    "",
    `Type: ${type}`,
    `Priority: ${priority}`,
    `Run ID: ${row.run_id}`,
    `Platform: ${row.platform}`,
    `Status: ${status}`,
    "",
    "Action Required:",
    message
  ].join("\n");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const responseText = await response.text().catch(() => "");
    return { ok: response.ok && responseText.trim() === "ok", status: response.status };
  } catch (error) {
    console.error("[cmo-publishing] Slack notification failed safely", { message: safeErrorMessage(error), type, status });
    return { ok: false, status: "failed" };
  }
}

async function updateContent(client, id, patch) {
  const { data, error } = await client
    .from("content_history")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`content_history update failed: ${error.message}`);
  if (!data?.id) throw new Error("content_history update returned no row.");
  return data;
}

async function reserveQueuedRow(client, row, dryRun) {
  const attemptCount = Number(row.publish_attempt_count || 0) + 1;
  const currentMetadata = metadata(row);
  const patch = {
    publish_status: dryRun ? "queued" : "publishing",
    publish_attempt_count: attemptCount,
    last_publish_attempt_at: nowIso(),
    last_publish_error: null,
    metadata: {
      ...currentMetadata,
      current_step: 7,
      workflow_stage: "publishing",
      step7_status: dryRun ? "dry_run" : "publishing",
      last_publish_attempt_mode: dryRun ? "dry_run" : "live"
    }
  };

  const query = client
    .from("content_history")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", row.id)
    .eq("approval_status", "approved")
    .eq("publish_status", "queued")
    .select("*")
    .maybeSingle();

  const { data, error } = await query;
  if (error) throw new Error(`publish reservation failed: ${error.message}`);
  if (!data?.id) throw new Error("Publish reservation skipped: content is no longer queued.");
  return data;
}

async function publishLinkedIn(row) {
  const config = linkedinConfig();
  if (!config.configured) {
    return {
      ok: false,
      status: "missing_credentials",
      error: `Missing LinkedIn credentials: ${config.missing.join(", ")}.`
    };
  }

  const text = selectedCaption(row);
  if (!text.trim()) {
    return { ok: false, status: "missing_content", error: "LinkedIn post text is empty." };
  }

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify({
      author: config.authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    })
  });

  const responseBody = await response.text().catch(() => "");
  if (!response.ok) {
    return {
      ok: false,
      status: "linkedin_api_failed",
      error: responseBody || `LinkedIn API returned HTTP ${response.status}.`
    };
  }

  const postId = response.headers.get("x-restli-id") || responseBody || "";
  return {
    ok: true,
    status: "published",
    provider_post_id: postId,
    post_url: postId ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}` : ""
  };
}

async function executeOnePublish(client, row, { dryRun = false } = {}) {
  if (String(row.approval_status || "").toLowerCase() !== "approved") {
    await writeAudit(client, row, "blocked_missing_approval", "Publishing blocked because founder approval is missing.", { publish_status: row.publish_status, risk_level: "High" });
    return { ok: false, status: "blocked_missing_approval", content_history: row, message: "Founder approval is required before publishing." };
  }

  const platform = normalizePlatform(row.platform);
  if (!["LinkedIn", "Instagram", "Facebook"].includes(platform)) {
    const failed = await updateContent(client, row.id, {
      publish_status: "failed",
      last_publish_error: `Unsupported platform: ${row.platform || "unknown"}. Supported: LinkedIn, Instagram, Facebook.`,
      metadata: { ...metadata(row), current_step: 7, workflow_stage: "publishing", step7_status: "failed" }
    });
    await writeAudit(client, failed, "cmo_publish_failed", `Unsupported platform: ${row.platform}.`, { publish_status: "failed", risk_level: "High" });
    await sendPublishingSlackNotification({ type: "Publish Failure", priority: "WARNING", row: failed, status: "failed", message: `Unsupported publishing platform: ${row.platform}.` });
    return { ok: false, status: "failed", content_history: failed, message: `Unsupported platform: ${row.platform}.` };
  }

  if (row.live_post_url || row.post_url || String(row.publish_status || "").toLowerCase() === "published") {
    await writeAudit(client, row, "cmo_publish_duplicate_blocked", "Duplicate publish blocked because this content already has a publish URL/status.", { publish_status: row.publish_status, risk_level: "High" });
    return { ok: false, status: "duplicate_blocked", content_history: row, message: "Duplicate publish blocked." };
  }

  if (Number(row.publish_attempt_count || 0) >= MAX_PUBLISH_ATTEMPTS) {
    const retry = await updateContent(client, row.id, {
      publish_status: "retry_scheduled",
      last_publish_error: "Maximum publish attempts reached. Manual review required before retry.",
      metadata: { ...metadata(row), current_step: 7, workflow_stage: "publishing", step7_status: "retry_scheduled" }
    });
    await writeAudit(client, retry, "cmo_publish_retry_scheduled", "Retry scheduled after maximum publish attempts reached.", { publish_status: "retry_scheduled", risk_level: "High" });
    await sendPublishingSlackNotification({ type: "Retry Scheduled", priority: "WARNING", row: retry, status: "retry_scheduled", message: "Publishing retry requires manual review." });
    return { ok: false, status: "retry_scheduled", content_history: retry, message: "Retry scheduled; manual review required." };
  }

  const reserved = await reserveQueuedRow(client, row, dryRun);
  await writeAudit(client, reserved, dryRun ? "cmo_publish_dry_run_started" : "cmo_publish_attempt_started", dryRun ? "Dry-run publishing validation started. No public post will be created." : `${platform} publishing attempt started.`, { publish_status: reserved.publish_status, no_public_publish: dryRun });

  if (dryRun) {
    const dryRunRow = await updateContent(client, reserved.id, {
      publish_status: "queued",
      last_publish_error: null,
      metadata: {
        ...metadata(reserved),
        current_step: 7,
        workflow_stage: "publishing",
        step7_status: "dry_run_passed",
        dry_run_publish_completed: true,
        dry_run_validated_at: nowIso(),
        simulated_pipeline: true,
        no_public_publish: true
      }
    });
    await writeAudit(client, dryRunRow, "cmo_publish_dry_run_succeeded", "Dry-run publishing validation passed. No public LinkedIn post was created.", { publish_status: "queued", no_public_publish: true });
    return { ok: true, status: "dry_run_passed", content_history: dryRunRow, message: "Dry-run publishing passed. No public post created." };
  }

  // Generate image for LinkedIn if prompt exists and no image yet
  let publishRow = reserved;
  if (platform === "LinkedIn" && !reserved.image_url && reserved.metadata?.image_prompt) {
    const imgUrl = await generatePostImage(reserved.metadata.image_prompt, "LinkedIn");
    if (imgUrl) {
      publishRow = await updateContent(client, reserved.id, {
        image_url: imgUrl,
        metadata: { ...metadata(reserved), generated_image_url: imgUrl }
      });
    }
  }

  const publishResult = platform === "Instagram"
    ? await publishInstagram(publishRow)
    : platform === "Facebook"
      ? await publishFacebook(publishRow)
      : await publishLinkedIn(publishRow);

  if (!publishResult.ok) {
    const failed = await updateContent(client, reserved.id, {
      publish_status: "failed",
      last_publish_error: publishResult.error,
      metadata: {
        ...metadata(reserved),
        current_step: 7,
        workflow_stage: "publishing",
        step7_status: "failed",
        provider_status: publishResult.status
      }
    });
    await writeAudit(client, failed, "cmo_publish_failed", publishResult.error || "LinkedIn publishing failed safely.", { publish_status: "failed", risk_level: "High", metadata: { provider_status: publishResult.status } });
    await sendPublishingSlackNotification({ type: "Publish Failure", priority: "URGENT", row: failed, status: "failed", message: publishResult.error || "LinkedIn publishing failed safely." });
    return { ok: false, status: "failed", content_history: failed, message: publishResult.error || "LinkedIn publishing failed safely." };
  }

  const publishedAt = nowIso();
  const published = await updateContent(client, reserved.id, {
    publish_status: "published",
    live_post_url: publishResult.post_url,
    post_url: publishResult.post_url,
    published_at: publishedAt,
    published_at_utc: publishedAt,
    last_publish_error: null,
    metadata: {
      ...metadata(reserved),
      current_step: 8,
      workflow_stage: "analytics",
      step7_status: "published",
      provider_post_id: publishResult.provider_post_id
    }
  });
  await writeAudit(client, published, "cmo_publish_succeeded", `${platform} publishing completed successfully.`, { publish_status: "published", risk_level: "Medium", metadata: { provider_post_id: publishResult.provider_post_id } });
  await sendPublishingSlackNotification({ type: "Publish Success", priority: "INFO", row: published, status: "published", message: `${platform} post published successfully. ${publishResult.post_url || ""}` });
  return { ok: true, status: "published", content_history: published, message: "LinkedIn post published successfully." };
}

export async function runCmoPublishingEngine(options = {}) {
  const dryRun = options.dryRun === true;
  const limit = Math.max(1, Math.min(Number(options.limit || 5), 10));
  const client = options.client || getSupabaseClient();
  const baseSelect = "id,tenant_id,run_id,platform,caption,generated_text,final_text,final_approved_content,approval_status,publish_status,live_post_url,post_url,publish_attempt_count,last_publish_attempt_at,last_publish_error,metadata,updated_at";
  let query = client
    .from("content_history")
    .select(baseSelect)
    .eq("approval_status", "approved")
    .eq("publish_status", "queued")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (options.contentHistoryId) query = query.eq("id", options.contentHistoryId);
  if (options.runId) query = query.eq("run_id", options.runId);

  const { data, error } = await query;
  if (error) throw new Error(`Queued content lookup failed: ${error.message}`);

  const rows = data || [];
  const unsafeRows = rows.filter((row) => isTestMode(row) && !dryRun);
  if (unsafeRows.length) {
    for (const row of unsafeRows) {
      await writeAudit(client, row, "cmo_publish_test_content_blocked", "Test-mode content blocked from production publishing.", { publish_status: row.publish_status, no_public_publish: true, risk_level: "High" });
    }
  }

  const publishableRows = rows.filter((row) => !isTestMode(row));
  const results = [];
  for (const row of publishableRows) {
    results.push(await executeOnePublish(client, row, { dryRun }));
  }

  return {
    ok: results.every((result) => result.ok),
    dry_run: dryRun,
    selected: rows.length,
    processed: results.length,
    blocked_test_rows: unsafeRows.length,
    linkedin_credentials_present: linkedinConfig().configured,
    instagram_credentials_present: metaConfig().instagramConfigured,
    facebook_credentials_present: metaConfig().facebookConfigured,
    results
  };
}

export function getLinkedInPublishingCredentialStatus() {
  const config = linkedinConfig();
  return { present: config.configured, missing: config.missing };
}

export function getPlatformCredentialStatus() {
  const li = linkedinConfig();
  const meta = metaConfig();
  return {
    linkedin: { present: li.configured, missing: li.missing },
    instagram: { present: meta.instagramConfigured, missing: meta.missingInstagram },
    facebook: { present: meta.facebookConfigured, missing: meta.missingFacebook }
  };
}

export { generatePostImage };

export function isAllowedPublishStatus(status) {
  return ALLOWED_STATUSES.has(String(status || "").toLowerCase());
}
