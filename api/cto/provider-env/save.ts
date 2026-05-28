import fs from "node:fs/promises";
import path from "node:path";
import { getCtoProviderEnvConfig } from "../../../lib/ctoEnvKeys.mjs";

function isLocalRequest(req: any) {
  const host = String(req.headers.host || "");
  return host.startsWith("127.0.0.1") || host.startsWith("localhost");
}

function normalizeBody(req: any) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}

function parseEnvLines(content = "") {
  return content.split(/\r?\n/);
}

function findExistingEnvName(lines: string[], aliases: string[]) {
  const aliasSet = new Set(aliases.map((alias) => alias.toLowerCase()));
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match && aliasSet.has(match[1].toLowerCase())) return match[1];
  }
  return "";
}

function quoteEnvValue(value: string) {
  if (!/[#\s"'`]/.test(value)) return value;
  return JSON.stringify(value);
}

function updateEnvContent(content: string, envName: string, value: string) {
  const lines = parseEnvLines(content);
  const nextLine = `${envName}=${quoteEnvValue(value)}`;
  let updated = false;
  const nextLines = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match && match[1] === envName) {
      updated = true;
      return nextLine;
    }
    return line;
  });
  if (!updated) {
    if (nextLines.length && nextLines[nextLines.length - 1].trim()) nextLines.push("");
    nextLines.push("# CTO provider vault");
    nextLines.push(nextLine);
  }
  return nextLines.join("\n").replace(/\n{3,}/g, "\n\n");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, status: "method_not_allowed" });
  }

  if (process.env.VERCEL || !isLocalRequest(req)) {
    return res.status(200).json({
      ok: false,
      status: "manual_env_required",
      message: "Production env must be set in Vercel or server environment, not written by the app."
    });
  }

  try {
    const body = normalizeBody(req);
    const serviceId = String(body.serviceId || body.provider || "").trim().toLowerCase();
    const value = String(body.value || "").trim();
    const config = getCtoProviderEnvConfig(serviceId);

    if (!config) {
      return res.status(200).json({ ok: false, status: "unsupported_provider", message: "No CTO env mapping exists for this provider." });
    }
    if (!value || value.length < 8) {
      return res.status(200).json({ ok: false, status: "invalid_secret", message: "Provider key is missing or too short." });
    }

    const envPath = path.join(process.cwd(), ".env.local");
    const existing = await fs.readFile(envPath, "utf8").catch(() => "");
    const targetName = findExistingEnvName(parseEnvLines(existing), config.aliases) || config.primary;
    const nextContent = updateEnvContent(existing, targetName, value);
    await fs.writeFile(envPath, nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`, "utf8");

    console.log("[cto-provider-env]", JSON.stringify({ provider: serviceId, event: "saved", envName: targetName }));
    return res.status(200).json({
      ok: true,
      status: "saved",
      env_name: targetName,
      message: `${targetName} saved to .env.local. Restart the dev server to load it.`
    });
  } catch (error) {
    console.error("[cto-provider-env]", {
      event: "save_failed",
      message: error instanceof Error ? error.message : "Unknown env save error"
    });
    return res.status(200).json({ ok: false, status: "save_failed", message: "Provider key could not be saved safely." });
  }
}
