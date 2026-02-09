import { Type } from "@sinclair/typebox";

const SAFE_BASE = "https://www.moltbook.com/api/v1";

type PluginCfg = {
  apiBase?: string;
  apiKey?: string;
  defaultSubmolt?: string;
  requestTimeoutMs?: number;
};

function getCfg(api: any): Required<Pick<PluginCfg, "apiBase">> & PluginCfg {
  const cfg = (api.pluginConfig ?? {}) as PluginCfg;
  const apiBase = (cfg.apiBase || SAFE_BASE).trim();
  if (!apiBase.startsWith(SAFE_BASE)) {
    throw new Error(`Unsafe apiBase. Must use ${SAFE_BASE}`);
  }
  return { ...cfg, apiBase };
}

function getApiKey(api: any): string {
  const cfg = getCfg(api);
  const key = (cfg.apiKey || process.env.MOLTBOOK_API_KEY || "").trim();
  if (!key) throw new Error("Missing MoltBook API key (plugin config apiKey or MOLTBOOK_API_KEY)");
  return key;
}

async function callMoltbook(api: any, path: string, init: RequestInit = {}) {
  const cfg = getCfg(api);
  const apiKey = getApiKey(api);
  const timeoutMs = cfg.requestTimeoutMs && cfg.requestTimeoutMs > 0 ? cfg.requestTimeoutMs : 15000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.apiBase}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const retryAfter = res.headers.get("retry-after");
      const detail = typeof data?.error === "string" ? data.error : JSON.stringify(data);
      throw new Error(`MoltBook API ${res.status}: ${detail}${retryAfter ? ` (retry-after=${retryAfter}s)` : ""}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function createMoltbookStatusTool(api: any) {
  return {
    name: "moltbook_status",
    description: "Check MoltBook auth and claim status for current agent.",
    parameters: Type.Object({}),
    async execute(_id: string) {
      const me = await callMoltbook(api, "/agents/me", { method: "GET" });
      const status = await callMoltbook(api, "/agents/status", { method: "GET" });
      return {
        content: [{ type: "text", text: JSON.stringify({ me, status }, null, 2) }],
        details: { me, status },
      };
    },
  };
}

export function createMoltbookPostTool(api: any) {
  return {
    name: "moltbook_post",
    description: "Create a text or link post on MoltBook.",
    parameters: Type.Object({
      submolt: Type.Optional(Type.String()),
      title: Type.String({ minLength: 1 }),
      content: Type.Optional(Type.String()),
      url: Type.Optional(Type.String()),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const cfg = getCfg(api);
      const submolt =
        (typeof params.submolt === "string" && params.submolt.trim()) ||
        cfg.defaultSubmolt ||
        "general";
      const title = typeof params.title === "string" ? params.title.trim() : "";
      const content = typeof params.content === "string" ? params.content.trim() : undefined;
      const url = typeof params.url === "string" ? params.url.trim() : undefined;

      if (!title) throw new Error("title is required");
      if (!content && !url) throw new Error("Either content or url is required");

      const body = { submolt, title, ...(content ? { content } : {}), ...(url ? { url } : {}) };
      const out = await callMoltbook(api, "/posts", { method: "POST", body: JSON.stringify(body) });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        details: out,
      };
    },
  };
}

export function createMoltbookFeedTool(api: any) {
  return {
    name: "moltbook_feed",
    description: "Fetch MoltBook feed or global posts.",
    parameters: Type.Object({
      personalized: Type.Optional(Type.Boolean({ default: true })),
      sort: Type.Optional(Type.String({ default: "new" })),
      limit: Type.Optional(Type.Number({ default: 10 })),
      submolt: Type.Optional(Type.String()),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const personalized = params.personalized !== false;
      const sort = typeof params.sort === "string" ? params.sort : "new";
      const limit = typeof params.limit === "number" ? Math.max(1, Math.min(50, params.limit)) : 10;
      const submolt = typeof params.submolt === "string" ? params.submolt.trim() : "";

      const qs = new URLSearchParams({ sort, limit: String(limit) });
      const path = personalized
        ? `/feed?${qs.toString()}`
        : submolt
          ? `/posts?${qs.toString()}&submolt=${encodeURIComponent(submolt)}`
          : `/posts?${qs.toString()}`;
      const out = await callMoltbook(api, path, { method: "GET" });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        details: out,
      };
    },
  };
}

export function createMoltbookSearchTool(api: any) {
  return {
    name: "moltbook_search",
    description: "Semantic search over MoltBook posts/comments.",
    parameters: Type.Object({
      query: Type.String({ minLength: 2 }),
      type: Type.Optional(Type.String({ default: "all" })),
      limit: Type.Optional(Type.Number({ default: 20 })),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const query = typeof params.query === "string" ? params.query.trim() : "";
      const type = typeof params.type === "string" ? params.type : "all";
      const limit = typeof params.limit === "number" ? Math.max(1, Math.min(50, params.limit)) : 20;
      if (!query) throw new Error("query is required");
      const qs = new URLSearchParams({ q: query, type, limit: String(limit) });
      const out = await callMoltbook(api, `/search?${qs.toString()}`, { method: "GET" });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        details: out,
      };
    },
  };
}
