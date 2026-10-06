export default function GoalsPanel({
    categories,
    goalCategory,
    setGoalCategory,
    goalLimit,
    setGoalLimit,
    onSubmit,
    monthlyGoals,
    categoryExpenses,
    money,
    onRemoveGoal
}) {
    return (
        <article className="panel goal-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Planejamento</span><h2>Metas mensais</h2></div>
            </div>
            <form className="goal-form" onSubmit={onSubmit}>
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
                                <button className="goal-remove" type="button" onClick={() => onRemoveGoal(goal.id)}>Remover meta</button>
                            </div>
                        </article>
                    );
                })}
            </div>
            {!monthlyGoals.length ? <div className="empty-goals">Crie limites por categoria para acompanhar seus gastos.</div> : null}
        </article>
    );
}
