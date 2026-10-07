import AppearanceMenu from "./AppearanceMenu.jsx";

export default function PageHeader({
    title,
    description,
    appearance,
    month,
    setMonth
}) {
    return (
        <header className="topbar">
            <div>
                <span className="eyebrow">Painel financeiro</span>
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            <div className="top-actions">
                <AppearanceMenu {...appearance} />
                <label className="month-field">
                    <span>Mês de referência</span>
                    <input type="month" value={month} onChange={event => setMonth(event.target.value)} />
                </label>
            </div>
        </header>
    );
}
