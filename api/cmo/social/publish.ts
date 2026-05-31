// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  return typeof process !== "undefined" ? process.env[name]?.trim() || "" : "";
}

function getSupabaseClient() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function logDecision(client: any, platform: string, status: string, notes: string, metadata: Record<string, unknown> = {}) {
  if (!client) return;
  try {
    await client.from("agent_decisions").insert({
      agent: "CMO",
      decision_type: "social_post",
      platform,
      status,
      notes,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    });
  } catch {
    // Publishing response should not fail when decision logging is unavailable.
  }
}

async function postToFacebook(content: string): Promise<{ ok: boolean; post_id?: string; url?: string; error?: string }> {
  const token = env("META_ACCESS_TOKEN");
  const pageId = env("FACEBOOK_PAGE_ID");
  if (!token || !pageId) {
    return { ok: false, error: "Facebook not configured: missing META_ACCESS_TOKEN or FACEBOOK_PAGE_ID" };
  }

  const params = new URLSearchParams({ access_token: token, message: content });
  const res = await fetch(`https://graph.facebook.com/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: AbortSignal.timeout(10000)
  });

  const data = await res.json();
  if (!res.ok || !data.id) {
    return { ok: false, error: data.error?.message || `Facebook API error: ${res.status}` };
  }

  return {
    ok: true,
    post_id: data.id,
    url: `https://www.facebook.com/${data.id.replace("_", "/posts/")}`
  };
}

async function postToInstagram(content: string, imageUrl?: string): Promise<{ ok: boolean; post_id?: string; url?: string; error?: string }> {
  const token = env("META_ACCESS_TOKEN");
  const accountId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  if (!token || !accountId) {
    return { ok: false, error: "Instagram not configured: missing META_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID" };
  }
  if (!imageUrl) {
    return { ok: false, error: "Instagram skipped: no image_url provided (text-only Instagram posts require Reels or Carousel which need media)" };
  }

  // Step 1: Create media container
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption: content,
    access_token: token
  });
  const containerRes = await fetch(`https://graph.facebook.com/${accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: containerParams.toString(),
    signal: AbortSignal.timeout(10000)
  });

  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    return { ok: false, error: containerData.error?.message || `Instagram container creation failed: ${containerRes.status}` };
  }

  // Step 2: Publish container
  const publishParams = new URLSearchParams({
    creation_id: containerData.id,
    access_token: token
  });
  const publishRes = await fetch(`https://graph.facebook.com/${accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString(),
    signal: AbortSignal.timeout(10000)
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    return { ok: false, error: publishData.error?.message || `Instagram publish failed: ${publishRes.status}` };
  }

  return {
    ok: true,
    post_id: publishData.id,
    url: `https://www.instagram.com/p/${publishData.id}/`
  };
}

async function postToLinkedIn(content: string): Promise<{ ok: boolean; post_id?: string; url?: string; error?: string }> {
  const token = env("LINKEDIN_ACCESS_TOKEN");
  const orgId = env("LINKEDIN_ORGANIZATION_ID");
  if (!token || !orgId) {
    return { ok: false, error: "LinkedIn not configured: missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_ORGANIZATION_ID" };
  }

  const body = {
    author: `urn:li:organization:${orgId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "NONE"
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });

  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.message || `LinkedIn API error: ${res.status}` };
  }

  const postId = data.id || res.headers.get("x-restli-id") || "";
  return {
    ok: true,
    post_id: postId,
    url: postId ? `https://www.linkedin.com/feed/update/${postId}/` : "https://www.linkedin.com/"
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { platform, content, image_url } = req.body || {};

  if (!platform || !content) {
    return res.status(400).json({ ok: false, error: "Missing required fields: platform, content" });
  }

  const client = getSupabaseClient();
  let result: { ok: boolean; post_id?: string; url?: string; error?: string };

  const platformLower = String(platform).toLowerCase();

  if (platformLower === "facebook") {
    result = await postToFacebook(content);
  } else if (platformLower === "instagram") {
    result = await postToInstagram(content, image_url);
  } else if (platformLower === "linkedin") {
    result = await postToLinkedIn(content);
  } else {
    return res.status(400).json({ ok: false, error: `Unsupported platform: ${platform}. Use facebook, instagram, or linkedin.` });
  }

  await logDecision(client, platformLower, result.ok ? "success" : "failed", result.error || `Posted successfully to ${platform}`, {
    post_id: result.post_id,
    url: result.url,
    error: result.error,
    content_preview: content.slice(0, 100)
  });

  if (!result.ok) {
    console.warn(`[social/publish] ${platform} post failed:`, result.error);
    return res.status(200).json({ ok: false, error: result.error });
  }

  return res.status(200).json({
    ok: true,
    post_id: result.post_id,
    url: result.url
  });
}
