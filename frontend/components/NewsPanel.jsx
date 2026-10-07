import { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

const categories = [
    ["economy", "Economia local"],
    ["stocks", "Ações"],
    ["currency", "Câmbio"],
    ["crypto", "Cripto"]
];

export default function NewsPanel() {
    const [category, setCategory] = useState("economy");
    const [feed, setFeed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        setFeed(null);
        setLoading(true);
        setError("");
        apiRequest(`/news?category=${category}`, { signal: controller.signal })
            .then(setFeed)
            .catch(reason => {
                if (reason.name !== "AbortError") setError(reason.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [category]);

    return (
        <article className="panel news-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Resumo diário</span><h2>Notícias do mercado financeiro</h2></div>
                {feed ? <span className="market-status">Atualizado {new Date(feed.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
            </div>
            <div className="news-filters" role="group" aria-label="Filtrar notícias">
                {categories.map(([value, label]) => (
                    <button className={`news-filter${category === value ? " active" : ""}`} key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>
                        {label}
                    </button>
                ))}
            </div>
            {loading ? <div className="feature-loading">Buscando as notícias mais recentes…</div> : null}
            {error ? <p className="api-error" role="alert">{error}</p> : null}
            {feed && !feed.items.length ? <div className="empty-state"><span>⌁</span><strong>Nenhuma notícia encontrada</strong><p>Tente novamente mais tarde.</p></div> : null}
            {feed?.items.length ? (
                <div className="news-list">
                    {feed.items.map((item, index) => (
                        <article className="news-item" key={`${item.link}-${index}`}>
                            <span className="news-index">{String(index + 1).padStart(2, "0")}</span>
                            <div>
                                <a href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
                                <p>{item.source}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
                            </div>
                            <span className="news-external" aria-hidden="true">↗</span>
                        </article>
                    ))}
                </div>
            ) : null}
            <p className="news-disclaimer">Notícias fornecidas via Google Notícias. A fonte original é indicada em cada matéria.</p>
        </article>
    );
}
