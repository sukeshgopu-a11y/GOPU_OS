import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

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

const DEFAULT_WINDOW_MINUTES = 5;

function env(name: string) {
  return typeof process !== "undefined" ? process.env[name]?.trim() || "" : "";
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
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

  const [insertResult, updateResult] = await Promise.all([
    client.from("cmo_schedule_triggers").insert(payload).select("id").single(),
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
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, status: "unauthorized" });
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(200).json({
      ok: false,
      status: "not_configured",
      message: "Supabase server env is missing. Cron trigger did not run."
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const nowUtc = DateTime.utc();

  try {
    const settings = await loadPostingSettings(client);
    if (settings.error) {
      return res.status(200).json({
        ok: false,
        status: "db_read_failed",
        message: "Posting settings could not be read safely."
      });
    }

    const dueSchedules = (settings.data as PostingSetting[])
      .map((setting) => isDueNow(setting, nowUtc))
      .filter(Boolean) as DueSchedule[];
    const results = [];

    for (const due of dueSchedules) {
      results.push({
        id: due.setting.id,
        platform: due.setting.platform,
        timezone: due.setting.timezone || "Asia/Kolkata",
        localDay: due.day,
        localTime: due.localTime,
        dueAtUtc: due.scheduledUtc.toISO(),
        ...(await recordTrigger(client, due, nowUtc))
      });
    }

    return res.status(200).json({
      ok: true,
      status: "checked",
      nowUtc: nowUtc.toISO(),
      checked: settings.data.length,
      due: dueSchedules.length,
      usedFallbackSchema: settings.usedFallback,
      triggered: results
    });
  } catch (error) {
    console.error("[cron] content scheduler failed safely", {
      message: error instanceof Error ? error.message : "Unknown cron error"
    });
    return res.status(200).json({
      ok: false,
      status: "failed_safely",
      message: "Cron trigger failed safely. No publishing was attempted."
    });
  }
}
