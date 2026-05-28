import { env } from "./learningCentreDb.mjs";

export class WebSearchProvider {
  async search() {
    throw new Error("WebSearchProvider.search must be implemented.");
  }
}

export class TavilySearchProvider extends WebSearchProvider {
  constructor({ apiKey = env("TAVILY_API_KEY") } = {}) {
    super();
    this.apiKey = apiKey;
  }

  async search(query, { maxResults = 3 } = {}) {
    if (!this.apiKey) throw new Error("TAVILY_API_KEY is missing.");
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `Tavily search failed with HTTP ${response.status}`);
    return (body.results || []).slice(0, maxResults).map((result) => ({
      title: result.title || "",
      url: result.url || "",
      snippet: result.content || result.snippet || "",
      source_type: "web"
    })).filter((result) => result.url);
  }
}

export function createWebSearchProvider() {
  const provider = env("WEB_SEARCH_PROVIDER", "tavily").toLowerCase();
  if (provider !== "tavily") {
    throw new Error(`Unsupported WEB_SEARCH_PROVIDER: ${provider}`);
  }
  return new TavilySearchProvider();
}
