const API_URL = "https://brapi.dev/api/v2/tickers";

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
