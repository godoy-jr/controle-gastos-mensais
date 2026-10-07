import { env } from "../config/env.js";
import { transactionRepository } from "../repositories/transactionRepository.js";
import { HttpError } from "../utils/httpError.js";

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
};

export type FinanceSummary = {
    income: number;
    expenses: number;
    investments: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
};

export async function askFinancialAssistant(userId: string, message: string, clientSummary?: FinanceSummary) {
    if (!env.GEMINI_API_KEY) {
        throw new HttpError(503, "Assistente indisponível: configure GEMINI_API_KEY no backend.");
    }
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    let financialContext: {
        period: string;
        income: string | number;
        expenses: string | number;
        investments: string | number;
        expensesByCategory: Array<{ category: string; amount: string | number }>;
    };
    if (clientSummary) {
        financialContext = { period: "Últimos 30 dias", ...clientSummary };
    } else {
        const [totals, categories] = await Promise.all([
            transactionRepository.getMonthlySummary(userId, start, end),
            transactionRepository.getRecentCategoryExpenses(userId, start, end)
        ]);
        const summary = Object.fromEntries(totals.map(item => [item.type, item._sum.amount?.toString() || "0"]));
        financialContext = {
            period: "Últimos 30 dias",
            income: summary.INCOME || "0",
            expenses: summary.EXPENSE || "0",
            investments: summary.INVESTMENT || "0",
            expensesByCategory: categories
        };
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
        {
            method: "POST",
            signal: AbortSignal.timeout(20_000),
            headers: {
                "content-type": "application/json",
                "x-goog-api-key": env.GEMINI_API_KEY
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{
                        text: "Você é um assistente educacional de finanças pessoais. Responda em português do Brasil, com clareza e sem prometer retornos. Use apenas o resumo financeiro fornecido para falar dos dados pessoais; se não houver dados suficientes, diga isso. Não peça credenciais, dados bancários ou informações sensíveis. Não forneça recomendação individual de compra ou venda de ativos."
                    }]
                },
                contents: [{
                    role: "user",
                    parts: [{ text: `Resumo financeiro do usuário (últimos 30 dias): ${JSON.stringify(financialContext)}\n\nPergunta: ${message}` }]
                }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
            })
        }
    );
    if (!response.ok) {
        if (response.status === 429) throw new HttpError(429, "Limite de consultas ao assistente atingido. Tente novamente mais tarde.");
        console.error("Gemini API returned status", response.status);
        throw new HttpError(502, "O provedor do assistente não conseguiu responder.");
    }
    const result = await response.json() as GeminiResponse;
    const answer = result.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();
    if (!answer) throw new HttpError(502, "O assistente retornou uma resposta vazia.");
    return { answer, generatedAt: new Date().toISOString() };
}
