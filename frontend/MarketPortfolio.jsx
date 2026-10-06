import { useEffect, useMemo, useRef, useState } from "react";
import { getB3Quote, searchB3Tickers } from "./marketApi.js";

const PORTFOLIO_KEY = "fluxo.portfolio";
const MAX_POSITIONS = 8;
const REFRESH_INTERVAL = 30 * 60 * 1000;
const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function loadPortfolio() {
    try {
        const saved = JSON.parse(localStorage.getItem(PORTFOLIO_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function assetTypeLabel(type) {
    return ({ stock: "Ação", fii: "FII", etf: "ETF", unit: "Unit", bdr: "BDR" })[type] || "Ativo B3";
}

export default function MarketPortfolio() {
    const [portfolio, setPortfolio] = useState(loadPortfolio);
    const [quotes, setQuotes] = useState({});
    const [quoteErrors, setQuoteErrors] = useState({});
    const [quotesLoading, setQuotesLoading] = useState(false);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [tickerInput, setTickerInput] = useState("");
    const [quantityInput, setQuantityInput] = useState("");
    const [averagePriceInput, setAveragePriceInput] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [selectedTicker, setSelectedTicker] = useState(null);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState("");
    const refreshQuotesRef = useRef(() => {});

    useEffect(() => {
        localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
    }, [portfolio]);

    useEffect(() => {
        const query = tickerInput.trim();
        setSuggestions([]);
        setSearchError("");
        setHasSearched(false);
        if (query.length < 2 || selectedTicker?.symbol === query.toUpperCase()) {
            setSearching(false);
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setSearching(true);
            try {
                const matches = await searchB3Tickers(query, { signal: controller.signal });
                setSuggestions(matches.slice(0, 6));
                setHasSearched(true);
            } catch (error) {
                if (error.name !== "AbortError") setSearchError(error.message);
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, 350);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [tickerInput, selectedTicker]);

    useEffect(() => {
        if (!portfolio.length) {
            refreshQuotesRef.current = () => {};
            setQuotes({});
            setQuoteErrors({});
            setUpdatedAt(null);
            setQuotesLoading(false);
            return undefined;
        }

        let cancelled = false;
        const controller = new AbortController();
        const refresh = async () => {
            setQuotesLoading(true);
            const results = await Promise.all(portfolio.map(async asset => {
                try {
                    const quote = await getB3Quote(asset.symbol, { signal: controller.signal });
                    return { symbol: asset.symbol, quote, error: quote ? null : "Não foi encontrada uma cotação atual para este ativo." };
                } catch (error) {
                    return { symbol: asset.symbol, error: error.name === "AbortError" ? null : error.message };
                }
            }));
            if (cancelled) return;
            setQuotes(saved => results.reduce((next, result) => {
                if (result.quote) next[result.symbol] = result.quote;
                return next;
            }, { ...saved }));
            setQuoteErrors(Object.fromEntries(results
                .filter(result => result.error)
                .map(result => [result.symbol, result.error])));
            setUpdatedAt(new Date());
            setQuotesLoading(false);
        };

        refreshQuotesRef.current = refresh;
        refresh();
        const interval = window.setInterval(refresh, REFRESH_INTERVAL);
        return () => {
            cancelled = true;
            if (refreshQuotesRef.current === refresh) refreshQuotesRef.current = () => {};
            controller.abort();
            window.clearInterval(interval);
        };
    }, [portfolio]);

    const invested = useMemo(
        () => portfolio.reduce((sum, asset) => sum + asset.quantity * asset.averagePrice, 0),
        [portfolio]
    );
    const allQuotesLoaded = portfolio.length > 0 && portfolio.every(asset => quotes[asset.symbol]);
    const marketValue = allQuotesLoaded
        ? portfolio.reduce((sum, asset) => sum + asset.quantity * quotes[asset.symbol].price, 0)
        : null;
    const totalProfit = marketValue === null ? null : marketValue - invested;
    const totalProfitPercent = invested && totalProfit !== null ? (totalProfit / invested) * 100 : 0;

    const chooseTicker = ticker => {
        setSelectedTicker(ticker);
        setTickerInput(ticker.symbol);
        setSuggestions([]);
        setSearchError("");
    };

    const addPosition = event => {
        event.preventDefault();
        const quantity = Number(quantityInput);
        const averagePrice = Number(averagePriceInput);
        if (!selectedTicker || quantity <= 0 || averagePrice <= 0) return;
        const newPosition = { symbol: selectedTicker.symbol, name: selectedTicker.name, assetType: selectedTicker.assetType, quantity, averagePrice };
        setPortfolio(saved => {
            const existing = saved.find(item => item.symbol === newPosition.symbol);
            if (existing) {
                return saved.map(item => item.symbol === newPosition.symbol ? {
                    ...item,
                    quantity: item.quantity + quantity,
                    averagePrice: ((item.quantity * item.averagePrice) + (quantity * averagePrice)) / (item.quantity + quantity)
                } : item);
            }
            if (saved.length >= MAX_POSITIONS) return saved;
            return [...saved, newPosition];
        });
        setTickerInput("");
        setQuantityInput("");
        setAveragePriceInput("");
        setSelectedTicker(null);
    };

    return (
        <article className="panel market-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Mercado B3</span><h2>Cotações e carteira</h2></div>
                <div className="market-status">
                    <button className="market-refresh-button" type="button" onClick={() => refreshQuotesRef.current()} disabled={!portfolio.length || quotesLoading}>Atualizar</button>
                    {quotesLoading ? <span className="market-loading">Atualizando cotações…</span> : null}
                    {updatedAt && !quotesLoading ? <span>Atualizado às {updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
                </div>
            </div>

            <div className="portfolio-summary" aria-label="Resumo da carteira">
                <div><span>Valor investido</span><strong>{money(invested)}</strong></div>
                <div><span>Valor atual</span><strong>{marketValue === null ? "—" : money(marketValue)}</strong></div>
                <div className={totalProfit === null ? "" : totalProfit >= 0 ? "market-positive" : "market-negative"}>
                    <span>Resultado da carteira</span>
                    <strong>{totalProfit === null ? "—" : `${money(totalProfit)} (${totalProfitPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)`}</strong>
                </div>
            </div>

            <form className="portfolio-form" onSubmit={addPosition}>
                <label className="ticker-search">Ativo B3
                    <input
                        autoComplete="off"
                        value={tickerInput}
                        onChange={event => {
                            setTickerInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
                            setSelectedTicker(null);
                        }}
                        placeholder="Busque pelo ticker ou nome"
                        aria-label="Buscar ativo da B3"
                        aria-expanded={suggestions.length > 0}
                        required
                    />
                    {searching ? <span className="ticker-search-hint">Buscando na B3…</span> : null}
                    {suggestions.length ? (
                        <div className="ticker-suggestions" role="listbox" aria-label="Ativos encontrados">
                            {suggestions.map(item => (
                                <button key={item.symbol} type="button" role="option" aria-selected="false" onClick={() => chooseTicker(item)}>
                                    <span><strong>{item.symbol}</strong><small>{item.name} · {assetTypeLabel(item.assetType)}</small></span>
                                    <strong>{money(item.price)}</strong>
                                </button>
                            ))}
                        </div>
                    ) : null}
                    {hasSearched && !suggestions.length && !searching && !searchError ? <span className="market-search-empty">Nenhum ativo B3 encontrado.</span> : null}
                    {searchError ? <span className="market-error">{searchError}</span> : null}
                </label>
                <label>Quantidade
                    <input value={quantityInput} onChange={event => setQuantityInput(event.target.value)} type="number" min="0.000001" step="any" placeholder="Ex.: 10" required />
                </label>
                <label>Preço médio de compra
                    <input value={averagePriceInput} onChange={event => setAveragePriceInput(event.target.value)} type="number" min="0.01" step="0.01" placeholder="R$ 0,00" required />
                </label>
                <button className="primary-button" type="submit" disabled={!selectedTicker || Number(quantityInput) <= 0 || Number(averagePriceInput) <= 0 || (!portfolio.some(item => item.symbol === selectedTicker?.symbol) && portfolio.length >= MAX_POSITIONS)}>
                    Adicionar à carteira
                </button>
            </form>
            {!portfolio.some(item => item.symbol === selectedTicker?.symbol) && portfolio.length >= MAX_POSITIONS
                ? <p className="market-note">O plano gratuito da API limita a carteira a {MAX_POSITIONS} ativos para respeitar a cota mensal de consultas.</p>
                : null}
            <div className="market-disclaimer">Dados da brapi.dev; no plano gratuito, as cotações podem ter até 30 minutos de atraso. Atualização automática a cada 30 minutos. A carteira fica salva somente neste navegador.</div>

            {portfolio.length ? (
                <div className="holding-list">
                    {portfolio.map(asset => {
                        const quote = quotes[asset.symbol];
                        const currentValue = quote ? asset.quantity * quote.price : null;
                        const cost = asset.quantity * asset.averagePrice;
                        const profit = currentValue === null ? null : currentValue - cost;
                        const profitPercent = profit === null || !cost ? 0 : (profit / cost) * 100;
                        return (
                            <article className="holding-card" key={asset.symbol}>
                                <div className="holding-name">
                                    <strong>{asset.symbol}</strong>
                                    <span>{asset.name}</span>
                                    <small>{assetTypeLabel(asset.assetType)} · {asset.quantity.toLocaleString("pt-BR")} cotas/ações</small>
                                </div>
                                <div><span>Cotação</span><strong>{quote ? money(quote.price) : "—"}</strong>
                                    {quote?.changePercent !== null && quote?.changePercent !== undefined
                                        ? <small className={quote.changePercent >= 0 ? "market-positive" : "market-negative"}>{quote.changePercent > 0 ? "+" : ""}{quote.changePercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% no dia</small>
                                        : null}
                                </div>
                                <div><span>Preço médio</span><strong>{money(asset.averagePrice)}</strong></div>
                                <div><span>Valor atual</span><strong>{currentValue === null ? "—" : money(currentValue)}</strong></div>
                                <div className={profit === null ? "" : profit >= 0 ? "market-positive" : "market-negative"}>
                                    <span>Lucro / prejuízo</span>
                                    <strong>{profit === null ? "—" : money(profit)}</strong>
                                    {profit !== null ? <small>{profitPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% sobre o preço médio</small> : null}
                                </div>
                                <button className="holding-remove" type="button" aria-label={`Remover ${asset.symbol} da carteira`} onClick={() => setPortfolio(saved => saved.filter(item => item.symbol !== asset.symbol))}>Remover</button>
                                {quoteErrors[asset.symbol] ? <p className="market-error holding-error">{quoteErrors[asset.symbol]}</p> : null}
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state market-empty">
                    <span>↗</span><strong>Sua carteira ainda está vazia</strong>
                    <p>Busque uma ação, ETF ou FII da B3 acima para acompanhar cotação e resultado.</p>
                </div>
            )}
        </article>
    );
}
