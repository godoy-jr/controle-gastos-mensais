import { XMLParser } from "fast-xml-parser";
import { MemoryCache } from "../lib/cache.js";
import { HttpError } from "../utils/httpError.js";

const CACHE_TTL = 10 * 60 * 1000;
const feedCache = new MemoryCache<NewsFeed>();
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

export const NEWS_CATEGORIES = ["economy", "stocks", "currency", "crypto"] as const;
export type NewsCategory = typeof NEWS_CATEGORIES[number];

export type NewsItem = {
    title: string;
    link: string;
    publishedAt: string | null;
    source: string;
};

export type NewsFeed = {
    category: NewsCategory;
    updatedAt: string;
    items: NewsItem[];
};

const queries: Record<NewsCategory, string> = {
    economy: "economia Brasil mercado financeiro",
    stocks: "ações bolsa B3 Ibovespa",
    currency: "câmbio dólar real moedas",
    crypto: "criptomoedas bitcoin Brasil"
};

function text(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (value && typeof value === "object" && "#text" in value) return String(value["#text"]).trim();
    return "";
}

export async function getNews(category: NewsCategory): Promise<NewsFeed> {
    const cached = feedCache.get(category);
    if (cached) return cached;
    const query = encodeURIComponent(queries[category]);
    const url = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const response = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "application/rss+xml, application/xml", "user-agent": "FluxoFinanceiro/1.0" }
    });
    if (!response.ok) throw new HttpError(502, `O provedor de notícias respondeu com erro (${response.status}).`);
    const xml = await response.text();
    const parsed = parser.parse(xml) as { rss?: { channel?: { item?: unknown | unknown[] } } };
    const entries = parsed.rss?.channel?.item;
    const items = (Array.isArray(entries) ? entries : entries ? [entries] : [])
        .flatMap((entry): NewsItem[] => {
            if (!entry || typeof entry !== "object") return [];
            const item = entry as Record<string, unknown>;
            const title = text(item.title);
            const link = text(item.link);
            const source = text(item.source) || "Google Notícias";
            const publishedAt = text(item.pubDate);
            return title && link
                ? [{ title, link, source, publishedAt: publishedAt || null }]
                : [];
        })
        .slice(0, 25);
    const result = { category, updatedAt: new Date().toISOString(), items };
    feedCache.set(category, result, CACHE_TTL);
    return result;
}
