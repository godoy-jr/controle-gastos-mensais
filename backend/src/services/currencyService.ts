import { MemoryCache } from "../lib/cache.js";
import { HttpError } from "../utils/httpError.js";

const API_ROOT = "https://economia.awesomeapi.com.br/json";
const CURRENCIES = new Set(["BRL", "USD", "EUR", "GBP", "ARS", "CAD", "JPY", "CHF"]);
const CACHE_TTL = 60_000;
const DAILY_RATES_CACHE_TTL = 60 * 60_000;
const DAILY_HISTORY_CACHE_TTL = 60 * 60_000;
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
    source: "awesomeapi" | "daily-fallback";
};

type DailyCurrencyRates = {
    date: string;
    usd?: Record<string, number>;
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

async function currentBrlRates(currencies: string[]) {
    const foreignCurrencies = currencies.filter(currency => currency !== "BRL");
    const quotes = foreignCurrencies.length
        ? Object.values(await fetchAwesome<Record<string, AwesomeQuote>>(
            `last/${foreignCurrencies.map(currency => `${currency}-BRL`).join(",")}`
        ))
        : [];
    return new Map(currencies.map(currency => [
        currency,
        currency === "BRL"
            ? { code: "BRL", codein: "BRL", bid: "1.0", ask: "1.0", pctChange: "0" }
            : quotes.find(quote => quote.code === currency && quote.codein === "BRL") || null
    ] as const));
}

async function fetchDailyUsdRates(): Promise<DailyCurrencyRates> {
    const response = await fetch("https://latest.currency-api.pages.dev/v1/currencies/usd.json", {
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "application/json" }
    });
    if (!response.ok) throw new HttpError(502, `O provedor alternativo de câmbio respondeu com erro (${response.status}).`);
    const result = await response.json() as DailyCurrencyRates;
    if (!result.date || !result.usd) throw new HttpError(502, "O provedor alternativo não retornou cotações válidas.");
    return result;
}

function getRatesFromDailyFallback(base: string, symbols: string[], usdRates: Record<string, number>) {
    const baseRate = usdRates[base.toLowerCase()];
    if (typeof baseRate !== "number" || !Number.isFinite(baseRate) || baseRate <= 0) {
        throw new HttpError(502, `O provedor alternativo não retornou cotação para ${base}.`);
    }
    return Object.fromEntries(symbols.map(currency => {
        const currencyRate = usdRates[currency.toLowerCase()];
        if (typeof currencyRate !== "number" || !Number.isFinite(currencyRate) || currencyRate <= 0) {
            throw new HttpError(502, `O provedor alternativo não retornou cotação para ${currency}.`);
        }
        return [currency, {
            rate: baseRate / currencyRate,
            changePercent: null,
            name: null
        }];
    }));
}

export async function getCurrencyRates(baseInput: string, symbolsInput: string[]) {
    const base = validateCurrency(baseInput);
    const symbols = [...new Set(symbolsInput.map(validateCurrency).filter(symbol => symbol !== base))];
    const cacheKey = `${base}:${symbols.sort().join(",")}`;
    const cached = ratesCache.get(cacheKey);
    if (cached) return cached;

    const currencies = [...new Set([base, ...symbols])];
    let result: CurrencyRates;
    try {
        const quotes = await currentBrlRates(currencies);
        const brlRates = new Map([...quotes].map(([currency, quote]) => [currency, Number(quote?.bid)]));
        const baseBrl = brlRates.get(base);
        if (!baseBrl || !Number.isFinite(baseBrl) || baseBrl <= 0) {
            throw new HttpError(502, "Não foi possível obter a cotação da moeda base.");
        }
        const rates = Object.fromEntries(symbols.map(currency => {
            const quote = quotes.get(currency);
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
        result = { base, rates, updatedAt: new Date().toISOString(), source: "awesomeapi" };
    } catch (primaryError) {
        try {
            const fallback = await fetchDailyUsdRates();
            result = {
                base,
                rates: getRatesFromDailyFallback(base, symbols, fallback.usd || {}),
                updatedAt: new Date(`${fallback.date}T00:00:00.000Z`).toISOString(),
                source: "daily-fallback"
            };
        } catch (fallbackError) {
            console.error("All currency rate providers failed", { primaryError, fallbackError });
            throw new HttpError(502, "Não foi possível obter cotações nos provedores de câmbio disponíveis.");
        }
    }
    ratesCache.set(cacheKey, result, result.source === "daily-fallback" ? DAILY_RATES_CACHE_TTL : CACHE_TTL);
    return result;
}

async function dailyBrlHistory(currency: string, days: number) {
    if (currency === "BRL") return [];
    return fetchAwesome<AwesomeQuote[]>(`daily/${currency}-BRL/${days}`);
}

async function fetchArchivedUsdRates(date: string): Promise<DailyCurrencyRates | null> {
    const primaryUrl = `https://${date}.currency-api.pages.dev/v1/currencies/usd.json`;
    let response = await fetch(primaryUrl, {
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "application/json" }
    });
    if (!response.ok) {
        const fallbackUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`;
        response = await fetch(fallbackUrl, {
            signal: AbortSignal.timeout(8_000),
            headers: { accept: "application/json" }
        });
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new HttpError(502, `O provedor de histórico diário respondeu com erro (${response.status}) para ${date}.`);
    const result = await response.json() as DailyCurrencyRates;
    if (result.date !== date || !result.usd) {
        throw new HttpError(502, `O provedor não retornou cotações válidas para ${date}.`);
    }
    return result;
}

async function archivedCurrencyHistory(base: string, quote: string, days: number): Promise<CurrencyHistory> {
    const today = new Date();
    const dates = Array.from({ length: days + 1 }, (_, index) => {
        const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + index));
        return date.toISOString().slice(0, 10);
    });
    const points: CurrencyHistory["points"] = [];
    for (let index = 0; index < dates.length; index += 6) {
        const archivedRates = await Promise.all(dates.slice(index, index + 6).map(fetchArchivedUsdRates));
        archivedRates.forEach((dailyRates, offset) => {
            if (!dailyRates?.usd) return;
            const date = dates[index + offset];
            if (!date) return;
            const baseUsdRate = dailyRates.usd[base.toLowerCase()];
            const quoteUsdRate = dailyRates.usd[quote.toLowerCase()];
            if (
                typeof baseUsdRate === "number" && Number.isFinite(baseUsdRate) && baseUsdRate > 0 &&
                typeof quoteUsdRate === "number" && Number.isFinite(quoteUsdRate) && quoteUsdRate > 0
            ) {
                points.push({ date, rate: baseUsdRate / quoteUsdRate });
            }
        });
    }
    if (!points.length) throw new HttpError(502, "O provedor alternativo não retornou histórico para este par de moedas.");
    return { base, quote, points };
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

    let result: CurrencyHistory;
    try {
        const quoteHistory = await dailyBrlHistory(quote, safeDays);
        const baseHistory = await dailyBrlHistory(base, safeDays);
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
        result = { base, quote, points };
    } catch (primaryError) {
        try {
            const end = new Date();
            const start = new Date(end);
            start.setDate(start.getDate() - safeDays);
            const dateRange = `${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}`;
            const response = await fetch(
                `https://api.frankfurter.app/${dateRange}?from=${base}&to=${quote}`,
                { signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } }
            );
            if (!response.ok) throw new HttpError(502, `O provedor alternativo de histórico respondeu com erro (${response.status}).`);
            const data = await response.json() as { rates?: Record<string, Record<string, number>> };
            const points = Object.entries(data.rates || {}).flatMap(([date, dailyRates]) => {
                const rate = dailyRates[quote];
                return typeof rate === "number" && Number.isFinite(rate) && rate > 0
                    ? [{ date, rate: 1 / rate }]
                    : [];
            }).sort((a, b) => a.date.localeCompare(b.date));
            if (!points.length) throw new HttpError(502, "O provedor alternativo não retornou histórico para este par de moedas.");
            result = { base, quote, points };
        } catch (fallbackError) {
            try {
                result = await archivedCurrencyHistory(base, quote, safeDays);
            } catch (archiveError) {
                console.error("All currency history providers failed", { primaryError, fallbackError, archiveError });
                throw new HttpError(502, "Não foi possível obter o histórico nos provedores de câmbio disponíveis.");
            }
        }
    }
    historyCache.set(cacheKey, result, result.points.length ? DAILY_HISTORY_CACHE_TTL : CACHE_TTL);
    return result;
}
