// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { runCmoPublishingEngine } from "../../lib/cmoPublishingEngine.mjs";

type PostingSetting = {
  id: string;
  tenant_id: string;
  platform: string;
  timezone?: string;
  country?: string;
  local_post_time?: string;
  schedule_mode?: string;
  schedule_days?: unknown;
  trigger_window_minutes?: number;
  platform_integration_connected?: boolean;
  approval_required?: boolean;
  last_triggered_at_utc?: string | null;
};

type DueSchedule = {
  setting: PostingSetting;
  scheduledLocal: DateTime;
  scheduledUtc: DateTime;
  day: string;
  localTime: string;
};

const DEFAULT_WINDOW_MINUTES = 10;
const VERCEL_CRON_SCHEDULE = "0 0 * * *";
const SCHEDULER_RUNTIME = "vercel_cron";

function env(name: string) {
  return typeof process !== "undefined" ? process.env[name]?.trim() || "" : "";
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
}

function getCronAuthHeader(req: any) {
  return String(req.headers.authorization || req.headers.Authorization || "");
}

function normalizeTime(value = "") {
  const [hour = "0", minute = "0"] = String(value).split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function normalizeScheduleMode(value = "") {
  const normalized = String(value).toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized === "specific_days" ? "specific_days" : "every_day";
}

function normalizeDay(value = "") {
  const lower = String(value).trim().toLowerCase();
  return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
}

function nextVercelCronWake(nowUtc: DateTime) {
  const nextMidnight = nowUtc.plus({ days: 1 }).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
  return nextMidnight.toISO();
}

function getNextSchedule(setting: PostingSetting, nowUtc: DateTime) {
  const timezone = setting.timezone || "";
  const localPostTime = normalizeTime(setting.local_post_time || "");
  if (!timezone || !DateTime.utc().setZone(timezone).isValid || !localPostTime) return null;

  const localNow = nowUtc.setZone(timezone);
  const mode = normalizeScheduleMode(setting.schedule_mode);
  const entries = mode === "specific_days" && getSpecificDayEntries(setting).length
    ? getSpecificDayEntries(setting)
    : [{ day: localNow.weekdayLong, time: localPostTime }];

  const candidates = [];
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDay = localNow.plus({ days: offset });
    for (const entry of entries) {
      if (entry.day !== candidateDay.weekdayLong) continue;
      const [hour, minute] = entry.time.split(":").map(Number);
      const scheduledLocal = candidateDay.set({ hour, minute, second: 0, millisecond: 0 });
      if (scheduledLocal > localNow) candidates.push(scheduledLocal);
    }
  }

  const next = candidates.sort((a, b) => a.toMillis() - b.toMillis())[0];
  return next ? {
    local: next.toFormat("yyyy-LL-dd HH:mm ZZZZ"),
    utc: next.toUTC().toISO(),
    timezone
  } : null;
}

function getSpecificDayEntries(setting: PostingSetting) {
  const rows = Array.isArray(setting.schedule_days) ? setting.schedule_days : [];
  return rows.map((item) => {
    if (typeof item === "string") return { day: normalizeDay(item), time: normalizeTime(setting.local_post_time) };
    if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      return {
        day: normalizeDay(String(row.day || row.weekday || "")),
        time: normalizeTime(String(row.time || row.local_post_time || setting.local_post_time || ""))
      };
    }
    return { day: "", time: "" };
  }).filter((item) => item.day && item.time);
}

function isDueNow(setting: PostingSetting, nowUtc: DateTime): DueSchedule | null {
  const timezone = setting.timezone || "Asia/Kolkata";
  if (!DateTime.local().setZone(timezone).isValid) return null;

  const localNow = nowUtc.setZone(timezone);
  const windowMinutes = Math.max(1, Number(setting.trigger_window_minutes || env("CRON_TRIGGER_WINDOW_MINUTES") || DEFAULT_WINDOW_MINUTES));
  const mode = normalizeScheduleMode(setting.schedule_mode);
  const candidates = mode === "specific_days"
    ? getSpecificDayEntries(setting)
    : [{ day: localNow.weekdayLong, time: normalizeTime(setting.local_post_time) }];
  const todayCandidates = candidates.filter((item) => item.day === localNow.weekdayLong);

  for (const candidate of todayCandidates) {
    const [hour, minute] = candidate.time.split(":").map(Number);
    const scheduledLocal = DateTime.fromObject({
      year: localNow.year,
      month: localNow.month,
      day: localNow.day,
      hour,
      minute,
      second: 0,
      millisecond: 0
    }, { zone: timezone });
    if (!scheduledLocal.isValid) continue;

    const scheduledUtc = scheduledLocal.toUTC();
    const minutesSince = nowUtc.diff(scheduledUtc, "minutes").minutes;
    if (minutesSince < 0 || minutesSince >= windowMinutes) continue;

    const lastTriggered = setting.last_triggered_at_utc
      ? DateTime.fromISO(String(setting.last_triggered_at_utc), { zone: "utc" })
      : null;
    if (lastTriggered?.isValid && lastTriggered >= scheduledUtc.minus({ minutes: 1 })) continue;

    return {
      setting,
      scheduledLocal,
      scheduledUtc,
      day: candidate.day,
      localTime: candidate.time
    };
  }

  return null;
}

async function loadPostingSettings(client: ReturnType<typeof createClient>) {
  const fullColumns = "id,tenant_id,platform,timezone,country,local_post_time,schedule_mode,schedule_days,trigger_window_minutes,platform_integration_connected,approval_required,last_triggered_at_utc";
  const fallbackColumns = "id,tenant_id,platform,timezone,country,local_post_time,platform_integration_connected,approval_required";
  const full = await client.from("cmo_posting_settings").select(fullColumns);
  if (!full.error) return { data: full.data || [], error: null, usedFallback: false };

  const fallback = await client.from("cmo_posting_settings").select(fallbackColumns);
  return {
    data: fallback.data || [],
    error: fallback.error,
    usedFallback: true
  };
}

async function writeAudit(client: ReturnType<typeof createClient>, eventType: string, status: string, safeNotes: string, metadata: Record<string, unknown> = {}) {
  const tenantId = String(metadata.tenant_id || metadata.tenantId || "11111111-1111-1111-1111-111111111111");
  await client.from("audit_logs").insert({
    tenant_id: tenantId,
    action_type: eventType,
    module: "CMO Vercel Cron",
    related_table: "cmo_posting_settings",
    actor: "Vercel Cron",
    description: safeNotes,
    risk_level: status === "failed" ? "High" : "Low",
    metadata: {
      scheduler_runtime: SCHEDULER_RUNTIME,
      status,
      ...metadata
    }
  });
}

async function upsertCronHealth(client: ReturnType<typeof createClient>, status: "live" | "error" | "pending", errorMessage: string, metadata: Record<string, unknown> = {}) {
  await client.from("platform_integrations").upsert({
    platform_key: "vercel_cron_scheduler",
    platform_name: "Vercel Cron Scheduler",
    logo_key: "vercel",
    provider: "vercel",
    status,
    runtime: SCHEDULER_RUNTIME,
    error_message: errorMessage || null,
    last_sync_at: DateTime.utc().toISO(),
    last_checked_at: DateTime.utc().toISO(),
    metadata: {
      scheduler_runtime: SCHEDULER_RUNTIME,
      cron_endpoint: "/api/cron/daily-social-trigger",
      cron_schedule: VERCEL_CRON_SCHEDULE,
      ...metadata
    }
  }, { onConflict: "platform_key" });
}

async function recordTrigger(client: ReturnType<typeof createClient>, due: DueSchedule, nowUtc: DateTime) {
  const payload = {
    tenant_id: due.setting.tenant_id,
    posting_setting_id: due.setting.id,
    platform: due.setting.platform,
    timezone: due.setting.timezone || "Asia/Kolkata",
    local_day: due.day,
    local_time: due.localTime,
    due_at_utc: due.scheduledUtc.toISO(),
    triggered_at_utc: nowUtc.toISO(),
    status: due.setting.platform_integration_connected ? "queued" : "skipped_integration_not_connected",
    trigger_source: "vercel_cron"
  };

  const existing = await client
    .from("cmo_schedule_triggers")
    .select("id,status")
    .eq("posting_setting_id", due.setting.id)
    .eq("due_at_utc", due.scheduledUtc.toISO())
    .maybeSingle();

  const triggerWrite = existing.data?.id
    ? client.from("cmo_schedule_triggers").update({ triggered_at_utc: nowUtc.toISO(), status: payload.status }).eq("id", existing.data.id).select("id").single()
    : client.from("cmo_schedule_triggers").insert(payload).select("id").single();

  const [insertResult, updateResult] = await Promise.all([
    triggerWrite,
    client.from("cmo_posting_settings").update({ last_triggered_at_utc: nowUtc.toISO() }).eq("id", due.setting.id)
  ]);

  return {
    insertOk: !insertResult.error,
    updateOk: !updateResult.error,
    warning: insertResult.error?.message || updateResult.error?.message || ""
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  const cronSecret = env("CRON_SECRET");
  const schedulerRuntime = env("SCHEDULER_RUNTIME") || SCHEDULER_RUNTIME;
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const canWriteHealth = Boolean(supabaseUrl && serviceRoleKey);
  const client = canWriteHealth ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) : null;
  const nowUtc = DateTime.utc();

  if (schedulerRuntime !== SCHEDULER_RUNTIME) {
    return res.status(200).json({ ok: false, status: "runtime_not_vercel_cron", message: "SCHEDULER_RUNTIME is not vercel_cron." });
  }

  if (!cronSecret) {
    if (client) {
      await upsertCronHealth(client, "error", "Missing CRON_SECRET", { last_cron_check_status: "failed", next_check_at_utc: nextVercelCronWake(nowUtc) }).catch(() => null);
      await writeAudit(client, "vercel_cron_health_checked", "failed", "Missing CRON_SECRET", {}).catch(() => null);
    }
    return res.status(200).json({ ok: false, status: "missing_cron_secret", message: "Missing CRON_SECRET" });
  }

  if (getCronAuthHeader(req) !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, status: "unauthorized" });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(200).json({
      ok: false,
      status: "not_configured",
      message: "Supabase server env is missing. Cron trigger did not run."
    });
  }

  const activeClient = client || createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    await writeAudit(activeClient, "vercel_cron_trigger_received", "success", "Vercel cron trigger received.", {});
    const settings = await loadPostingSettings(activeClient);
    if (settings.error) {
      await upsertCronHealth(activeClient, "error", "Supabase write failed", { last_cron_check_status: "failed", error_source: "cmo_posting_settings_read" });
      await writeAudit(activeClient, "vercel_cron_health_checked", "failed", "Posting settings could not be read safely.", {});
      return res.status(200).json({
        ok: false,
        status: "db_read_failed",
        message: "Posting settings could not be read safely."
      });
    }

    const settingRows = settings.data as PostingSetting[];
    const selectedSetting = settingRows.find((setting) => setting.timezone && setting.local_post_time) || settingRows[0];
    if (!selectedSetting?.timezone) {
      await upsertCronHealth(activeClient, "error", "Missing selected timezone", { last_cron_check_status: "failed", next_check_at_utc: nextVercelCronWake(nowUtc) });
      await writeAudit(activeClient, "vercel_cron_health_checked", "failed", "Missing selected timezone.", { tenant_id: selectedSetting?.tenant_id });
      return res.status(200).json({ ok: false, status: "missing_selected_timezone", message: "Missing selected timezone" });
    }
    if (!selectedSetting?.local_post_time) {
      await upsertCronHealth(activeClient, "error", "Missing selected posting time", { timezone: selectedSetting.timezone, last_cron_check_status: "failed", next_check_at_utc: nextVercelCronWake(nowUtc) });
      await writeAudit(activeClient, "vercel_cron_health_checked", "failed", "Missing selected posting time.", { tenant_id: selectedSetting.tenant_id, timezone: selectedSetting.timezone });
      return res.status(200).json({ ok: false, status: "missing_selected_posting_time", message: "Missing selected posting time" });
    }

    const nextSchedule = getNextSchedule(selectedSetting, nowUtc);
    const dueSchedules = settingRows
      .map((setting) => isDueNow(setting, nowUtc))
      .filter(Boolean) as DueSchedule[];
    const results = [];

    for (const due of dueSchedules) {
      const record = await recordTrigger(activeClient, due, nowUtc);
      if (!record.insertOk || !record.updateOk) {
        await writeAudit(activeClient, "vercel_cron_workflow_failed", "failed", record.warning || "Workflow trigger failed", { tenant_id: due.setting.tenant_id, platform: due.setting.platform });
      } else {
        await writeAudit(activeClient, "vercel_cron_workflow_started", "success", "Vercel cron workflow trigger row created or reused.", { tenant_id: due.setting.tenant_id, platform: due.setting.platform });
      }
      results.push({
        id: due.setting.id,
        platform: due.setting.platform,
        timezone: due.setting.timezone || "Asia/Kolkata",
        localDay: due.day,
        localTime: due.localTime,
        dueAtUtc: due.scheduledUtc.toISO(),
        ...record
      });
    }

    if (dueSchedules.length) {
      await writeAudit(activeClient, "vercel_cron_schedule_due", "success", `${dueSchedules.length} due schedule(s) found.`, { tenant_id: selectedSetting.tenant_id, due_count: dueSchedules.length });

      // Trigger actual publishing for all due platforms
      const dryRun = env("DRY_RUN") === "true";
      let publishSummary = null;
      try {
        publishSummary = await runCmoPublishingEngine({ client: activeClient, limit: 10, dryRun });
        await writeAudit(activeClient, "vercel_cron_publish_triggered", publishSummary.ok ? "success" : "failed",
          dryRun ? "Dry-run publish completed." : `Publishing completed: ${publishSummary.processed} processed, ${publishSummary.results?.filter((r: any) => r.ok).length || 0} succeeded.`,
          { tenant_id: selectedSetting.tenant_id, dry_run: dryRun, processed: publishSummary.processed, selected: publishSummary.selected }
        );
      } catch (publishError) {
        const msg = publishError instanceof Error ? publishError.message : "Unknown publishing error";
        console.error("[cron] Publishing engine failed safely:", msg);
        await writeAudit(activeClient, "vercel_cron_publish_triggered", "failed", `Publishing engine failed safely: ${msg}`, { tenant_id: selectedSetting.tenant_id });
      }

      // --- Daily Spice Export Post (real social posting) ---
      if (!dryRun) {
        const DAILY_TOPICS: Record<string, string> = {
          Monday: "Red Chilli export quality — Guntur mandi prices today",
          Tuesday: "Turmeric export — Nizamabad mandi update",
          Wednesday: "Black Pepper from Kerala — export grade quality",
          Thursday: "Cumin Seeds — Unjha mandi prices & export grade",
          Friday: "Spice export tips — documentation checklist",
          Saturday: "Weekend market update — spice prices from India",
          Sunday: "Export success story — GOPU Exports quality commitment"
        };
        const HASHTAGS = "#SpiceExport #IndiaExports #APEDA #SpicesOfIndia #ExportFromIndia #B2BTrade";
        const todayName = nowUtc.setZone("Asia/Kolkata").weekdayLong;
        const topicLine = DAILY_TOPICS[todayName] || DAILY_TOPICS["Monday"];
        const dailyContent = `${topicLine}\n\nGOPU Exports delivers premium quality Indian spices to global buyers. Contact us for competitive export pricing, APEDA-certified shipments, and consistent supply chain reliability.\n\n${HASHTAGS}`;

        const baseUrl = env("NEXT_PUBLIC_APP_URL") || env("VERCEL_URL") ? `https://${env("VERCEL_URL")}` : "http://localhost:3000";
        const socialPlatforms = ["facebook", "instagram", "linkedin"];
        const spicePostResults: Array<{ platform: string; ok: boolean; post_id?: string; url?: string; error?: string }> = [];

        for (const platform of socialPlatforms) {
          try {
            const publishRes = await fetch(`${baseUrl}/api/cmo/social/publish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ platform, content: dailyContent }),
              signal: AbortSignal.timeout(10000)
            });
            const publishData = await publishRes.json().catch(() => ({ ok: false, error: "Invalid JSON response" }));
            spicePostResults.push({ platform, ...publishData });

            await activeClient.from("agent_decisions").insert({
              agent: "CMO",
              decision_type: "social_post",
              platform,
              status: publishData.ok ? "success" : "failed",
              notes: publishData.ok
                ? `Daily spice post published to ${platform}: ${publishData.url || ""}`
                : `Daily spice post failed on ${platform}: ${publishData.error || "unknown"}`,
              metadata: {
                post_id: publishData.post_id,
                url: publishData.url,
                error: publishData.error,
                topic: topicLine,
                day: todayName,
                content_preview: dailyContent.slice(0, 100),
                timestamp: new Date().toISOString()
              }
            }).catch(() => null);

            console.log(`[cron] Daily spice post — ${platform}:`, publishData.ok ? `ok (${publishData.url})` : `failed (${publishData.error})`);
          } catch (spicePostError) {
            const errMsg = spicePostError instanceof Error ? spicePostError.message : "Unknown error";
            spicePostResults.push({ platform, ok: false, error: errMsg });
            await activeClient.from("agent_decisions").insert({
              agent: "CMO",
              decision_type: "social_post",
              platform,
              status: "failed",
              notes: `Daily spice post threw exception on ${platform}: ${errMsg}`,
              metadata: { error: errMsg, topic: topicLine, day: todayName, timestamp: new Date().toISOString() }
            }).catch(() => null);
            console.error(`[cron] Daily spice post exception — ${platform}:`, errMsg);
          }
        }

        const spiceSucceeded = spicePostResults.filter((r) => r.ok);
        const spiceFailed = spicePostResults.filter((r) => !r.ok);
        await writeAudit(activeClient, "vercel_cron_daily_spice_post", spiceSucceeded.length > 0 ? "success" : "failed",
          `Daily spice post: ${spiceSucceeded.length} succeeded, ${spiceFailed.length} failed/skipped. Topic: ${topicLine}`,
          {
            tenant_id: selectedSetting.tenant_id,
            topic: topicLine,
            day: todayName,
            succeeded: spiceSucceeded.map((r) => r.platform),
            failed: spiceFailed.map((r) => ({ platform: r.platform, error: r.error }))
          }
        );
      }
      // --- End Daily Spice Export Post ---

      // Send Slack summary of what was posted
      const webhookUrl = env("SLACK_WEBHOOK_URL");
      if (webhookUrl && publishSummary) {
        const succeeded = (publishSummary.results || []).filter((r: any) => r.ok);
        const failed = (publishSummary.results || []).filter((r: any) => !r.ok);
        const lines = [
          `*GOPU OS — Daily Post Summary* (9am IST)`,
          dryRun ? "_Dry-run mode — no posts were published_" : "",
          `✓ Published: ${succeeded.length}`,
          failed.length ? `✗ Failed: ${failed.length}` : "",
          ...succeeded.map((r: any) => `  • ${r.content_history?.platform || "Platform"}: ${r.content_history?.post_url || r.message || "posted"}`),
          failed.length ? `\nFailed items require manual review in GOPU OS CMO.` : ""
        ].filter(Boolean).join("\n");
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: lines })
        }).catch(() => null);
      }
    } else {
      await writeAudit(activeClient, "vercel_cron_schedule_not_due", "success", "No CMO social schedule due in this cron window.", { tenant_id: selectedSetting.tenant_id });
    }

    const failedTrigger = results.find((item) => !item.insertOk || !item.updateOk);
    await upsertCronHealth(activeClient, failedTrigger ? "error" : "live", failedTrigger?.warning || "", {
      tenant_id: selectedSetting.tenant_id,
      endpoint_verified: true,
      cron_secret_configured: true,
      selected_timezone: selectedSetting.timezone,
      selected_country: selectedSetting.country || "",
      selected_posting_time: normalizeTime(selectedSetting.local_post_time || ""),
      next_check_at_utc: nextVercelCronWake(nowUtc),
      next_scheduled_post_local: nextSchedule?.local || "",
      next_scheduled_post_utc: nextSchedule?.utc || "",
      last_cron_check_status: failedTrigger ? "failed" : "success",
      due_count: dueSchedules.length,
      checked_count: settings.data.length
    });
    await writeAudit(activeClient, "vercel_cron_health_checked", failedTrigger ? "failed" : "success", failedTrigger?.warning || "Vercel cron health check succeeded.", { tenant_id: selectedSetting.tenant_id });

    return res.status(200).json({
      ok: true,
      status: "checked",
      nowUtc: nowUtc.toISO(),
      checked: settings.data.length,
      due: dueSchedules.length,
      usedFallbackSchema: settings.usedFallback,
      runtime: SCHEDULER_RUNTIME,
      timezone: selectedSetting.timezone,
      postingTime: normalizeTime(selectedSetting.local_post_time || ""),
      nextCheckAtUtc: nextVercelCronWake(nowUtc),
      nextScheduledPost: nextSchedule,
      triggered: results
    });
  } catch (error) {
    console.error("[cron] content scheduler failed safely", {
      message: error instanceof Error ? error.message : "Unknown cron error"
    });
    await upsertCronHealth(activeClient, "error", "Workflow trigger failed", { last_cron_check_status: "failed" }).catch(() => null);
    await writeAudit(activeClient, "vercel_cron_workflow_failed", "failed", "Cron trigger failed safely. No publishing was attempted.", {}).catch(() => null);
    return res.status(200).json({
      ok: false,
      status: "failed_safely",
      message: "Cron trigger failed safely. No publishing was attempted."
    });
  }
}
