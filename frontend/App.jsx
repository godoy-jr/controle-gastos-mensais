import { useEffect, useMemo, useRef, useState } from "react";

const TRANSACTIONS_KEY = "fluxo.transactions";
const GOALS_KEY = "fluxo.goals";
const THEME_KEY = "fluxo.theme";
const categories = {
    income: ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"],
    expense: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Outros"]
};
const chartColors = ["#6c5ce7", "#17b890", "#f4a261", "#ef6079", "#4ea8de", "#9b5de5", "#e9c46a", "#7b8cde"];
const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const currentMonth = () => today().slice(0, 7);
const shiftMonth = (month, offset) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(year, monthNumber - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

function loadArray(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function useStoredArray(key) {
    const [items, setItems] = useState(() => loadArray(key));
    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(items));
    }, [items, key]);
    return [items, setItems];
}

function totalsForMonth(transactions, month) {
    return transactions
        .filter(item => item.date.startsWith(month))
        .reduce((summary, item) => ({
            ...summary,
            [item.type]: summary[item.type] + item.amount
        }), { income: 0, expense: 0 });
}

function prepareCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 520;
    const height = 260;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width };
}

function ActionButton({ action, label, symbol, className, onClick }) {
    return (
        <button className={className} type="button" data-action={action} aria-label={label} title={label} onClick={onClick}>
            {symbol}
        </button>
    );
}

function App() {
    const [transactions, setTransactions] = useStoredArray(TRANSACTIONS_KEY);
    const [goals, setGoals] = useStoredArray(GOALS_KEY);
    const [month, setMonth] = useState(currentMonth);
    const [typeFilter, setTypeFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [type, setType] = useState("income");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(today);
    const [category, setCategory] = useState(categories.income[0]);
    const [goalCategory, setGoalCategory] = useState(categories.expense[0]);
    const [goalLimit, setGoalLimit] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [feedback, setFeedback] = useState("");
    const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "system");
    const [resolvedTheme, setResolvedTheme] = useState(() => {
        const preference = localStorage.getItem(THEME_KEY) || "system";
        return preference === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : preference;
    });
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const appearanceRef = useRef(null);
    const formRef = useRef(null);
    const flowCanvas = useRef(null);
    const categoryCanvas = useRef(null);
    const evolutionCanvas = useRef(null);

    const monthlyTransactions = useMemo(
        () => transactions.filter(item => item.date.startsWith(month)),
        [transactions, month]
    );
    const totals = useMemo(() => totalsForMonth(transactions, month), [transactions, month]);
    const categoryExpenses = useMemo(() => monthlyTransactions
        .filter(item => item.type === "expense")
        .reduce((summary, item) => ({
            ...summary,
            [item.category]: (summary[item.category] || 0) + item.amount
        }), {}), [monthlyTransactions]);
    const visibleTransactions = useMemo(() => {
        const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
        return monthlyTransactions
            .filter(item => typeFilter === "all" || item.type === typeFilter)
            .filter(item => !searchTerm || `${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(searchTerm))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [monthlyTransactions, search, typeFilter]);
    const monthlyGoals = goals.filter(goal => goal.month === month);
    const previousTotals = totalsForMonth(transactions, shiftMonth(month, -1));
    const balance = totals.income - totals.expense;
    const savingsRate = totals.income ? (balance / totals.income) * 100 : 0;

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme);
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const updateTheme = () => {
            const nextTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
            document.body.dataset.theme = nextTheme;
            setResolvedTheme(nextTheme);
        };
        updateTheme();
        if (theme !== "system") return undefined;
        media.addEventListener("change", updateTheme);
        return () => media.removeEventListener("change", updateTheme);
    }, [theme]);

    useEffect(() => {
        if (type === "income" && !categories.income.includes(category)) setCategory(categories.income[0]);
        if (type === "expense" && !categories.expense.includes(category)) setCategory(categories.expense[0]);
    }, [type, category]);

    useEffect(() => {
        const closeAppearance = event => {
            if (event.type === "keydown" && event.key === "Escape") setAppearanceOpen(false);
            if (event.type === "click" && !appearanceRef.current?.contains(event.target)) setAppearanceOpen(false);
        };
        document.addEventListener("click", closeAppearance);
        document.addEventListener("keydown", closeAppearance);
        return () => {
            document.removeEventListener("click", closeAppearance);
            document.removeEventListener("keydown", closeAppearance);
        };
    }, []);

    useEffect(() => {
        const drawCharts = () => {
            const dark = resolvedTheme === "dark";
            const textColor = dark ? "#f5f4ff" : "#15172d";
            const mutedColor = dark ? "#a7a7ba" : "#74758a";
            const flow = flowCanvas.current;
            const categoryChart = categoryCanvas.current;
            const evolution = evolutionCanvas.current;
            if (!flow || !categoryChart || !evolution) return;

            {
                const { context: ctx, width } = prepareCanvas(flow);
                const max = Math.max(totals.income, totals.expense, 1);
                const bars = [
                    { label: "Entradas", value: totals.income, color: "#17b890" },
                    { label: "Saídas", value: totals.expense, color: "#ef6079" }
                ];
                ctx.font = "600 12px Inter";
                ctx.textAlign = "center";
                bars.forEach((bar, index) => {
                    const barWidth = Math.min(110, width / 4);
                    const x = width * (index ? 0.65 : 0.35) - barWidth / 2;
                    const barHeight = (bar.value / max) * 145;
                    ctx.fillStyle = "#eeedf4";
                    ctx.beginPath();
                    ctx.roundRect(x, 42, barWidth, 150, 14);
                    ctx.fill();
                    ctx.fillStyle = bar.color;
                    ctx.beginPath();
                    ctx.roundRect(x, 192 - barHeight, barWidth, barHeight, 14);
                    ctx.fill();
                    ctx.fillStyle = textColor;
                    ctx.fillText(bar.label, x + barWidth / 2, 218);
                    ctx.fillStyle = mutedColor;
                    ctx.font = "500 11px Inter";
                    ctx.fillText(money(bar.value), x + barWidth / 2, 238);
                    ctx.font = "600 12px Inter";
                });
            }

            {
                const { context: ctx, width } = prepareCanvas(categoryChart);
                const entries = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
                const total = entries.reduce((sum, [, value]) => sum + value, 0);
                if (!total) {
                    ctx.fillStyle = mutedColor;
                    ctx.font = "500 12px Inter";
                    ctx.textAlign = "center";
                    ctx.fillText("Registre despesas para visualizar a distribuição", width / 2, 132);
                } else {
                    const centerX = Math.min(width * 0.32, 165);
                    const centerY = 125;
                    let angle = -Math.PI / 2;
                    entries.forEach(([label, value], index) => {
                        const slice = (value / total) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 78, angle, angle + slice);
                        ctx.arc(centerX, centerY, 43, angle + slice, angle, true);
                        ctx.closePath();
                        ctx.fillStyle = chartColors[index % chartColors.length];
                        ctx.fill();
                        angle += slice;
                        if (index < 5) {
                            const y = 65 + index * 31;
                            ctx.fillStyle = chartColors[index % chartColors.length];
                            ctx.fillRect(width * 0.58, y - 9, 10, 10);
                            ctx.fillStyle = textColor;
                            ctx.font = "600 11px Inter";
                            ctx.textAlign = "left";
                            ctx.fillText(label, width * 0.58 + 17, y);
                        }
                    });
                    ctx.fillStyle = textColor;
                    ctx.font = "700 14px Inter";
                    ctx.textAlign = "center";
                    ctx.fillText(money(total), centerX, centerY + 5);
                }
            }

            {
                const { context: ctx, width } = prepareCanvas(evolution);
                const months = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5));
                const series = months.map(value => ({ month: value, ...totalsForMonth(transactions, value) }));
                const max = Math.max(...series.flatMap(item => [item.income, item.expense]), 1);
                const left = 42;
                const right = width - 20;
                const top = 30;
                const bottom = 205;
                const step = (right - left) / 5;
                ctx.strokeStyle = dark ? "#343750" : "#e9e7f1";
                ctx.lineWidth = 1;
                for (let line = 0; line < 4; line += 1) {
                    const y = top + ((bottom - top) / 3) * line;
                    ctx.beginPath();
                    ctx.moveTo(left, y);
                    ctx.lineTo(right, y);
                    ctx.stroke();
                }
                const drawLine = (key, color) => {
                    ctx.beginPath();
                    series.forEach((item, index) => {
                        const x = left + step * index;
                        const y = bottom - (item[key] / max) * (bottom - top);
                        index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                    });
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    series.forEach((item, index) => {
                        const x = left + step * index;
                        const y = bottom - (item[key] / max) * (bottom - top);
                        ctx.beginPath();
                        ctx.arc(x, y, 4, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                    });
                };
                drawLine("income", "#17b890");
                drawLine("expense", "#ef6079");
                ctx.fillStyle = mutedColor;
                ctx.font = "500 10px Inter";
                ctx.textAlign = "center";
                series.forEach((item, index) => {
                    const label = new Date(`${item.month}-02T12:00:00`)
                        .toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
                    ctx.fillText(label, left + step * index, 232);
                });
            }
        };

        drawCharts();
        const timer = window.setTimeout(drawCharts, 120);
        window.addEventListener("resize", drawCharts);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("resize", drawCharts);
        };
    }, [transactions, totals, categoryExpenses, month, resolvedTheme]);

    const insights = useMemo(() => {
        if (!monthlyTransactions.length) return [];
        const ranking = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
        const result = [];
        if (ranking[0]) result.push(["◈", `${ranking[0][0]} é sua maior categoria de gastos, com ${money(ranking[0][1])}.`]);
        result.push(balance >= 0
            ? ["↗", `Você manteve ${money(balance)} após todas as saídas.`]
            : ["!", `Faltam ${money(Math.abs(balance))} para equilibrar o mês.`]);
        if (savingsRate < 20 && totals.income > 0) {
            result.push(["✦", "Tente reservar 20% das entradas para emergências e objetivos futuros."]);
        }
        const exceeded = monthlyGoals.filter(goal => (categoryExpenses[goal.category] || 0) > goal.limit);
        if (exceeded.length) {
            result.push(["!", `${exceeded.length} ${exceeded.length === 1 ? "meta foi ultrapassada" : "metas foram ultrapassadas"}. Revise os gastos dessas categorias.`]);
        }
        return result;
    }, [monthlyTransactions, categoryExpenses, balance, savingsRate, totals.income, monthlyGoals]);

    const resetForm = () => {
        setEditingId(null);
        setType("income");
        setDescription("");
        setAmount("");
        setDate(today());
        setCategory(categories.income[0]);
        setFeedback("");
    };

    const submitTransaction = event => {
        event.preventDefault();
        const normalizedDescription = description.trim().replace(/\s+/g, " ");
        const numericAmount = Number(amount);
        if (!normalizedDescription || numericAmount <= 0 || !date) return;
        const formData = { description: normalizedDescription, amount: numericAmount, type, category, date };
        if (editingId) {
            setTransactions(saved => saved.map(item => item.id === editingId ? { ...item, ...formData } : item));
            setFeedback("Movimentação atualizada com sucesso.");
        } else {
            setTransactions(saved => [...saved, { id: createId(), ...formData }]);
            setFeedback("Movimentação adicionada com sucesso.");
        }
        resetForm();
        setFeedback(editingId ? "Movimentação atualizada com sucesso." : "Movimentação adicionada com sucesso.");
        window.setTimeout(() => setFeedback(""), 2500);
    };

    const editTransaction = item => {
        setEditingId(item.id);
        setType(item.type);
        setDescription(item.description);
        setAmount(String(item.amount));
        setDate(item.date);
        setCategory(item.category);
        setFeedback("");
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const duplicateTransaction = item => {
        setEditingId(null);
        setType(item.type);
        setDescription(item.description);
        setAmount(String(item.amount));
        setDate(today());
        setCategory(item.category);
        setFeedback("Revise os dados e confirme para criar uma nova movimentação.");
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const deleteTransaction = id => {
        setTransactions(saved => saved.filter(item => item.id !== id));
        if (editingId === id) resetForm();
    };

    const submitGoal = event => {
        event.preventDefault();
        const limit = Number(goalLimit);
        if (limit <= 0) return;
        setGoals(saved => {
            const existing = saved.find(goal => goal.month === month && goal.category === goalCategory);
            return existing
                ? saved.map(goal => goal.id === existing.id ? { ...goal, limit } : goal)
                : [...saved, { id: createId(), month, category: goalCategory, limit }];
        });
        setGoalLimit("");
    };

    const exportCsv = () => {
        if (!visibleTransactions.length) {
            setFeedback("Não há movimentações para exportar.");
            return;
        }
        const escapeCell = value => `"${String(value).replaceAll('"', '""')}"`;
        const rows = [
            ["Data", "Tipo", "Descrição", "Categoria", "Valor"],
            ...visibleTransactions.map(item => [
                item.date,
                item.type === "income" ? "Entrada" : "Saída",
                item.description,
                item.category,
                item.amount.toFixed(2)
            ])
        ];
        const csv = `\uFEFF${rows.map(row => row.map(escapeCell).join(";")).join("\n")}`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `fluxo-${month}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const comparisonText = (current, previous, label) => previous
        ? `${current >= previous ? "↑" : "↓"} ${Math.abs(Math.round(((current - previous) / previous) * 100))}% vs. mês anterior`
        : `${label[0].toUpperCase() + label.slice(1)} no período`;

    return (
        <main className="app-shell">
            <header className="topbar">
                <div>
                    <span className="eyebrow">Painel financeiro</span>
                    <h1>Seu dinheiro, com clareza.</h1>
                    <p>Acompanhe entradas, saídas e escolhas ao longo do mês.</p>
                </div>
                <div className="top-actions">
                    <details className="appearance-menu" open={appearanceOpen} ref={appearanceRef}>
                        <summary onClick={event => { event.preventDefault(); setAppearanceOpen(open => !open); }}>
                            <span aria-hidden="true">◐</span> Aparência
                        </summary>
                        <div className="appearance-popover" role="group" aria-label="Escolher tema">
                            <span className="popover-label">Tema da interface</span>
                            {[
                                ["light", "☀", "Claro", "Visual luminoso"],
                                ["dark", "☾", "Escuro", "Conforto visual"],
                                ["system", "◑", "Automático", "Segue o sistema"]
                            ].map(([value, icon, label, helper]) => (
                                <button className={theme === value ? "active" : ""} key={value} type="button" onClick={() => { setTheme(value); setAppearanceOpen(false); }}>
                                    <span aria-hidden="true">{icon}</span><span>{label}<small>{helper}</small></span><i />
                                </button>
                            ))}
                        </div>
                    </details>
                    <label className="month-field">
                        <span>Mês de referência</span>
                        <input type="month" value={month} onChange={event => setMonth(event.target.value)} />
                    </label>
                </div>
            </header>

            <section className="summary-grid" aria-label="Resumo financeiro">
                <article className="summary-card balance-card">
                    <span className="card-label">Saldo do mês</span>
                    <strong>{money(balance)}</strong>
                    <span className="card-helper">{balance >= 0 ? "Seu mês está com saldo positivo" : "As saídas ultrapassaram as entradas"}</span>
                </article>
                <article className="summary-card income-card">
                    <span className="card-label">Entradas</span>
                    <strong>{money(totals.income)}</strong>
                    <span className="trend positive">{comparisonText(totals.income, previousTotals.income, "receitas")}</span>
                </article>
                <article className="summary-card expense-card">
                    <span className="card-label">Saídas</span>
                    <strong>{money(totals.expense)}</strong>
                    <span className="trend negative">{comparisonText(totals.expense, previousTotals.expense, "despesas")}</span>
                </article>
            </section>

            <section className="workspace-grid">
                <article className="panel form-panel">
                    <div className="panel-heading"><div><span className="eyebrow dark">Nova movimentação</span><h2>Registrar valor</h2></div></div>
                    <form id="transaction-form" ref={formRef} onSubmit={submitTransaction}>
                        <div className="type-switch" role="group" aria-label="Tipo de movimentação">
                            <input type="radio" name="type" id="type-income" value="income" checked={type === "income"} onChange={() => setType("income")} />
                            <label htmlFor="type-income">Entrada</label>
                            <input type="radio" name="type" id="type-expense" value="expense" checked={type === "expense"} onChange={() => setType("expense")} />
                            <label htmlFor="type-expense">Saída</label>
                        </div>
                        <label>Descrição<input value={description} onChange={event => setDescription(event.target.value)} maxLength="80" placeholder="Ex.: Salário, aluguel..." required /></label>
                        <div className="form-row">
                            <label>Valor<input value={amount} onChange={event => setAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="0,00" required /></label>
                            <label>Data<input value={date} onChange={event => setDate(event.target.value)} type="date" required /></label>
                        </div>
                        <label>Categoria
                            <select value={category} onChange={event => setCategory(event.target.value)} required>
                                {categories[type].map(item => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>
                        <div className="form-actions">
                            <button className="primary-button" type="submit">{editingId ? "Salvar alterações" : feedback.startsWith("Revise") ? "Adicionar cópia" : "Adicionar movimentação"}</button>
                            {editingId || feedback.startsWith("Revise") ? <button className="secondary-button" type="button" onClick={resetForm}>Cancelar edição</button> : null}
                        </div>
                        <p className="form-feedback" role="status" aria-live="polite">{feedback}</p>
                    </form>
                </article>

                <article className="panel chart-panel">
                    <div className="panel-heading"><div><span className="eyebrow dark">Visão geral</span><h2>Entradas x saídas</h2></div></div>
                    <canvas ref={flowCanvas} aria-label="Gráfico de entradas e saídas" />
                </article>

                <article className="panel chart-panel">
                    <div className="panel-heading"><div><span className="eyebrow dark">Distribuição</span><h2>Gastos por categoria</h2></div></div>
                    <canvas ref={categoryCanvas} aria-label="Gráfico de gastos por categoria" />
                </article>

                <article className="panel goal-panel">
                    <div className="panel-heading"><div><span className="eyebrow dark">Planejamento</span><h2>Metas mensais</h2></div></div>
                    <form className="goal-form" onSubmit={submitGoal}>
                        <label>Categoria
                            <select value={goalCategory} onChange={event => setGoalCategory(event.target.value)}>
                                {categories.expense.map(item => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>
                        <label>Limite mensal<input value={goalLimit} onChange={event => setGoalLimit(event.target.value)} type="number" min="1" step="0.01" placeholder="Ex.: 800,00" required /></label>
                        <button className="primary-button" type="submit">Criar meta</button>
                    </form>
                    <div className="goal-list">
                        {monthlyGoals.map(goal => {
                            const spent = categoryExpenses[goal.category] || 0;
                            const percentage = Math.min((spent / goal.limit) * 100, 100);
                            return (
                                <article className="goal-item" key={goal.id}>
                                    <div className="goal-top"><strong>{goal.category}</strong><span>{Math.round(percentage)}% utilizado</span></div>
                                    <div className="goal-track"><i className={`goal-progress${percentage >= 80 ? " warning" : ""}`} style={{ width: `${percentage}%` }} /></div>
                                    <div className="goal-footer">
                                        <span>{money(spent)} de {money(goal.limit)}</span>
                                        <button className="goal-remove" type="button" onClick={() => setGoals(saved => saved.filter(item => item.id !== goal.id))}>Remover meta</button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    {!monthlyGoals.length ? <div className="empty-goals">Crie limites por categoria para acompanhar seus gastos.</div> : null}
                </article>

                <article className="panel insights-panel">
                    <div className="panel-heading">
                        <div><span className="eyebrow dark">Assistente inteligente</span><h2>Análise financeira</h2></div>
                        <span className="ai-badge"><i /> IA local</span>
                    </div>
                    <div className="health-score">
                        <span className="score-ring">{monthlyTransactions.length ? (() => {
                            let score = 50;
                            if (balance >= 0) score += 20;
                            else score -= 20;
                            if (savingsRate >= 20) score += 20;
                            else if (savingsRate > 0) score += 10;
                            if (monthlyGoals.length) score += 10;
                            return Math.max(0, Math.min(score, 100));
                        })() : "--"}</span>
                        <div>
                            <strong>{!monthlyTransactions.length ? "Aguardando dados" : savingsRate >= 20 && balance >= 0 ? "Saúde financeira excelente" : balance >= 0 ? "Bom controle financeiro" : "Seu orçamento pede atenção"}</strong>
                            <p>{monthlyTransactions.length ? `Taxa de economia estimada em ${Math.round(savingsRate)}% neste mês.` : "Registre movimentações para receber uma análise personalizada."}</p>
                        </div>
                    </div>
                    <div className="insight-list">
                        {insights.map(([icon, text], index) => <div className="insight" key={`${icon}-${index}`}><span>{icon}</span><p>{text}</p></div>)}
                    </div>
                    <p className="privacy-note">Seus dados são analisados apenas neste navegador.</p>
                </article>

                <article className="panel evolution-panel">
                    <div className="panel-heading">
                        <div><span className="eyebrow dark">Histórico visual</span><h2>Evolução dos últimos 6 meses</h2></div>
                        <div className="chart-legend"><span className="legend-income">Entradas</span><span className="legend-expense">Saídas</span></div>
                    </div>
                    <canvas ref={evolutionCanvas} aria-label="Gráfico de evolução dos últimos seis meses" />
                </article>

                <article className="panel history-panel">
                    <div className="panel-heading">
                        <div><span className="eyebrow dark">Movimentações</span><h2>Histórico mensal</h2></div>
                        <div className="history-tools">
                            <label className="search-field"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar movimentação" aria-label="Buscar movimentação" /></label>
                            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="Filtrar movimentações">
                                <option value="all">Todas</option><option value="income">Entradas</option><option value="expense">Saídas</option>
                            </select>
                            <button className="export-button" type="button" onClick={exportCsv}>Exportar CSV</button>
                        </div>
                    </div>
                    <div className="transaction-list">
                        {visibleTransactions.map(item => (
                            <article className="transaction" key={item.id}>
                                <span className="transaction-icon">{item.type === "income" ? "↑" : "↓"}</span>
                                <div><h3>{item.description}</h3><p>{item.category} • {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}</p></div>
                                <strong className={`transaction-value ${item.type}`}>{item.type === "income" ? "+" : "-"} {money(item.amount)}</strong>
                                <ActionButton action="duplicate" label={`Duplicar ${item.description}`} symbol="⧉" className="duplicate-button" onClick={() => duplicateTransaction(item)} />
                                <ActionButton action="edit" label={`Editar ${item.description}`} symbol="✎" className="edit-button" onClick={() => editTransaction(item)} />
                                <ActionButton action="delete" label={`Remover ${item.description}`} symbol="✕" className="delete-button" onClick={() => deleteTransaction(item.id)} />
                            </article>
                        ))}
                    </div>
                    {!visibleTransactions.length ? <div className="empty-state"><span>✦</span><strong>Nenhuma movimentação neste período</strong><p>Use o formulário para registrar sua primeira entrada ou saída.</p></div> : null}
                </article>
            </section>
        </main>
    );
}

export default App;
