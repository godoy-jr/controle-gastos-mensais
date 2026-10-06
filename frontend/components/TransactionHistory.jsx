function ActionButton({ action, label, symbol, className, onClick }) {
    return (
        <button className={className} type="button" data-action={action} aria-label={label} title={label} onClick={onClick}>
            {symbol}
        </button>
    );
}

export default function TransactionHistory({
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    onExport,
    transactions,
    onDuplicate,
    onEdit,
    onDelete,
    money
}) {
    return (
        <article className="panel history-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Movimentações</span><h2>Histórico mensal</h2></div>
                <div className="history-tools">
                    <label className="search-field"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar movimentação" aria-label="Buscar movimentação" /></label>
                    <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="Filtrar movimentações">
                        <option value="all">Todas</option><option value="income">Entradas</option><option value="expense">Saídas</option>
                    </select>
                    <button className="export-button" type="button" onClick={onExport}>Exportar CSV</button>
                </div>
            </div>
            <div className="transaction-list">
                {transactions.map(item => (
                    <article className="transaction" key={item.id}>
                        <span className="transaction-icon">{item.type === "income" ? "↑" : "↓"}</span>
                        <div><h3>{item.description}</h3><p>{item.category} • {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}</p></div>
                        <strong className={`transaction-value ${item.type}`}>{item.type === "income" ? "+" : "-"} {money(item.amount)}</strong>
                        <ActionButton action="duplicate" label={`Duplicar ${item.description}`} symbol="⧉" className="duplicate-button" onClick={() => onDuplicate(item)} />
                        <ActionButton action="edit" label={`Editar ${item.description}`} symbol="✎" className="edit-button" onClick={() => onEdit(item)} />
                        <ActionButton action="delete" label={`Remover ${item.description}`} symbol="✕" className="delete-button" onClick={() => onDelete(item.id)} />
                    </article>
                ))}
            </div>
            {!transactions.length ? (
                <div className="empty-state"><span>✦</span><strong>Nenhuma movimentação neste período</strong><p>Use o formulário para registrar sua primeira entrada ou saída.</p></div>
            ) : null}
        </article>
    );
}
