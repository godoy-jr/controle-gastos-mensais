export default function InsightsPanel({ monthlyTransactions, balance, savingsRate, monthlyGoals, insights }) {
    let score = 50;
    if (balance >= 0) score += 20;
    else score -= 20;
    if (savingsRate >= 20) score += 20;
    else if (savingsRate > 0) score += 10;
    if (monthlyGoals.length) score += 10;
    score = Math.max(0, Math.min(score, 100));

    return (
        <article className="panel insights-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Assistente inteligente</span><h2>Análise financeira</h2></div>
                <span className="ai-badge"><i /> IA local</span>
            </div>
            <div className="health-score">
                <span className="score-ring">{monthlyTransactions.length ? score : "--"}</span>
                <div>
                    <strong>
                        {!monthlyTransactions.length
                            ? "Aguardando dados"
                            : savingsRate >= 20 && balance >= 0
                                ? "Saúde financeira excelente"
                                : balance >= 0 ? "Bom controle financeiro" : "Seu orçamento pede atenção"}
                    </strong>
                    <p>{monthlyTransactions.length
                        ? `Taxa de economia estimada em ${Math.round(savingsRate)}% neste mês.`
                        : "Registre movimentações para receber uma análise personalizada."}</p>
                </div>
            </div>
            <div className="insight-list">
                {insights.map(([icon, text], index) => (
                    <div className="insight" key={`${icon}-${index}`}><span>{icon}</span><p>{text}</p></div>
                ))}
            </div>
            <p className="privacy-note">Seus dados são analisados apenas neste navegador.</p>
        </article>
    );
}
