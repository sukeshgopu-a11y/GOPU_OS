const LINKEDIN_API_VERSION = "202605";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown LinkedIn personal publishing error";
}

function withGopuHashtag(text: string): string {
  const clean = String(text || "").trim();
  if (!clean) return "#GopuExports";
  return /(^|\s)#GopuExports\b/i.test(clean) ? clean : `${clean}\n\n#GopuExports`;
}

async function readLinkedInJson(url: string, token: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { response, body };
}

async function resolvePersonalAuthorUrn(token: string): Promise<{ ok: boolean; authorUrn?: string; error?: string }> {
  const explicit = env("LINKEDIN_PERSON_URN") || env("LINKEDIN_MEMBER_URN");
  if (explicit) {
    return { ok: true, authorUrn: explicit.startsWith("urn:li:person:") ? explicit : `urn:li:person:${explicit}` };
  }

  try {
    const userInfo = await readLinkedInJson("https://api.linkedin.com/v2/userinfo", token);
    const sub = String(userInfo.body.sub || "").trim();
    if (userInfo.response.ok && sub) return { ok: true, authorUrn: `urn:li:person:${sub}` };

    const profile = await readLinkedInJson("https://api.linkedin.com/v2/me", token);
    const id = String(profile.body.id || "").trim();
    if (profile.response.ok && id) return { ok: true, authorUrn: `urn:li:person:${id}` };

    return {
      ok: false,
      error: "LinkedIn personal author could not be resolved. Add LINKEDIN_PERSON_URN or authorize profile lookup with the token."
    };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

export function getLinkedInPersonalEnvStatus() {
  const required = ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI", "LINKEDIN_ACCESS_TOKEN"];
  const missing = required.filter((name) => !env(name));
  return {
    platform_key: "linkedin_personal",
    platform_name: "LinkedIn Personal",
    configured: missing.length === 0,
    missing,
    scope_required: "w_member_social"
  };
}

export async function publishLinkedInPersonalPost({ text, mediaUrl }: { text: string; mediaUrl?: string }) {
  const token = env("LINKEDIN_ACCESS_TOKEN");
  if (!token) {
    return { ok: false, status: "missing_credentials", error: "LinkedIn personal publishing is not configured." };
  }

  if (mediaUrl) {
    return {
      ok: false,
      status: "unsupported_media",
      error: "LinkedIn personal image upload is not enabled yet. Publish text-only or enable the LinkedIn media upload workflow first."
    };
  }

  const author = await resolvePersonalAuthorUrn(token);
  if (!author.ok || !author.authorUrn) {
    return { ok: false, status: "missing_author", error: author.error || "LinkedIn personal author is missing." };
  }

  const postText = withGopuHashtag(text);
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Linkedin-Version": env("LINKEDIN_API_VERSION") || LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify({
      author: author.authorUrn,
      commentary: postText,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false
    }),
    signal: AbortSignal.timeout(15000)
  });

  const responseText = await response.text().catch(() => "");
  let parsed: any = {};
  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch {
    parsed = { message: responseText };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: "linkedin_api_failed",
      error: parsed?.message || parsed?.error?.message || `LinkedIn API returned HTTP ${response.status}.`
    };
  }

  const postUrn = String(parsed?.id || response.headers.get("x-restli-id") || "").trim();
  return {
    ok: true,
    status: "published",
    post_id: postUrn,
    post_urn: postUrn,
    post_url: postUrn ? `https://www.linkedin.com/feed/update/${postUrn}` : "",
    text: postText
  };
}
