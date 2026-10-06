import { useEffect, useMemo, useRef, useState } from "react";
import MarketPortfolio from "./MarketPortfolio.jsx";
import Sidebar from "./components/Sidebar.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import GoalsPanel from "./components/GoalsPanel.jsx";
import InsightsPanel from "./components/InsightsPanel.jsx";
import TransactionHistory from "./components/TransactionHistory.jsx";

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

function App() {
    const [transactions, setTransactions] = useStoredArray(TRANSACTIONS_KEY);
    const [goals, setGoals] = useStoredArray(GOALS_KEY);
    const [month, setMonth] = useState(currentMonth);
    const [activePage, setActivePage] = useState("overview");
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
            if (!flow && !categoryChart && !evolution) return;

            if (flow) {
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

            if (categoryChart) {
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

            if (evolution) {
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
    }, [transactions, totals, categoryExpenses, month, resolvedTheme, activePage]);

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
        setActivePage("transactions");
        setEditingId(item.id);
        setType(item.type);
        setDescription(item.description);
        setAmount(String(item.amount));
        setDate(item.date);
        setCategory(item.category);
        setFeedback("");
        window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    };

    const duplicateTransaction = item => {
        setActivePage("transactions");
        setEditingId(null);
        setType(item.type);
        setDescription(item.description);
        setAmount(String(item.amount));
        setDate(today());
        setCategory(item.category);
        setFeedback("Revise os dados e confirme para criar uma nova movimentação.");
        window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
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

    const pageDetails = {
        overview: ["Visão geral", "Acompanhe seu dinheiro e veja como está o mês."],
        transactions: ["Movimentações", "Registre e organize suas entradas e saídas."],
        planning: ["Planejamento", "Defina limites e acompanhe suas metas mensais."],
        investments: ["Investimentos", "Acompanhe sua carteira e as cotações da B3."],
        analytics: ["Análises", "Entenda seus hábitos e a evolução das suas finanças."]
    };
    const [pageTitle, pageDescription] = pageDetails[activePage];

    return (
        <div className="app-layout">
            <Sidebar activePage={activePage} onNavigate={setActivePage} />
            <main className="app-content">
                <header className="topbar">
                    <div>
                        <span className="eyebrow">Painel financeiro</span>
                        <h1>{pageTitle}</h1>
                        <p>{pageDescription}</p>
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

                <section className="page-view" id="overview" aria-label="Visão geral" hidden={activePage !== "overview"}>
                    <SummaryCards
                        balance={money(balance)}
                        balanceValue={balance}
                        totals={{ income: money(totals.income), expense: money(totals.expense) }}
                        comparisonText={type => comparisonText(
                            totals[type],
                            previousTotals[type],
                            type === "income" ? "receitas" : "despesas"
                        )}
                    />
                    <section className="workspace-grid">
                        <article className="panel chart-panel">
                            <div className="panel-heading"><div><span className="eyebrow dark">Visão geral</span><h2>Entradas x saídas</h2></div></div>
                            <canvas ref={flowCanvas} aria-label="Gráfico de entradas e saídas" />
                        </article>
                        <article className="panel chart-panel">
                            <div className="panel-heading"><div><span className="eyebrow dark">Distribuição</span><h2>Gastos por categoria</h2></div></div>
                            <canvas ref={categoryCanvas} aria-label="Gráfico de gastos por categoria" />
                        </article>
                    </section>
                </section>

                <section className="page-view" aria-label="Movimentações" hidden={activePage !== "transactions"}>
                    <section className="workspace-grid">
                        <TransactionForm
                            formRef={formRef}
                            categories={categories}
                            type={type}
                            setType={setType}
                            description={description}
                            setDescription={setDescription}
                            amount={amount}
                            setAmount={setAmount}
                            date={date}
                            setDate={setDate}
                            category={category}
                            setCategory={setCategory}
                            onSubmit={submitTransaction}
                            editingId={editingId}
                            feedback={feedback}
                            onReset={resetForm}
                        />
                        <TransactionHistory
                            search={search}
                            setSearch={setSearch}
                            typeFilter={typeFilter}
                            setTypeFilter={setTypeFilter}
                            onExport={exportCsv}
                            transactions={visibleTransactions}
                            onDuplicate={duplicateTransaction}
                            onEdit={editTransaction}
                            onDelete={deleteTransaction}
                            money={money}
                        />
                    </section>
                </section>

                <section className="page-view" aria-label="Planejamento" hidden={activePage !== "planning"}>
                    <GoalsPanel
                        categories={categories}
                        goalCategory={goalCategory}
                        setGoalCategory={setGoalCategory}
                        goalLimit={goalLimit}
                        setGoalLimit={setGoalLimit}
                        onSubmit={submitGoal}
                        monthlyGoals={monthlyGoals}
                        categoryExpenses={categoryExpenses}
                        money={money}
                        onRemoveGoal={id => setGoals(saved => saved.filter(item => item.id !== id))}
                    />
                </section>

                <section className="page-view" aria-label="Investimentos" hidden={activePage !== "investments"}>
                    <MarketPortfolio />
                </section>

                <section className="page-view" aria-label="Análises" hidden={activePage !== "analytics"}>
                    <section className="workspace-grid">
                        <InsightsPanel
                            monthlyTransactions={monthlyTransactions}
                            balance={balance}
                            savingsRate={savingsRate}
                            monthlyGoals={monthlyGoals}
                            insights={insights}
                        />
                        <article className="panel evolution-panel">
                            <div className="panel-heading">
                                <div><span className="eyebrow dark">Histórico visual</span><h2>Evolução dos últimos 6 meses</h2></div>
                                <div className="chart-legend"><span className="legend-income">Entradas</span><span className="legend-expense">Saídas</span></div>
                            </div>
                            <canvas ref={evolutionCanvas} aria-label="Gráfico de evolução dos últimos seis meses" />
                        </article>
                    </section>
                </section>
            </main>
        </div>
    );
}

export default App;
