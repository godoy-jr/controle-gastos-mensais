import { THEME_OPTIONS } from "../constants/finance.js";

export default function AppearanceMenu({
    appearanceOpen,
    appearanceRef,
    theme,
    setTheme,
    setAppearanceOpen
}) {
    return (
        <details className="appearance-menu" open={appearanceOpen} ref={appearanceRef}>
            <summary onClick={event => { event.preventDefault(); setAppearanceOpen(open => !open); }}>
                <span aria-hidden="true">◐</span> Aparência
            </summary>
            <div className="appearance-popover" role="group" aria-label="Escolher tema">
                <span className="popover-label">Tema da interface</span>
                {THEME_OPTIONS.map(([value, icon, label, helper]) => (
                    <button
                        className={theme === value ? "active" : ""}
                        key={value}
                        type="button"
                        onClick={() => { setTheme(value); setAppearanceOpen(false); }}
                    >
                        <span aria-hidden="true">{icon}</span><span>{label}<small>{helper}</small></span><i />
                    </button>
                ))}
            </div>
        </details>
    );
}
