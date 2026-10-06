export default function TransactionForm({
    formRef,
    categories,
    type,
    setType,
    description,
    setDescription,
    amount,
    setAmount,
    date,
    setDate,
    category,
    setCategory,
    onSubmit,
    editingId,
    feedback,
    onReset
}) {
    const isDuplicate = feedback.startsWith("Revise");

    return (
        <article className="panel form-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Nova movimentação</span><h2>Registrar valor</h2></div>
            </div>
            <form id="transaction-form" ref={formRef} onSubmit={onSubmit}>
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
                    <button className="primary-button" type="submit">
                        {editingId ? "Salvar alterações" : isDuplicate ? "Adicionar cópia" : "Adicionar movimentação"}
                    </button>
                    {editingId || isDuplicate ? <button className="secondary-button" type="button" onClick={onReset}>Cancelar edição</button> : null}
                </div>
                <p className="form-feedback" role="status" aria-live="polite">{feedback}</p>
            </form>
        </article>
    );
}
