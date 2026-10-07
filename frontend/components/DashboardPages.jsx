import MarketPortfolio from "../MarketPortfolio.jsx";
import { CATEGORIES } from "../constants/finance.js";
import GoalsPanel from "./GoalsPanel.jsx";
import InsightsPanel from "./InsightsPanel.jsx";
import SummaryCards from "./SummaryCards.jsx";
import TransactionForm from "./TransactionForm.jsx";
import TransactionHistory from "./TransactionHistory.jsx";

export default function DashboardPages({
    activePage,
    finance,
    transactionForm,
    goalForm,
    charts,
    onExportCsv
}) {
    const { totals, previousTotals, balance, savingsRate, monthlyTransactions, monthlyGoals, categoryExpenses, visibleTransactions } = finance;

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
                        <canvas ref={charts.flowCanvas} aria-label="Gráfico de entradas e saídas" />
                    </article>
                    <article className="panel chart-panel">
                        <div className="panel-heading"><div><span className="eyebrow dark">Distribuição</span><h2>Gastos por categoria</h2></div></div>
                        <canvas ref={charts.categoryCanvas} aria-label="Gráfico de gastos por categoria" />
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
                        <canvas ref={charts.evolutionCanvas} aria-label="Gráfico de evolução dos últimos seis meses" />
                    </article>
                </section>
            </section>
        </>
    );
}
