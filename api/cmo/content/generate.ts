import { createClient } from "@supabase/supabase-js";
import { getCmoContentSystemPrompt } from "../../../lib/contentQualityEngine.mjs";
import { ensureLinkedInPostRules, isLinkedInPlatform } from "../../../lib/cmoLinkedInRules.mjs";
import { ensureCmoCanvaApprovalRow, ensureCmoCanvaDesignForApproval } from "../../../lib/cmoCanvaWorkflow.mjs";

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function getClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function extractText(body: any = {}) {
  if (typeof body.output_text === "string") return body.output_text;
  const outputText = body.output?.flatMap((item: any) => item.content || [])
    .map((content: any) => content.text || "")
    .join("")
    .trim();
  if (outputText) return outputText;
  return body.choices?.map((choice: any) => choice.message?.content || choice.text || "").join("").trim() || "";
}

function safeJson(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizePlatform(value = "") {
  const platform = String(value || "LinkedIn").trim().toLowerCase();
  if (platform === "linkedin personal" || platform === "linkedin_personal" || platform === "linkedin-personal") return "LinkedIn Personal";
  if (platform === "instagram") return "Instagram";
  if (platform === "facebook") return "Facebook";
  return "LinkedIn";
}

async function generateWithOpenAI(payload: any) {
  const key = env("OPENAI_API_KEY");
  if (!key) return { ok: false, status: "missing_openai", message: "OPENAI_API_KEY is missing." };

  const platform = normalizePlatform(payload.platform);
  const topic = String(payload.topic || "Indian spice export buyer trust and quality proof").trim();
  const companyContext = String(payload.company_context || "GOPU Exports exports Indian spices including chilli, turmeric, cumin, black pepper, and coriander to global importers.").trim();
  const style = String(payload.style || "founder-led, premium, direct, export authority").trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env("OPENAI_CONTENT_FAST_MODEL") || env("OPENAI_SUMMARY_MODEL") || "gpt-5.5",
      input: [
        { role: "system", content: getCmoContentSystemPrompt() },
        {
          role: "user",
          content: JSON.stringify({
            task: "Generate one social media post for founder approval. Do not publish.",
            platform,
            topic,
            company_context: companyContext,
            style,
            output_schema: {
              headline: "string",
              slides: [{ heading: "string", body: "string" }],
              caption: "string",
              generated_text: "string",
              final_text: "string",
              hashtags: ["string"],
              canva_template_type: "knowledge_carousel | shipment_announcement | market_update | product_spotlight | buyer_education"
            }
          })
        }
      ],
      text: { format: { type: "json_object" } }
    })
  });

  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: "openai_failed", message: body?.error?.message || `OpenAI returned HTTP ${response.status}.` };
  }

  const parsed = safeJson(extractText(body));
  if (!parsed) return { ok: false, status: "invalid_ai_json", message: "OpenAI response could not be parsed." };
  if (isLinkedInPlatform(platform)) {
    const baseText = parsed.final_text || parsed.generated_text || parsed.caption || "";
    const enforced = ensureLinkedInPostRules(baseText, {
      platform,
      topic,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      companyPageAvailable: platform === "LinkedIn" && Boolean(env("LINKEDIN_ORGANIZATION_ID"))
    });
    parsed.caption = enforced.text;
    parsed.generated_text = enforced.text;
    parsed.final_text = enforced.text;
    parsed.hashtags = enforced.hashtags;
  }
  parsed.image_prompt = "";
  parsed.slides = Array.isArray(parsed.slides) ? parsed.slides.slice(0, 10) : [];
  return { ok: true, platform, topic, content: parsed };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(200).json({ ok: false, status: "method_not_allowed", message: "POST required." });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const ai = await generateWithOpenAI(payload);
    if (!ai.ok) return res.status(200).json(ai);

    const client = getClient();
    if (!client) {
      return res.status(200).json({ ok: false, status: "not_configured", message: "Supabase server env is missing.", generated_content: ai.content });
    }

    const runId = `cmo-${Date.now()}`;
    const caption = ai.content.caption || ai.content.generated_text || "";
    const generatedText = ai.content.generated_text || ai.content.final_text || caption;
    const finalText = ai.content.final_text || generatedText;
    const { data, error } = await client.from("content_history").insert({
      tenant_id: payload.tenant_id || DEMO_TENANT_ID,
      run_id: runId,
      platform: ai.platform,
      caption,
      generated_text: generatedText,
      final_text: finalText,
      image_prompt: "",
      hashtags: Array.isArray(ai.content.hashtags) ? ai.content.hashtags : [],
      approval_status: "pending_approval",
      publish_status: "not_published",
      metadata: {
        topic: ai.topic,
        company_context: payload.company_context || "",
        style: payload.style || "",
        hashtags: Array.isArray(ai.content.hashtags) ? ai.content.hashtags : [],
        canva_required: true,
        no_ai_image_text: true,
        director_approval_required: true,
        canva_content: {
          headline: ai.content.headline || ai.topic,
          slides: Array.isArray(ai.content.slides) ? ai.content.slides : [],
          caption: finalText,
          hashtags: Array.isArray(ai.content.hashtags) ? ai.content.hashtags : [],
          template_type: ai.content.canva_template_type || ""
        },
        linkedin_knowledge_hub_template: isLinkedInPlatform(ai.platform) ? "linkedin_default_knowledge_post_template_v1" : null,
        linkedin_style_scope: isLinkedInPlatform(ai.platform) ? "linkedin_only" : null,
        founder_approval_required: true,
        source: "api/cmo/content/generate"
      }
    }).select("*").maybeSingle();

    if (error) return res.status(200).json({ ok: false, status: "db_insert_failed", message: error.message, generated_content: ai.content });
    await ensureCmoCanvaApprovalRow(client, data);
    const canva = await ensureCmoCanvaDesignForApproval(data, { client });
    return res.status(200).json({
      ok: true,
      status: canva.ok ? "generated_with_canva" : "generated_canva_pending",
      content_history: canva.content_history || data,
      canva: {
        ok: canva.ok,
        status: canva.status,
        message: canva.message || "",
        missing: canva.missing || []
      }
    });
  } catch (error: any) {
    return res.status(200).json({ ok: false, status: "failed_safely", message: error?.message || "CMO content generation failed safely." });
  }
}
