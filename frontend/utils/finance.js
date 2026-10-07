export const formatMoney = value =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const getToday = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const getCurrentMonth = () => getToday().slice(0, 7);

export const shiftMonth = (month, offset) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(year, monthNumber - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export function totalsForMonth(transactions, month) {
    return transactions
        .filter(item => item.date.startsWith(month))
        .reduce((summary, item) => ({
            ...summary,
            [item.type]: summary[item.type] + item.amount
        }), { income: 0, expense: 0 });
}

export function prepareCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 520;
    const height = 260;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width };
}

export function comparisonText(current, previous, label) {
    return previous
        ? `${current >= previous ? "↑" : "↓"} ${Math.abs(Math.round(((current - previous) / previous) * 100))}% vs. mês anterior`
        : `${label[0].toUpperCase() + label.slice(1)} no período`;
}

export function exportTransactionsCsv(transactions, month) {
    const escapeCell = value => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
        ["Data", "Tipo", "Descrição", "Categoria", "Valor"],
        ...transactions.map(item => [
            item.date,
            item.type === "income" ? "Entrada" : "Saída",
            item.description,
            item.category,
            item.amount.toFixed(2)
        ])
    ];
    const csv = `\uFEFF${rows.map(row => row.map(escapeCell).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fluxo-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
