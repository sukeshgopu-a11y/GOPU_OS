// @ts-nocheck
function env(name: string) {
  return typeof process !== "undefined" ? process.env[name]?.trim() || "" : "";
}

type PlatformStatus = {
  platform: string;
  configured: boolean;
  missing_vars: string[];
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const platforms: PlatformStatus[] = [];

  // Facebook
  const fbToken = env("META_ACCESS_TOKEN");
  const fbPageId = env("FACEBOOK_PAGE_ID");
  const fbMissing = [
    !fbToken && "META_ACCESS_TOKEN",
    !fbPageId && "FACEBOOK_PAGE_ID"
  ].filter(Boolean) as string[];
  platforms.push({
    platform: "facebook",
    configured: fbMissing.length === 0,
    missing_vars: fbMissing
  });

  // Instagram
  const igAccountId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  const igMissing = [
    !fbToken && "META_ACCESS_TOKEN",
    !igAccountId && "INSTAGRAM_BUSINESS_ACCOUNT_ID"
  ].filter(Boolean) as string[];
  platforms.push({
    platform: "instagram",
    configured: igMissing.length === 0,
    missing_vars: igMissing
  });

  // LinkedIn Personal
  const liClientId = env("LINKEDIN_CLIENT_ID");
  const liClientSecret = env("LINKEDIN_CLIENT_SECRET");
  const liRedirectUri = env("LINKEDIN_REDIRECT_URI");
  const liToken = env("LINKEDIN_ACCESS_TOKEN");
  const liMissing = [
    !liClientId && "LINKEDIN_CLIENT_ID",
    !liClientSecret && "LINKEDIN_CLIENT_SECRET",
    !liRedirectUri && "LINKEDIN_REDIRECT_URI",
    !liToken && "LINKEDIN_ACCESS_TOKEN",
  ].filter(Boolean) as string[];
  platforms.push({
    platform: "linkedin_personal",
    configured: liMissing.length === 0,
    missing_vars: liMissing
  });

  const configuredCount = platforms.filter((p) => p.configured).length;

  return res.status(200).json({
    ok: true,
    configured_count: configuredCount,
    total: platforms.length,
    platforms
  });
}
