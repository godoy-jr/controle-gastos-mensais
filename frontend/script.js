const STORAGE_KEY = "fluxo.transactions";
const categories = {
    income: ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"],
    expense: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Outros"]
};
const colors = ["#6c5ce7", "#17b890", "#f4a261", "#ef6079", "#4ea8de", "#9b5de5", "#e9c46a", "#7b8cde"];
const $ = selector => document.querySelector(selector);
const elements = {
    form: $("#transaction-form"), description: $("#description"), amount: $("#amount"), date: $("#date"), category: $("#category"),
    month: $("#month-filter"), typeFilter: $("#type-filter"), list: $("#transaction-list"), empty: $("#empty-state"), feedback: $("#form-feedback"),
    balance: $("#balance-value"), income: $("#income-value"), expense: $("#expense-value"), helper: $("#balance-helper"),
    flowChart: $("#flow-chart"), categoryChart: $("#category-chart")
};
let transactions = loadTransactions();

function loadTransactions() {
    try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(data) ? data : []; } catch { return []; }
}
function saveTransactions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function money(value) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function selectedType() { return elements.form.querySelector("input[name='type']:checked").value; }
function createId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }

function updateCategories() {
    const type = selectedType();
    elements.category.replaceChildren(...categories[type].map(name => {
        const option = document.createElement("option"); option.value = name; option.textContent = name; return option;
    }));
}

function monthlyTransactions() {
    return transactions.filter(item => item.date.startsWith(elements.month.value));
}

function visibleTransactions() {
    const type = elements.typeFilter.value;
    return monthlyTransactions().filter(item => type === "all" || item.type === type).sort((a, b) => b.date.localeCompare(a.date));
}

function totals() {
    return monthlyTransactions().reduce((acc, item) => {
        acc[item.type] += item.amount; return acc;
    }, { income: 0, expense: 0 });
}

function updateSummary() {
    const total = totals();
    const balance = total.income - total.expense;
    elements.income.textContent = money(total.income);
    elements.expense.textContent = money(total.expense);
    elements.balance.textContent = money(balance);
    elements.helper.textContent = balance >= 0 ? "Seu mês está com saldo positivo" : "As saídas ultrapassaram as entradas";
}

function transactionElement(item) {
    const article = document.createElement("article"); article.className = "transaction"; article.dataset.id = item.id;
    const icon = document.createElement("span"); icon.className = "transaction-icon"; icon.textContent = item.type === "income" ? "↑" : "↓";
    const info = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = item.description;
    const detail = document.createElement("p"); detail.textContent = `${item.category} • ${new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}`;
    info.append(title, detail);
    const value = document.createElement("strong"); value.className = `transaction-value ${item.type}`; value.textContent = `${item.type === "income" ? "+" : "-"} ${money(item.amount)}`;
    const remove = document.createElement("button"); remove.className = "delete-button"; remove.type = "button"; remove.dataset.action = "delete"; remove.textContent = "✕"; remove.setAttribute("aria-label", `Remover ${item.description}`);
    article.append(icon, info, value, remove); return article;
}

function prepareCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 520; const height = 260;
    canvas.width = width * ratio; canvas.height = height * ratio;
    const context = canvas.getContext("2d"); context.scale(ratio, ratio); context.clearRect(0, 0, width, height);
    return { context, width, height };
}

function drawFlowChart() {
    const { context: ctx, width, height } = prepareCanvas(elements.flowChart);
    const total = totals(); const max = Math.max(total.income, total.expense, 1);
    const bars = [{ label: "Entradas", value: total.income, color: "#17b890" }, { label: "Saídas", value: total.expense, color: "#ef6079" }];
    ctx.font = "600 12px Inter"; ctx.textAlign = "center";
    bars.forEach((bar, index) => {
        const barWidth = Math.min(110, width / 4); const x = width * (index ? .65 : .35) - barWidth / 2; const barHeight = (bar.value / max) * 145;
        ctx.fillStyle = "#eeedf4"; ctx.beginPath(); ctx.roundRect(x, 42, barWidth, 150, 14); ctx.fill();
        ctx.fillStyle = bar.color; ctx.beginPath(); ctx.roundRect(x, 192 - barHeight, barWidth, barHeight, 14); ctx.fill();
        ctx.fillStyle = "#15172d"; ctx.fillText(bar.label, x + barWidth / 2, 218); ctx.fillStyle = "#74758a"; ctx.font = "500 11px Inter"; ctx.fillText(money(bar.value), x + barWidth / 2, 238); ctx.font = "600 12px Inter";
    });
}

function drawCategoryChart() {
    const { context: ctx, width } = prepareCanvas(elements.categoryChart);
    const grouped = monthlyTransactions().filter(item => item.type === "expense").reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + item.amount; return acc; }, {});
    const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]); const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (!total) { ctx.fillStyle = "#74758a"; ctx.font = "500 12px Inter"; ctx.textAlign = "center"; ctx.fillText("Registre despesas para visualizar a distribuição", width / 2, 132); return; }
    const centerX = Math.min(width * .32, 165); const centerY = 125; let angle = -Math.PI / 2;
    entries.forEach(([label, value], index) => {
        const slice = (value / total) * Math.PI * 2; ctx.beginPath(); ctx.arc(centerX, centerY, 78, angle, angle + slice); ctx.arc(centerX, centerY, 43, angle + slice, angle, true); ctx.closePath(); ctx.fillStyle = colors[index % colors.length]; ctx.fill(); angle += slice;
        if (index < 5) { const y = 65 + index * 31; ctx.fillRect(width * .58, y - 9, 10, 10); ctx.fillStyle = "#15172d"; ctx.font = "600 11px Inter"; ctx.textAlign = "left"; ctx.fillText(label, width * .58 + 17, y); ctx.fillStyle = colors[index % colors.length]; }
    });
    ctx.fillStyle = "#15172d"; ctx.font = "700 14px Inter"; ctx.textAlign = "center"; ctx.fillText(money(total), centerX, centerY + 5);
}

function render() {
    const visible = visibleTransactions();
    elements.list.replaceChildren(...visible.map(transactionElement));
    elements.empty.hidden = visible.length > 0;
    updateSummary(); drawFlowChart(); drawCategoryChart();
}

elements.form.addEventListener("change", event => { if (event.target.name === "type") updateCategories(); });
elements.form.addEventListener("submit", event => {
    event.preventDefault();
    const amount = Number(elements.amount.value); const description = elements.description.value.trim().replace(/\s+/g, " ");
    if (!description || amount <= 0) return;
    transactions.push({ id: createId(), description, amount, type: selectedType(), category: elements.category.value, date: elements.date.value });
    saveTransactions(); elements.form.reset(); elements.date.value = new Date().toISOString().slice(0, 10); updateCategories(); render();
    elements.feedback.textContent = "Movimentação adicionada com sucesso."; setTimeout(() => { elements.feedback.textContent = ""; }, 2500);
});
elements.list.addEventListener("click", event => {
    const button = event.target.closest("[data-action='delete']"); if (!button) return;
    transactions = transactions.filter(item => item.id !== button.closest(".transaction").dataset.id); saveTransactions(); render();
});
elements.month.addEventListener("change", render);
elements.typeFilter.addEventListener("change", render);
window.addEventListener("resize", () => { window.clearTimeout(window.chartTimer); window.chartTimer = window.setTimeout(() => { drawFlowChart(); drawCategoryChart(); }, 120); });

elements.month.value = currentMonth();
elements.date.value = new Date().toISOString().slice(0, 10);
updateCategories();
render();
