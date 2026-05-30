// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
function env(k: string) { return process.env[k]?.trim() || ""; }
function getSupabase() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const config = { api: { bodyParser: true } };

async function researchWithOpenAI(company_name: string, country: string, product_category: string) {
  const apiKey = env("OPENAI_API_KEY");
  const prompt = `You are a trade intelligence analyst specializing in Indian spice exports. Research the following company as a potential buyer:

Company: ${company_name}
Country: ${country}
Product Category: ${product_category || "Indian spices"}

Return ONLY a valid JSON object (no markdown, no extra text) with these fields:
{
  "buyer_name": "primary contact name if known, else null",
  "company_name": "${company_name}",
  "country": "${country}",
  "website_guess": "most likely website URL or null",
  "estimated_import_volume": "estimated annual import volume in USD or description",
  "products_interested": ["array", "of", "spice", "products"],
  "confidence_score": 0.0,
  "research_notes": "detailed notes about this company as a potential buyer for Indian spices"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  // Strip markdown code fences if present
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

function getMockResearch(company_name: string, country: string, product_category: string) {
  return {
    buyer_name: null,
    company_name,
    country,
    website_guess: `https://www.${company_name.toLowerCase().replace(/\s+/g, "")}.com`,
    estimated_import_volume: "Unknown - requires further investigation",
    products_interested: product_category ? [product_category] : ["turmeric", "cumin", "coriander", "black pepper"],
    confidence_score: 0.3,
    research_notes: `Mock research data for ${company_name} in ${country}. Set OPENAI_API_KEY to enable real AI-powered research.`,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { company_name, country, product_category } = req.body || {};
  if (!company_name || !country) {
    return res.status(400).json({ ok: false, error: "company_name and country are required" });
  }

  const supabase = getSupabase();
  let research: any;
  let usedAI = false;

  try {
    const openaiKey = env("OPENAI_API_KEY");
    if (openaiKey) {
      research = await researchWithOpenAI(company_name, country, product_category || "");
      usedAI = true;
    } else {
      research = getMockResearch(company_name, country, product_category || "");
    }
  } catch (err: any) {
    // Fallback to mock on AI error
    research = getMockResearch(company_name, country, product_category || "");
    research.research_notes += ` (AI error: ${err.message})`;
  }

  let saved = false;
  let buyer_id: string | null = null;

  if (supabase) {
    try {
      // Check if buyer already exists
      const { data: existing } = await supabase
        .from("cio_buyer_intelligence")
        .select("id")
        .eq("tenant_id", TENANT_ID)
        .ilike("company_name", company_name)
        .ilike("country", country)
        .maybeSingle();

      if (existing) {
        buyer_id = existing.id;
        // Update with new research
        await supabase
          .from("cio_buyer_intelligence")
          .update({
            website: research.website_guess,
            estimated_import_volume: research.estimated_import_volume,
            products_interested: research.products_interested,
            confidence_score: research.confidence_score,
            research_notes: research.research_notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", buyer_id);
        saved = true;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("cio_buyer_intelligence")
          .insert({
            tenant_id: TENANT_ID,
            buyer_name: research.buyer_name,
            company_name: research.company_name,
            country: research.country,
            website: research.website_guess,
            estimated_import_volume: research.estimated_import_volume,
            products_interested: research.products_interested,
            confidence_score: research.confidence_score,
            research_notes: research.research_notes,
            product_category: product_category || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!insertErr && inserted) {
          buyer_id = inserted.id;
          saved = true;
        }
      }

      // Log to agent_decisions
      await supabase.from("agent_decisions").insert({
        tenant_id: TENANT_ID,
        agent: "CIO",
        decision_type: "buyer_research",
        decision_data: {
          company_name,
          country,
          product_category: product_category || null,
          buyer_id,
          used_ai: usedAI,
          confidence_score: research.confidence_score,
        },
        created_at: new Date().toISOString(),
      });
    } catch (dbErr: any) {
      // DB errors are non-fatal; still return research
      console.error("DB error:", dbErr.message);
    }
  }

  return res.status(200).json({
    ok: true,
    research,
    saved,
    buyer_id,
  });
}
