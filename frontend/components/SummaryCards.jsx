export default function SummaryCards({ balance, balanceValue, totals, comparisonText }) {
    return (
        <section className="summary-grid" aria-label="Resumo financeiro">
            <article className="summary-card balance-card">
                <span className="card-label">Saldo do mês</span>
                <strong>{balance}</strong>
                <span className="card-helper">{balanceValue >= 0 ? "Seu mês está com saldo positivo" : "As saídas ultrapassaram as entradas"}</span>
            </article>
            <article className="summary-card income-card">
                <span className="card-label">Entradas</span>
                <strong>{totals.income}</strong>
                <span className="trend positive">{comparisonText("income")}</span>
            </article>
            <article className="summary-card expense-card">
                <span className="card-label">Saídas</span>
                <strong>{totals.expense}</strong>
                <span className="trend negative">{comparisonText("expense")}</span>
            </article>
        </section>
    );
}
