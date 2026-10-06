const navigationItems = [
    { id: "overview", icon: "⌂", label: "Visão geral" },
    { id: "transactions", icon: "↕", label: "Movimentações" },
    { id: "planning", icon: "◎", label: "Planejamento" },
    { id: "investments", icon: "▥", label: "Investimentos" },
    { id: "analytics", icon: "⌁", label: "Análises" }
];

export default function Sidebar({ activePage, onNavigate }) {
    return (
        <aside className="sidebar">
            <a className="brand" href="#overview" onClick={() => onNavigate("overview")}>
                <span className="brand-mark" aria-hidden="true">F</span>
                <span><strong>Fluxo</strong><small>CONTROLE FINANCEIRO</small></span>
            </a>

            <span className="sidebar-label">MENU PRINCIPAL</span>
            <nav className="sidebar-nav" aria-label="Menu principal">
                {navigationItems.map(item => (
                    <button
                        className={`nav-item${activePage === item.id ? " active" : ""}`}
                        key={item.id}
                        type="button"
                        aria-current={activePage === item.id ? "page" : undefined}
                        onClick={() => onNavigate(item.id)}
                    >
                        <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                        <span>{item.label}</span>
                        {activePage === item.id ? <i aria-hidden="true" /> : null}
                    </button>
                ))}
            </nav>

            <div className="sidebar-note">
                <span aria-hidden="true">✦</span>
                <strong>Um passo de cada vez</strong>
                <p>Pequenas escolhas hoje constroem um futuro mais leve.</p>
            </div>
            <p className="sidebar-footer">SEUS DADOS FICAM NO SEU NAVEGADOR</p>
        </aside>
    );
}
