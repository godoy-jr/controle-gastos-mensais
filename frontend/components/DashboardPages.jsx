import MarketPortfolio from "../MarketPortfolio.jsx";
import { lazy, Suspense, useMemo } from "react";
import { CATEGORIES } from "../constants/finance.js";
import GoalsPanel from "./GoalsPanel.jsx";
import InsightsPanel from "./InsightsPanel.jsx";
import SummaryCards from "./SummaryCards.jsx";
import TransactionForm from "./TransactionForm.jsx";
import TransactionHistory from "./TransactionHistory.jsx";

const FinanceCharts = lazy(() => import("./FinanceCharts.jsx"));
const CurrencyPanel = lazy(() => import("./CurrencyPanel.jsx"));
const NewsPanel = lazy(() => import("./NewsPanel.jsx"));
const AssistantPanel = lazy(() => import("./AssistantPanel.jsx"));

function FeatureLoading() {
    return <div className="feature-loading">Carregando painel…</div>;
}

export default function DashboardPages({
    activePage,
    finance,
    transactionForm,
    goalForm,
    onExportCsv
}) {
    const { totals, previousTotals, balance, savingsRate, monthlyTransactions, monthlyGoals, categoryExpenses, visibleTransactions } = finance;
    const chatSummary = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const recent = finance.transactions.filter(item => new Date(`${item.date}T00:00:00`) >= cutoff);
        const summary = { income: 0, expenses: 0, investments: 0, expensesByCategory: [] };
        const categoryTotals = new Map();
        recent.forEach(item => {
            if (item.type === "income") summary.income += item.amount;
            if (item.type === "expense") {
                summary.expenses += item.amount;
                categoryTotals.set(item.category, (categoryTotals.get(item.category) || 0) + item.amount);
            }
            if (item.type === "investment") summary.investments += item.amount;
        });
        summary.expensesByCategory = [...categoryTotals.entries()]
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 20);
        return summary;
    }, [finance.transactions]);

    return (
        <>
            <section className="page-view" id="overview" aria-label="Visão geral" hidden={activePage !== "overview"}>
                <SummaryCards
                    balance={finance.formatMoney(balance)}
                    balanceValue={balance}
                    totals={{ income: finance.formatMoney(totals.income), expense: finance.formatMoney(totals.expense) }}
                    comparisonText={type => finance.comparisonText(
                        totals[type],
                        previousTotals[type],
                        type === "income" ? "receitas" : "despesas"
                    )}
                />
                <section className="workspace-grid">
                    <article className="panel chart-panel">
                        <div className="panel-heading"><div><span className="eyebrow dark">Visão geral</span><h2>Entradas x saídas</h2></div></div>
                        {activePage === "overview"
                            ? <Suspense fallback={<FeatureLoading />}><FinanceCharts variant="flow" totals={totals} /></Suspense>
                            : null}
                    </article>
                    <article className="panel chart-panel">
                        <div className="panel-heading"><div><span className="eyebrow dark">Distribuição</span><h2>Gastos por categoria</h2></div></div>
                        {activePage === "overview"
                            ? <Suspense fallback={<FeatureLoading />}><FinanceCharts variant="category" categoryExpenses={categoryExpenses} /></Suspense>
                            : null}
                    </article>
                </section>
            </section>

            <section className="page-view" aria-label="Movimentações" hidden={activePage !== "transactions"}>
                <section className="workspace-grid">
                    <TransactionForm
                        {...transactionForm}
                        categories={CATEGORIES}
                        onSubmit={transactionForm.submitTransaction}
                        onReset={transactionForm.resetForm}
                    />
                    <TransactionHistory
                        search={finance.search}
                        setSearch={finance.setSearch}
                        typeFilter={finance.typeFilter}
                        setTypeFilter={finance.setTypeFilter}
                        onExport={onExportCsv}
                        transactions={visibleTransactions}
                        onDuplicate={transactionForm.duplicateTransaction}
                        onEdit={transactionForm.editTransaction}
                        onDelete={transactionForm.deleteTransaction}
                        money={finance.formatMoney}
                    />
                </section>
            </section>

            <section className="page-view" aria-label="Planejamento" hidden={activePage !== "planning"}>
                <GoalsPanel
                    categories={CATEGORIES}
                    goalCategory={goalForm.goalCategory}
                    setGoalCategory={goalForm.setGoalCategory}
                    goalLimit={goalForm.goalLimit}
                    setGoalLimit={goalForm.setGoalLimit}
                    onSubmit={goalForm.submitGoal}
                    monthlyGoals={monthlyGoals}
                    categoryExpenses={categoryExpenses}
                    money={finance.formatMoney}
                    onRemoveGoal={goalForm.removeGoal}
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
                        insights={finance.insights}
                    />
                    <article className="panel evolution-panel">
                        <div className="panel-heading">
                            <div><span className="eyebrow dark">Histórico visual</span><h2>Evolução dos últimos 6 meses</h2></div>
                            <div className="chart-legend"><span className="legend-income">Entradas</span><span className="legend-expense">Saídas</span></div>
                        </div>
                        {activePage === "analytics"
                            ? (
                                <Suspense fallback={<FeatureLoading />}>
                                    <FinanceCharts
                                        variant="evolution"
                                        transactions={finance.transactions}
                                        month={finance.month}
                                    />
                                </Suspense>
                            )
                            : null}
                    </article>
                </section>
            </section>

            <section className="page-view" aria-label="Câmbio" hidden={activePage !== "currencies"}>
                {activePage === "currencies" ? <Suspense fallback={<FeatureLoading />}><CurrencyPanel /></Suspense> : null}
            </section>

            <section className="page-view" aria-label="Notícias" hidden={activePage !== "news"}>
                {activePage === "news" ? <Suspense fallback={<FeatureLoading />}><NewsPanel /></Suspense> : null}
            </section>

            <section className="page-view" aria-label="Assistente" hidden={activePage !== "assistant"}>
                {activePage === "assistant" ? <Suspense fallback={<FeatureLoading />}><AssistantPanel financeSummary={chatSummary} /></Suspense> : null}
            </section>
        </>
    );
}
