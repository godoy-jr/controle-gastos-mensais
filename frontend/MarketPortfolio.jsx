import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getB3Quote, searchB3Tickers } from "./marketApi.js";
import AssetLogo from "./components/AssetLogo.jsx";

const AssetPriceChart = lazy(() => import("./components/AssetPriceChart.jsx"));
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
    const [activeTicker, setActiveTicker] = useState(() => {
        const first = loadPortfolio()[0];
        return first ? { symbol: first.symbol, name: first.name, assetType: first.assetType } : null;
    });
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
        setActiveTicker(ticker);
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
                <div><span className="eyebrow dark">Cotações da B3</span><h2>Explore ativos e acompanhe sua carteira</h2></div>
                <div className="market-status">
                    <button className="market-refresh-button" type="button" onClick={() => refreshQuotesRef.current()} disabled={!portfolio.length || quotesLoading}>Atualizar</button>
                    {quotesLoading ? <span className="market-loading">Atualizando cotações…</span> : null}
                    {updatedAt && !quotesLoading ? <span>Atualizado às {updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
                </div>
            </div>

            <section className="market-search-section" aria-label="Pesquisar ativos">
                <div className="market-section-heading">
                    <span className="eyebrow">PESQUISA DE ATIVOS</span>
                    <h3>Encontre um ativo da B3</h3>
                    <p>Pesquise pelo código ou nome da empresa para ver cotação e histórico.</p>
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
                            placeholder="Ex.: PETR4 ou Petrobras"
                            aria-label="Buscar ativo da B3"
                            aria-expanded={suggestions.length > 0}
                            required
                        />
                        {searching ? <span className="ticker-search-hint">Buscando na B3…</span> : null}
                        {suggestions.length ? (
                            <div className="ticker-suggestions" role="listbox" aria-label="Ativos encontrados">
                                {suggestions.map(item => (
                                    <button key={item.symbol} type="button" role="option" aria-selected="false" onClick={() => chooseTicker(item)}>
                                        <span className="ticker-result">
                                            <AssetLogo symbol={item.symbol} src={item.logoUrl} />
                                            <span><strong>{item.symbol}</strong><small>{item.name} · {assetTypeLabel(item.assetType)}</small></span>
                                        </span>
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
            </section>

            {activeTicker ? (
                <Suspense fallback={<div className="asset-chart-message">Carregando painel do ativo…</div>}>
                    <AssetPriceChart key={activeTicker.symbol} ticker={activeTicker} />
                </Suspense>
            ) : null}

            <section className="portfolio-overview" aria-label="Resumo da carteira">
                <div className="market-section-heading">
                    <span className="eyebrow dark">SUA CARTEIRA</span>
                    <h3>Visão geral</h3>
                </div>
                <div className="portfolio-summary">
                    <div><span>Valor investido</span><strong>{money(invested)}</strong></div>
                    <div><span>Valor atual</span><strong>{marketValue === null ? "—" : money(marketValue)}</strong></div>
                    <div className={totalProfit === null ? "" : totalProfit >= 0 ? "market-positive" : "market-negative"}>
                        <span>Resultado total</span>
                        <strong>{totalProfit === null ? "—" : `${money(totalProfit)} (${totalProfitPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)`}</strong>
                    </div>
                </div>
            </section>

            {portfolio.length ? (
                <section className="holding-section" aria-label="Minha carteira de ativos">
                    <div className="market-section-heading holding-section-heading">
                        <div><span className="eyebrow dark">ACOMPANHAMENTO</span><h3>Minha carteira</h3></div>
                        <span>{portfolio.length} de {MAX_POSITIONS} ativos</span>
                    </div>
                    <div className="holding-table-wrap">
                        <table className="holding-table">
                            <thead>
                                <tr><th>Ativo</th><th>Preço</th><th>Variação diária</th><th>Quantidade</th><th>Valor atual</th><th>Resultado</th><th><span className="visually-hidden">Ações</span></th></tr>
                            </thead>
                            <tbody>
                                {portfolio.map(asset => {
                                    const quote = quotes[asset.symbol];
                                    const currentValue = quote ? asset.quantity * quote.price : null;
                                    const cost = asset.quantity * asset.averagePrice;
                                    const profit = currentValue === null ? null : currentValue - cost;
                                    const profitPercent = profit === null || !cost ? 0 : (profit / cost) * 100;
                                    return (
                                        <tr key={asset.symbol}>
                                            <td>
                                                <button className="holding-asset-link" type="button" onClick={() => setActiveTicker({ symbol: asset.symbol, name: asset.name, assetType: asset.assetType, logoUrl: quote?.logoUrl })}>
                                                    <strong>{asset.symbol}</strong><span>{asset.name}</span><small>{assetTypeLabel(asset.assetType)}</small>
                                                </button>
                                                {quoteErrors[asset.symbol] ? <small className="market-error">{quoteErrors[asset.symbol]}</small> : null}
                                            </td>
                                            <td className="holding-price">{quote ? money(quote.price) : "—"}</td>
                                            <td>
                                                {quote?.changePercent !== null && quote?.changePercent !== undefined
                                                    ? <span className={quote.changePercent >= 0 ? "market-positive" : "market-negative"}>{quote.changePercent > 0 ? "+" : ""}{quote.changePercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</span>
                                                    : "—"}
                                            </td>
                                            <td>{asset.quantity.toLocaleString("pt-BR")}</td>
                                            <td>{currentValue === null ? "—" : money(currentValue)}</td>
                                            <td className={profit === null ? "" : profit >= 0 ? "market-positive" : "market-negative"}>
                                                {profit === null ? "—" : <>{money(profit)}<small className="holding-percent">{profitPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</small></>}
                                            </td>
                                            <td><button className="holding-remove" type="button" aria-label={`Remover ${asset.symbol} da carteira`} onClick={() => {
                                                setPortfolio(saved => saved.filter(item => item.symbol !== asset.symbol));
                                                setActiveTicker(active => active?.symbol === asset.symbol ? null : active);
                                            }}>×</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                <div className="empty-state market-empty">
                    <span>☆</span><strong>Comece sua lista de acompanhamento</strong>
                    <p>Pesquise uma ação, ETF ou FII acima para ver o gráfico e adicionar o ativo à sua carteira.</p>
                </div>
            )}
            <div className="market-disclaimer">Dados da brapi.dev; no plano gratuito, as cotações podem ter até 30 minutos de atraso. A carteira fica salva somente neste navegador.</div>
        </article>
    );
}
