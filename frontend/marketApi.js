const API_URL = "https://brapi.dev/api/v2/tickers";
const QUOTE_API_URL = "https://brapi.dev/api/quote";
const HISTORY_CACHE_TTL = 30 * 60 * 1000;
const historyCache = new Map();
const unavailableHistoryCache = new Map();

function normalizeTicker(item) {
    const price = item.quote?.lastPrice;
    if (item.exchange !== "B3" || !item.isActive || !Number.isFinite(price)) return null;
    return {
        symbol: item.symbol,
        name: item.longName || item.name || item.symbol,
        assetType: item.subType || item.assetType,
        price,
        changePercent: Number.isFinite(item.quote?.changePercent) ? item.quote.changePercent : null,
        volume: Number.isFinite(item.quote?.volume) ? item.quote.volume : null,
        marketCap: Number.isFinite(item.quote?.marketCap) ? item.quote.marketCap : null,
        sector: item.sector || null,
        logoUrl: item.logoUrl || null
    };
}

export async function searchB3Tickers(query, { signal } = {}) {
    const params = new URLSearchParams({ search: query.trim().toUpperCase() });
    const response = await fetch(`${API_URL}?${params}`, { signal });
    if (response.status === 404) return [];
    if (!response.ok) {
        throw new Error(response.status === 429
            ? "Limite de consultas atingido. Aguarde um pouco e tente novamente."
            : `A API de cotações respondeu com erro (${response.status}).`);
    }
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results
        .map(normalizeTicker)
        .filter(Boolean)
        .sort((a, b) => Number(b.symbol === query.trim().toUpperCase()) - Number(a.symbol === query.trim().toUpperCase()));
}

export async function getB3Quote(symbol, { signal } = {}) {
    const matches = await searchB3Tickers(symbol, { signal });
    return matches.find(item => item.symbol === symbol.toUpperCase()) || null;
}

export async function getB3History(symbol, range, interval, { signal } = {}) {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `${normalizedSymbol}:${range}:${interval}`;
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < HISTORY_CACHE_TTL) return cached.data;

    const unavailableHistory = unavailableHistoryCache.get(normalizedSymbol);
    if (unavailableHistory && Date.now() - unavailableHistory.cachedAt < HISTORY_CACHE_TTL) {
        return unavailableHistory.data;
    }

    const params = new URLSearchParams({ range, interval });
    const response = await fetch(`${QUOTE_API_URL}/${encodeURIComponent(symbol)}?${params}`, { signal });
    if (response.status === 401) {
        const ticker = await getB3Quote(normalizedSymbol, { signal });
        if (!ticker) throw new Error(`A API exige autenticação para consultar o histórico de ${normalizedSymbol}.`);

        const result = {
            quote: {
                name: ticker.name,
                price: ticker.price,
                changePercent: ticker.changePercent,
                currency: "BRL"
            },
            points: [],
            historyUnavailable: true
        };
        unavailableHistoryCache.set(normalizedSymbol, { data: result, cachedAt: Date.now() });
        return result;
    }
    if (!response.ok) {
        throw new Error(response.status === 429
            ? "Limite de consultas atingido. Aguarde um pouco e tente novamente."
            : `A API de cotações respondeu com erro (${response.status}).`);
    }
    const data = await response.json();
    const quoteResult = data.results?.[0];
    if (!quoteResult) throw new Error(`Não foi possível carregar os dados de ${symbol}.`);

    const quote = {
        name: quoteResult.longName || quoteResult.shortName || quoteResult.symbol,
        price: quoteResult.regularMarketPrice,
        change: quoteResult.regularMarketChange,
        changePercent: quoteResult.regularMarketChangePercent,
        currency: quoteResult.currency || "BRL",
        marketTime: quoteResult.regularMarketTime,
        open: quoteResult.regularMarketOpen,
        high: quoteResult.regularMarketDayHigh,
        low: quoteResult.regularMarketDayLow,
        previousClose: quoteResult.regularMarketPreviousClose,
        volume: quoteResult.regularMarketVolume,
        marketCap: quoteResult.marketCap,
        yearLow: quoteResult.fiftyTwoWeekLow,
        yearHigh: quoteResult.fiftyTwoWeekHigh
    };
    const points = (Array.isArray(quoteResult.historicalDataPrice) ? quoteResult.historicalDataPrice : [])
        .filter(item => Number.isFinite(item.date) && Number.isFinite(item.close))
        .map(item => ({ date: item.date, price: item.close }));
    const result = { quote, points };
    historyCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
}
