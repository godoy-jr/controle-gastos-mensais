import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import AssetLogo from "./AssetLogo.jsx";
import { getB3History } from "../marketApi.js";

const periods = [
    { label: "1D", range: "1d", interval: "5m" },
    { label: "5D", range: "5d", interval: "30m" },
    { label: "1M", range: "1mo", interval: "1d" },
    { label: "6M", range: "6mo", interval: "1d" },
    { label: "1A", range: "1y", interval: "1wk" },
    { label: "5A", range: "5y", interval: "1mo" }
];

const money = value => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
}).format(value);

const compactNumber = value => new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
}).format(value);

function formatDate(timestamp, period) {
    const date = new Date(timestamp * 1000);
    return period === "1D"
        ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function formatChartDate(timestamp, period) {
    const date = new Date(timestamp * 1000);
    return period === "1D"
        ? date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function AssetPriceChart({ ticker }) {
    const [period, setPeriod] = useState(periods[2]);
    const [quote, setQuote] = useState(null);
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [historyUnavailable, setHistoryUnavailable] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setHistoryUnavailable(false);
        getB3History(ticker.symbol, period.range, period.interval, { signal: controller.signal })
            .then(result => {
                setQuote(result.quote);
                setPoints(result.points);
                setHistoryUnavailable(result.historyUnavailable === true);
            })
            .catch(reason => {
                if (reason.name !== "AbortError") setError(reason.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [ticker.symbol, period]);

    const lastPrice = points.at(-1)?.price ?? quote?.price;
    const referencePrice = period.label === "1D" ? quote?.previousClose : points[0]?.price;
    const periodChangePercent = referencePrice && lastPrice
        ? ((lastPrice - referencePrice) / referencePrice) * 100
        : quote?.changePercent;
    const chartColor = periodChangePercent !== null && periodChangePercent < 0 ? "#ef6079" : "#17b890";
    const chartData = points.map(point => ({ ...point, label: formatDate(point.date, period.label) }));

    return (
        <section className="asset-detail-panel" aria-label={`Detalhes de ${ticker.symbol}`}>
            <div className="asset-detail-header">
                <div className="asset-identity">
                    <AssetLogo symbol={ticker.symbol} src={ticker.logoUrl} />
                    <div>
                        <h3>{ticker.symbol}<span> · B3</span></h3>
                        <p>{quote?.name || ticker.name}</p>
                    </div>
                </div>
                {quote ? (
                    <div className="asset-current-price">
                        <strong>{money(quote.price)}</strong>
                        {Number.isFinite(periodChangePercent) ? (
                            <span className={periodChangePercent >= 0 ? "market-positive" : "market-negative"}>
                                {periodChangePercent > 0 ? "+" : ""}{periodChangePercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% {period.label === "1D" ? "hoje" : "no período"}
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="asset-chart-toolbar">
                <span className="eyebrow dark">Desempenho do ativo</span>
                <div className="asset-periods" role="group" aria-label="Período do gráfico">
                    {periods.map(item => (
                        <button
                            className={period.label === item.label ? "active" : ""}
                            key={item.label}
                            onClick={() => setPeriod(item)}
                            type="button"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <div className="asset-chart-message" role="status">Carregando histórico de {ticker.symbol}…</div> : null}
            {error ? <p className="market-error asset-chart-error" role="alert">{error}</p> : null}
            {historyUnavailable && !loading ? (
                <p className="market-note asset-chart-notice" role="status">
                    A API exige autenticação para exibir o histórico deste ativo. A cotação atual continua disponível.
                </p>
            ) : null}
            {!loading && !error && !points.length ? <div className="asset-chart-message">Sem histórico disponível para este período.</div> : null}
            {!loading && !error && points.length ? (
                <div className="asset-chart-canvas">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`asset-price-${ticker.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                            <YAxis
                                domain={["auto", "auto"]}
                                tickFormatter={value => `R$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`}
                                tick={{ fill: "var(--muted)", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                width={78}
                            />
                            <Tooltip
                                labelFormatter={(_label, payload) => payload?.[0]?.payload ? formatChartDate(payload[0].payload.date, period.label) : ""}
                                formatter={value => [money(Number(value)), ticker.symbol]}
                                contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--navy)", fontSize: 11 }}
                            />
                            <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2.5} fill={`url(#asset-price-${ticker.symbol})`} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : null}

            {quote ? (
                <div className="asset-market-stats">
                    <div><span>Abertura</span><strong>{Number.isFinite(quote.open) ? money(quote.open) : "—"}</strong></div>
                    <div><span>Máxima do dia</span><strong>{Number.isFinite(quote.high) ? money(quote.high) : "—"}</strong></div>
                    <div><span>Mínima do dia</span><strong>{Number.isFinite(quote.low) ? money(quote.low) : "—"}</strong></div>
                    <div><span>Volume</span><strong>{Number.isFinite(quote.volume) ? compactNumber(quote.volume) : "—"}</strong></div>
                    <div><span>Fechamento anterior</span><strong>{Number.isFinite(quote.previousClose) ? money(quote.previousClose) : "—"}</strong></div>
                    <div><span>Faixa de 52 semanas</span><strong>{Number.isFinite(quote.yearLow) && Number.isFinite(quote.yearHigh) ? `${money(quote.yearLow)} – ${money(quote.yearHigh)}` : "—"}</strong></div>
                </div>
            ) : null}
            {quote?.marketTime ? <p className="asset-market-updated">Dados da brapi.dev · {new Date(quote.marketTime).toLocaleString("pt-BR")}</p> : null}
        </section>
    );
}
