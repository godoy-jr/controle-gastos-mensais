import { MemoryCache } from "../lib/cache.js";
import { HttpError } from "../utils/httpError.js";

const API_ROOT = "https://economia.awesomeapi.com.br/json";
const CURRENCIES = new Set(["BRL", "USD", "EUR", "GBP", "ARS", "CAD", "JPY", "CHF"]);
const CACHE_TTL = 60_000;
const ratesCache = new MemoryCache<CurrencyRates>();
const historyCache = new MemoryCache<CurrencyHistory>();

type AwesomeQuote = {
    code?: string;
    codein?: string;
    bid?: string;
    ask?: string;
    pctChange?: string;
    timestamp?: string;
    name?: string;
};

type CurrencyRates = {
    base: string;
    rates: Record<string, { rate: number; changePercent: number | null; name: string | null }>;
    updatedAt: string;
};

export type CurrencyHistory = {
    base: string;
    quote: string;
    points: Array<{ date: string; rate: number }>;
};

function validateCurrency(currency: string): string {
    const normalized = currency.toUpperCase();
    if (!CURRENCIES.has(normalized)) throw new HttpError(400, `Moeda não suportada: ${currency}.`);
    return normalized;
}

async function fetchAwesome<T>(path: string): Promise<T> {
    const response = await fetch(`${API_ROOT}/${path}`, {
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "application/json" }
    });
    if (!response.ok) throw new HttpError(502, `O provedor de câmbio respondeu com erro (${response.status}).`);
    return response.json() as Promise<T>;
}

async function currentBrlRate(currency: string): Promise<AwesomeQuote | null> {
    if (currency === "BRL") return { code: "BRL", codein: "BRL", bid: "1.0", ask: "1.0", pctChange: "0" };
    const result = await fetchAwesome<Record<string, AwesomeQuote>>(`last/${currency}-BRL`);
    return Object.values(result)[0] || null;
}

export async function getCurrencyRates(baseInput: string, symbolsInput: string[]) {
    const base = validateCurrency(baseInput);
    const symbols = [...new Set(symbolsInput.map(validateCurrency).filter(symbol => symbol !== base))];
    const cacheKey = `${base}:${symbols.sort().join(",")}`;
    const cached = ratesCache.get(cacheKey);
    if (cached) return cached;

    const currencies = [...new Set([base, ...symbols])];
    const quotes = await Promise.all(currencies.map(async currency => [currency, await currentBrlRate(currency)] as const));
    const brlRates = new Map(quotes.map(([currency, quote]) => [currency, Number(quote?.bid)]));
    const baseBrl = brlRates.get(base);
    if (!baseBrl || !Number.isFinite(baseBrl) || baseBrl <= 0) {
        throw new HttpError(502, "Não foi possível obter a cotação da moeda base.");
    }
    const rates = Object.fromEntries(symbols.map(currency => {
        const quote = quotes.find(([code]) => code === currency)?.[1];
        const brlRate = brlRates.get(currency);
        if (!quote || !brlRate || !Number.isFinite(brlRate)) {
            throw new HttpError(502, `Não foi possível obter a cotação de ${currency}.`);
        }
        return [currency, {
            rate: brlRate / baseBrl,
            changePercent: Number.isFinite(Number(quote.pctChange)) ? Number(quote.pctChange) : null,
            name: quote.name || null
        }];
    }));
    const result = { base, rates, updatedAt: new Date().toISOString() };
    ratesCache.set(cacheKey, result, CACHE_TTL);
    return result;
}

async function dailyBrlHistory(currency: string, days: number) {
    if (currency === "BRL") return [];
    return fetchAwesome<AwesomeQuote[]>(`daily/${currency}-BRL/${days}`);
}

export async function getCurrencyHistory(baseInput: string, quoteInput: string, days: number): Promise<CurrencyHistory> {
    const base = validateCurrency(baseInput);
    const quote = validateCurrency(quoteInput);
    const safeDays = Math.max(2, Math.min(days, 90));
    const cacheKey = `${base}:${quote}:${safeDays}`;
    const cached = historyCache.get(cacheKey);
    if (cached) return cached;
    if (base === quote) {
        const sameRate = { base, quote, points: [] };
        historyCache.set(cacheKey, sameRate, CACHE_TTL);
        return sameRate;
    }

    const [quoteHistory, baseHistory] = await Promise.all([
        dailyBrlHistory(quote, safeDays),
        dailyBrlHistory(base, safeDays)
    ]);
    const baseByDate = new Map(baseHistory.map(item => [
        new Date(Number(item.timestamp) * 1000).toISOString().slice(0, 10),
        Number(item.bid)
    ]));
    const points = quoteHistory.flatMap(item => {
        const date = item.timestamp ? new Date(Number(item.timestamp) * 1000).toISOString().slice(0, 10) : "";
        const quoteBrl = Number(item.bid);
        const baseBrl = base === "BRL" ? 1 : baseByDate.get(date);
        return date && baseBrl && Number.isFinite(quoteBrl)
            ? [{ date, rate: quoteBrl / baseBrl }]
            : [];
    }).sort((a, b) => a.date.localeCompare(b.date));
    const result = { base, quote, points };
    historyCache.set(cacheKey, result, CACHE_TTL);
    return result;
}
