import { useEffect, useMemo, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { apiRequest } from "../services/api.js";
import { formatMoney } from "../utils/finance.js";

const currencyOptions = ["USD", "EUR", "GBP", "ARS"];
const chartTooltipStyle = { border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--navy)", fontSize: 11 };
const formatExchangeRate = value => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
}).format(value);

export default function CurrencyPanel() {
    const [rates, setRates] = useState(null);
    const [history, setHistory] = useState([]);
    const [currency, setCurrency] = useState("USD");
    const [amount, setAmount] = useState("1");
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState("");
    const [historyError, setHistoryError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        apiRequest("/currencies?base=BRL&symbols=USD,EUR,GBP,ARS", { signal: controller.signal })
            .then(setRates)
            .catch(reason => {
                if (reason.name !== "AbortError") setError(reason.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setHistory([]);
        setHistoryLoading(true);
        setHistoryError("");
        apiRequest(`/currencies/history?base=BRL&quote=${currency}&days=30`, { signal: controller.signal })
            .then(result => setHistory(result.points))
            .catch(reason => {
                if (reason.name !== "AbortError") setHistoryError(reason.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setHistoryLoading(false);
            });
        return () => controller.abort();
    }, [currency]);

    const selectedRate = rates?.rates?.[currency]?.rate;
    const convertedAmount = useMemo(() => {
        const value = Number(amount);
        return Number.isFinite(value) && selectedRate ? value * selectedRate : null;
    }, [amount, selectedRate]);

    return (
        <article className="panel currency-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Mercado de moedas</span><h2>Câmbio e conversor</h2></div>
                {rates ? <span className="market-status">Atualizado {new Date(rates.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
            </div>
            <div className="currency-converter">
                <label>Você converte
                    <div className="currency-input">
                        <input type="number" min="0" step="any" value={amount} onChange={event => setAmount(event.target.value)} aria-label="Valor para converter" />
                        <select value={currency} onChange={event => setCurrency(event.target.value)} aria-label="Moeda de origem">
                            {currencyOptions.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                    </div>
                </label>
                <span className="currency-equals" aria-hidden="true">→</span>
                <div className="currency-result">
                    <span>Valor aproximado em BRL</span>
                    <strong>{loading ? "Carregando…" : convertedAmount === null ? "—" : formatMoney(convertedAmount)}</strong>
                </div>
            </div>
            {error ? <p className="api-error" role="alert">{error}</p> : null}
            {selectedRate ? <p className="currency-rate">1 {currency} = {formatExchangeRate(selectedRate)} · Cotação indicativa, sujeita a variação.</p> : null}
            <div className="panel-heading currency-chart-heading">
                <div><span className="eyebrow dark">Últimos 30 dias</span><h2>{currency} / BRL</h2></div>
            </div>
            {historyLoading ? <div className="feature-loading">Carregando histórico de câmbio…</div> : null}
            {historyError ? <p className="api-error" role="alert">{historyError}</p> : null}
            {!historyLoading && !historyError && !history.length ? <div className="chart-empty">O provedor não retornou histórico para este período.</div> : null}
            {!historyLoading && history.length ? (
                <div className="recharts-canvas currency-chart">
                    <ResponsiveContainer width="100%" height={230}>
                        <AreaChart data={history} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="currencyFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.24} />
                                    <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="date" tickFormatter={dateValue => new Date(`${dateValue}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} />
                            <YAxis domain={["auto", "auto"]} tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} width={60} />
                            <Tooltip
                                labelFormatter={dateValue => new Date(`${dateValue}T12:00:00`).toLocaleDateString("pt-BR")}
                                formatter={value => [formatExchangeRate(Number(value)), "Cotação"]}
                                contentStyle={chartTooltipStyle}
                            />
                            <Area type="monotone" dataKey="rate" name="Cotação" stroke="#6c5ce7" strokeWidth={2.5} fill="url(#currencyFill)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : null}
            <div className="currency-rate-grid">
                {currencyOptions.map(code => (
                    <button className={`currency-rate-card${currency === code ? " active" : ""}`} key={code} type="button" onClick={() => setCurrency(code)}>
                        <span>{code} / BRL</span>
                        <strong>{rates?.rates?.[code] ? formatExchangeRate(rates.rates[code].rate) : loading ? "…" : "—"}</strong>
                        {rates?.rates?.[code]?.changePercent !== null && rates?.rates?.[code]?.changePercent !== undefined
                            ? <small className={rates.rates[code].changePercent >= 0 ? "market-positive" : "market-negative"}>{rates.rates[code].changePercent >= 0 ? "+" : ""}{rates.rates[code].changePercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</small>
                            : null}
                    </button>
                ))}
            </div>
        </article>
    );
}
