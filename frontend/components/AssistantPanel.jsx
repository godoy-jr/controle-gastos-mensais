import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../services/api.js";

const TOKEN_KEY = "fluxo.apiToken";

export default function AssistantPanel({ financeSummary, marketContext, contextLabel = "finanças" }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
    const [authMode, setAuthMode] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [authLoading, setAuthLoading] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const conversationRef = useRef(null);

    useEffect(() => {
        conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, chatLoading]);

    const authenticate = async event => {
        event.preventDefault();
        setError("");
        setInfo("");
        setAuthLoading(true);
        try {
            const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
            const data = await apiRequest(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    ...(authMode === "register" && name.trim() ? { name: name.trim() } : {}),
                    email: email.trim(),
                    password
                })
            });
            localStorage.setItem(TOKEN_KEY, data.token);
            setToken(data.token);
            setPassword("");
            setInfo("Conta conectada. Agora você pode conversar com o assistente.");
        } catch (reason) {
            setError(reason.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const sendMessage = async event => {
        event.preventDefault();
        const question = message.trim();
        if (!question || !token) return;
        setError("");
        setMessages(current => [...current, { role: "user", text: question }]);
        setMessage("");
        setChatLoading(true);
        try {
            const result = await apiRequest("/assistant/chat", {
                method: "POST",
                token,
                body: JSON.stringify({ message: question, financeSummary, marketContext })
            });
            setMessages(current => [...current, { role: "assistant", text: result.answer }]);
        } catch (reason) {
            setError(reason.message);
        } finally {
            setChatLoading(false);
        }
    };

    const disconnect = () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setMessages([]);
        setInfo("");
        setError("");
    };

    return (
        <article className="panel assistant-panel">
            <div className="panel-heading">
                <div><span className="eyebrow dark">Assistência financeira</span><h2>{contextLabel === "câmbio" ? "Converse sobre câmbio" : "Converse com seu assistente"}</h2></div>
                {token ? <button className="secondary-button assistant-signout" type="button" onClick={disconnect}>Sair da conta</button> : <span className="ai-badge"><i /> Gemini</span>}
            </div>
            {!token ? (
                <div className="assistant-login">
                    <p>Entre ou crie uma conta para conversar com o assistente. {marketContext ? `O par ${marketContext.base}/BRL será enviado junto à pergunta, com a cotação indicativa se estiver disponível.` : "Quando você enviar uma pergunta, apenas um resumo agregado dos últimos 30 dias será enviado para gerar a resposta."}</p>
                    <div className="assistant-auth-tabs" role="group" aria-label="Acesso à conta">
                        <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>Entrar</button>
                        <button className={authMode === "register" ? "active" : ""} type="button" onClick={() => setAuthMode("register")}>Criar conta</button>
                    </div>
                    <form className="assistant-auth-form" onSubmit={authenticate}>
                        {authMode === "register" ? <label>Nome<input value={name} onChange={event => setName(event.target.value)} maxLength="80" autoComplete="name" /></label> : null}
                        <label>E-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
                        <label>Senha<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength="8" maxLength="128" autoComplete={authMode === "register" ? "new-password" : "current-password"} required /></label>
                        <button className="primary-button" type="submit" disabled={authLoading}>{authLoading ? "Conectando…" : authMode === "register" ? "Criar conta" : "Entrar"}</button>
                    </form>
                </div>
            ) : (
                <div className="assistant-chat">
                    <div className="chat-messages" ref={conversationRef} aria-live="polite">
                        {!messages.length ? <div className="chat-welcome"><span>✦</span><strong>Como posso ajudar?</strong><p>{marketContext ? `Pergunte sobre a cotação de ${marketContext.base}/BRL, conversão ou variações recentes.` : "Pergunte sobre organização financeira ou peça uma leitura dos seus dados registrados."}</p></div> : null}
                        {messages.map((item, index) => (
                            <div className={`chat-message ${item.role}`} key={`${item.role}-${index}`}>
                                <span>{item.role === "user" ? "Você" : "Assistente"}</span>
                                <p>{item.text}</p>
                            </div>
                        ))}
                        {chatLoading ? <div className="chat-thinking" role="status">Preparando uma resposta…</div> : null}
                    </div>
                    <form className="chat-composer" onSubmit={sendMessage}>
                        <label className="visually-hidden" htmlFor="assistant-message">Sua pergunta</label>
                        <textarea id="assistant-message" value={message} onChange={event => setMessage(event.target.value)} maxLength="1500" rows="2" placeholder="Escreva sua pergunta…" disabled={chatLoading} required />
                        <button className="primary-button" type="submit" disabled={chatLoading || !message.trim()}>Enviar</button>
                    </form>
                    <p className="chat-disclaimer">Conteúdo educativo; não representa recomendação de investimento. {marketContext ? "A cotação é indicativa, atualizada periodicamente e pode não refletir o valor de uma operação." : "Apenas totais e categorias dos últimos 30 dias são compartilhados com a IA junto à sua pergunta."}</p>
                </div>
            )}
            {info ? <p className="form-feedback" role="status">{info}</p> : null}
            {error ? <p className="api-error" role="alert">{error}</p> : null}
        </article>
    );
}
