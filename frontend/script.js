const TRANSACTIONS_KEY = "fluxo.transactions";
const GOALS_KEY = "fluxo.goals";
const THEME_KEY = "fluxo.theme";
const categories = {
    income: ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"],
    expense: ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Outros"]
};
const colors = ["#6c5ce7", "#17b890", "#f4a261", "#ef6079", "#4ea8de", "#9b5de5", "#e9c46a", "#7b8cde"];
const $ = selector => document.querySelector(selector);
const elements = {
    form: $("#transaction-form"), description: $("#description"), amount: $("#amount"), date: $("#date"), category: $("#category"),
    submit: $("#submit-transaction"), cancelEdit: $("#cancel-edit"), month: $("#month-filter"), typeFilter: $("#type-filter"), search: $("#search-filter"),
    list: $("#transaction-list"), empty: $("#empty-state"), feedback: $("#form-feedback"), balance: $("#balance-value"),
    income: $("#income-value"), expense: $("#expense-value"), helper: $("#balance-helper"), incomeTrend: $("#income-trend"), expenseTrend: $("#expense-trend"),
    flowChart: $("#flow-chart"), categoryChart: $("#category-chart"), evolutionChart: $("#evolution-chart"), themeChoices: document.querySelectorAll("[data-theme-choice]"),
    appearanceMenu: $(".appearance-menu"), exportCsv: $("#export-csv"),
    goalForm: $("#goal-form"), goalCategory: $("#goal-category"), goalLimit: $("#goal-limit"), goalList: $("#goal-list"), emptyGoals: $("#empty-goals"),
    healthScore: $("#health-score"), healthTitle: $("#health-title"), healthCopy: $("#health-copy"), insightList: $("#insight-list")
};
let transactions = loadArray(TRANSACTIONS_KEY);
let goals = loadArray(GOALS_KEY);
let editingId = null;

function loadArray(key) {
    try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : []; } catch { return []; }
}
function persist() {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}
function money(value) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function today() { return new Date().toISOString().slice(0, 10); }
function shiftMonth(month, offset) { const [year, monthNumber] = month.split("-").map(Number); const date = new Date(year, monthNumber - 1 + offset, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function selectedType() { return elements.form.querySelector("input[name='type']:checked").value; }
function createId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }

function updateCategories(selectedCategory = "") {
    elements.category.replaceChildren(...categories[selectedType()].map(name => {
        const option = document.createElement("option"); option.value = name; option.textContent = name; option.selected = name === selectedCategory; return option;
    }));
}
function populateGoalCategories() {
    elements.goalCategory.replaceChildren(...categories.expense.map(name => {
        const option = document.createElement("option"); option.value = name; option.textContent = name; return option;
    }));
}

// filter: seleciona apenas os lançamentos do mês atual.
function monthlyTransactions() {
    return transactions.filter(item => item.date.startsWith(elements.month.value));
}
function visibleTransactions() {
    const searchTerm = elements.search.value.trim().toLocaleLowerCase("pt-BR");
    return monthlyTransactions()
        .filter(item => elements.typeFilter.value === "all" || item.type === elements.typeFilter.value)
        .filter(item => !searchTerm || `${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(searchTerm))
        .sort((a, b) => b.date.localeCompare(a.date));
}

// reduce: transforma todas as movimentações em totais consolidados.
function totals() {
    return totalsForMonth(elements.month.value);
}
function totalsForMonth(month) {
    return transactions.filter(item => item.date.startsWith(month)).reduce((summary, item) => ({
        ...summary,
        [item.type]: summary[item.type] + item.amount
    }), { income: 0, expense: 0 });
}

function categoryExpenses() {
    return monthlyTransactions()
        .filter(item => item.type === "expense")
        .reduce((summary, item) => ({ ...summary, [item.category]: (summary[item.category] || 0) + item.amount }), {});
}

function updateSummary() {
    const total = totals(); const balance = total.income - total.expense;
    const previous = totalsForMonth(shiftMonth(elements.month.value, -1));
    elements.income.textContent = money(total.income); elements.expense.textContent = money(total.expense); elements.balance.textContent = money(balance);
    elements.helper.textContent = balance >= 0 ? "Seu mês está com saldo positivo" : "As saídas ultrapassaram as entradas";
    elements.incomeTrend.textContent = comparisonText(total.income, previous.income, "receitas");
    elements.expenseTrend.textContent = comparisonText(total.expense, previous.expense, "despesas");
}
function comparisonText(current, previous, label) {
    if (!previous) return `${label[0].toUpperCase() + label.slice(1)} no período`;
    const variation = Math.round(((current - previous) / previous) * 100); return `${variation >= 0 ? "↑" : "↓"} ${Math.abs(variation)}% vs. mês anterior`;
}

function actionButton(action, label, symbol, className) {
    const button = document.createElement("button"); button.type = "button"; button.dataset.action = action; button.className = className;
    button.textContent = symbol; button.setAttribute("aria-label", label); button.title = label; return button;
}
function transactionElement(item) {
    const article = document.createElement("article"); article.className = "transaction"; article.dataset.id = item.id;
    const icon = document.createElement("span"); icon.className = "transaction-icon"; icon.textContent = item.type === "income" ? "↑" : "↓";
    const info = document.createElement("div"); const title = document.createElement("h3"); title.textContent = item.description;
    const detail = document.createElement("p"); detail.textContent = `${item.category} • ${new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}`; info.append(title, detail);
    const value = document.createElement("strong"); value.className = `transaction-value ${item.type}`; value.textContent = `${item.type === "income" ? "+" : "-"} ${money(item.amount)}`;
    article.append(icon, info, value, actionButton("edit", `Editar ${item.description}`, "✎", "edit-button"), actionButton("delete", `Remover ${item.description}`, "✕", "delete-button"));
    return article;
}

function prepareCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1; const width = canvas.clientWidth || 520; const height = 260;
    canvas.width = width * ratio; canvas.height = height * ratio;
    const context = canvas.getContext("2d"); context.scale(ratio, ratio); context.clearRect(0, 0, width, height); return { context, width };
}
function canvasTextColor() { return document.body.dataset.theme === "dark" ? "#f5f4ff" : "#15172d"; }
function canvasMutedColor() { return document.body.dataset.theme === "dark" ? "#a7a7ba" : "#74758a"; }
function drawFlowChart() {
    const { context: ctx, width } = prepareCanvas(elements.flowChart); const total = totals(); const max = Math.max(total.income, total.expense, 1);
    const bars = [{ label: "Entradas", value: total.income, color: "#17b890" }, { label: "Saídas", value: total.expense, color: "#ef6079" }];
    ctx.font = "600 12px Inter"; ctx.textAlign = "center";
    bars.forEach((bar, index) => {
        const barWidth = Math.min(110, width / 4); const x = width * (index ? .65 : .35) - barWidth / 2; const barHeight = (bar.value / max) * 145;
        ctx.fillStyle = "#eeedf4"; ctx.beginPath(); ctx.roundRect(x, 42, barWidth, 150, 14); ctx.fill(); ctx.fillStyle = bar.color; ctx.beginPath(); ctx.roundRect(x, 192 - barHeight, barWidth, barHeight, 14); ctx.fill();
        ctx.fillStyle = canvasTextColor(); ctx.fillText(bar.label, x + barWidth / 2, 218); ctx.fillStyle = canvasMutedColor(); ctx.font = "500 11px Inter"; ctx.fillText(money(bar.value), x + barWidth / 2, 238); ctx.font = "600 12px Inter";
    });
}
function drawCategoryChart() {
    const { context: ctx, width } = prepareCanvas(elements.categoryChart); const entries = Object.entries(categoryExpenses()).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (!total) { ctx.fillStyle = canvasMutedColor(); ctx.font = "500 12px Inter"; ctx.textAlign = "center"; ctx.fillText("Registre despesas para visualizar a distribuição", width / 2, 132); return; }
    const centerX = Math.min(width * .32, 165); const centerY = 125; let angle = -Math.PI / 2;
    entries.forEach(([label, value], index) => {
        const slice = (value / total) * Math.PI * 2; ctx.beginPath(); ctx.arc(centerX, centerY, 78, angle, angle + slice); ctx.arc(centerX, centerY, 43, angle + slice, angle, true); ctx.closePath(); ctx.fillStyle = colors[index % colors.length]; ctx.fill(); angle += slice;
        if (index < 5) { const y = 65 + index * 31; ctx.fillRect(width * .58, y - 9, 10, 10); ctx.fillStyle = canvasTextColor(); ctx.font = "600 11px Inter"; ctx.textAlign = "left"; ctx.fillText(label, width * .58 + 17, y); ctx.fillStyle = colors[index % colors.length]; }
    });
    ctx.fillStyle = canvasTextColor(); ctx.font = "700 14px Inter"; ctx.textAlign = "center"; ctx.fillText(money(total), centerX, centerY + 5);
}

function drawEvolutionChart() {
    const { context: ctx, width } = prepareCanvas(elements.evolutionChart); const months = Array.from({ length: 6 }, (_, index) => shiftMonth(elements.month.value, index - 5));
    const series = months.map(month => ({ month, ...totalsForMonth(month) })); const max = Math.max(...series.flatMap(item => [item.income, item.expense]), 1);
    const left = 42; const right = width - 20; const top = 30; const bottom = 205; const step = (right - left) / 5;
    ctx.strokeStyle = document.body.dataset.theme === "dark" ? "#343750" : "#e9e7f1"; ctx.lineWidth = 1;
    for (let line = 0; line < 4; line += 1) { const y = top + ((bottom - top) / 3) * line; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); }
    const drawLine = (key, color) => { ctx.beginPath(); series.forEach((item, index) => { const x = left + step * index; const y = bottom - (item[key] / max) * (bottom - top); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); series.forEach((item, index) => { const x = left + step * index; const y = bottom - (item[key] / max) * (bottom - top); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }); };
    drawLine("income", "#17b890"); drawLine("expense", "#ef6079"); ctx.fillStyle = canvasMutedColor(); ctx.font = "500 10px Inter"; ctx.textAlign = "center";
    series.forEach((item, index) => { const label = new Date(`${item.month}-02T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""); ctx.fillText(label, left + step * index, 232); });
}

function goalElement(goal) {
    const spent = categoryExpenses()[goal.category] || 0; const percentage = Math.min((spent / goal.limit) * 100, 100); const item = document.createElement("article"); item.className = "goal-item";
    item.innerHTML = `<div class="goal-top"><strong></strong><span></span></div><div class="goal-track"><i class="goal-progress"></i></div><div class="goal-footer"><span></span><button class="goal-remove" type="button">Remover meta</button></div>`;
    item.querySelector("strong").textContent = goal.category; item.querySelector(".goal-top span").textContent = `${Math.round(percentage)}% utilizado`; item.querySelector(".goal-progress").style.width = `${percentage}%`;
    item.querySelector(".goal-progress").classList.toggle("warning", percentage >= 80); item.querySelector(".goal-footer span").textContent = `${money(spent)} de ${money(goal.limit)}`;
    item.querySelector("button").addEventListener("click", () => { goals = goals.filter(savedGoal => savedGoal.id !== goal.id); persist(); render(); }); return item;
}

function updateGoals() {
    const monthlyGoals = goals.filter(goal => goal.month === elements.month.value);
    elements.goalList.replaceChildren(...monthlyGoals.map(goalElement)); elements.emptyGoals.hidden = monthlyGoals.length > 0;
}

function insight(icon, text) {
    const item = document.createElement("div"); item.className = "insight"; const symbol = document.createElement("span"); symbol.textContent = icon; const copy = document.createElement("p"); copy.textContent = text; item.append(symbol, copy); return item;
}

// IA local: regras explicáveis analisam os totais, categorias e metas sem enviar dados.
function updateInsights() {
    const total = totals(); const balance = total.income - total.expense; const savingsRate = total.income ? (balance / total.income) * 100 : 0;
    const categoryRanking = Object.entries(categoryExpenses()).sort((a, b) => b[1] - a[1]); const insights = [];
    if (!monthlyTransactions().length) {
        elements.healthScore.textContent = "--"; elements.healthTitle.textContent = "Aguardando dados"; elements.healthCopy.textContent = "Registre movimentações para receber uma análise personalizada."; elements.insightList.replaceChildren(); return;
    }
    let score = 50;
    if (balance >= 0) score += 20; else score -= 20;
    if (savingsRate >= 20) score += 20; else if (savingsRate > 0) score += 10;
    if (goals.some(goal => goal.month === elements.month.value)) score += 10;
    score = Math.max(0, Math.min(score, 100));
    elements.healthScore.textContent = score; elements.healthTitle.textContent = score >= 80 ? "Saúde financeira excelente" : score >= 60 ? "Bom controle financeiro" : "Seu orçamento pede atenção";
    elements.healthCopy.textContent = `Taxa de economia estimada em ${Math.round(savingsRate)}% neste mês.`;
    if (categoryRanking[0]) insights.push(insight("◈", `${categoryRanking[0][0]} é sua maior categoria de gastos, com ${money(categoryRanking[0][1])}.`));
    insights.push(balance >= 0 ? insight("↗", `Você manteve ${money(balance)} após todas as saídas.`) : insight("!", `Faltam ${money(Math.abs(balance))} para equilibrar o mês.`));
    if (savingsRate < 20 && total.income > 0) insights.push(insight("✦", "Tente reservar 20% das entradas para emergências e objetivos futuros."));
    const exceeded = goals.filter(goal => goal.month === elements.month.value && (categoryExpenses()[goal.category] || 0) > goal.limit);
    if (exceeded.length) insights.push(insight("!", `${exceeded.length} ${exceeded.length === 1 ? "meta foi ultrapassada" : "metas foram ultrapassadas"}. Revise os gastos dessas categorias.`));
    elements.insightList.replaceChildren(...insights);
}

function resetTransactionForm() {
    editingId = null; elements.form.reset(); elements.date.value = today(); updateCategories(); elements.submit.textContent = "Adicionar movimentação"; elements.cancelEdit.hidden = true;
}
function startEditing(id) {
    const item = transactions.find(transaction => transaction.id === id); if (!item) return;
    editingId = id; elements.form.querySelector(`#type-${item.type}`).checked = true; updateCategories(item.category); elements.description.value = item.description; elements.amount.value = item.amount; elements.date.value = item.date;
    elements.submit.textContent = "Salvar alterações"; elements.cancelEdit.hidden = false; elements.form.scrollIntoView({ behavior: "smooth", block: "center" }); elements.description.focus();
}

function render() {
    const visible = visibleTransactions();
    // map + spread: cria e insere uma nova coleção de elementos no DOM.
    elements.list.replaceChildren(...visible.map(transactionElement)); elements.empty.hidden = visible.length > 0;
    updateSummary(); drawFlowChart(); drawCategoryChart(); drawEvolutionChart(); updateGoals(); updateInsights();
}

function resolvedTheme(preference) {
    return preference === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
}
function applyTheme(preference, shouldRender = true) {
    document.body.dataset.theme = resolvedTheme(preference); localStorage.setItem(THEME_KEY, preference);
    elements.themeChoices.forEach(button => button.classList.toggle("active", button.dataset.themeChoice === preference));
    if (shouldRender) render();
}
function exportCsv() {
    const items = visibleTransactions();
    if (!items.length) { elements.feedback.textContent = "Não há movimentações para exportar."; return; }
    const escapeCell = value => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [["Data", "Tipo", "Descrição", "Categoria", "Valor"], ...items.map(item => [item.date, item.type === "income" ? "Entrada" : "Saída", item.description, item.category, item.amount.toFixed(2)])];
    const csv = `\uFEFF${rows.map(row => row.map(escapeCell).join(";")).join("\n")}`; const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `fluxo-${elements.month.value}.csv`; link.click(); URL.revokeObjectURL(url);
}

elements.form.addEventListener("change", event => { if (event.target.name === "type") updateCategories(); });
elements.form.addEventListener("submit", event => {
    event.preventDefault(); const amount = Number(elements.amount.value); const description = elements.description.value.trim().replace(/\s+/g, " "); if (!description || amount <= 0) return;
    const formData = { description, amount, type: selectedType(), category: elements.category.value, date: elements.date.value };
    if (editingId) {
        // map + spread: atualiza somente o item selecionado sem alterar os demais.
        transactions = transactions.map(item => item.id === editingId ? { ...item, ...formData } : item);
        elements.feedback.textContent = "Movimentação atualizada com sucesso.";
    } else {
        transactions = [...transactions, { id: createId(), ...formData }];
        elements.feedback.textContent = "Movimentação adicionada com sucesso.";
    }
    persist(); resetTransactionForm(); render(); setTimeout(() => { elements.feedback.textContent = ""; }, 2500);
});
elements.cancelEdit.addEventListener("click", resetTransactionForm);
elements.list.addEventListener("click", event => {
    const button = event.target.closest("[data-action]"); if (!button) return; const id = button.closest(".transaction").dataset.id;
    if (button.dataset.action === "edit") startEditing(id);
    if (button.dataset.action === "delete") { transactions = transactions.filter(item => item.id !== id); if (editingId === id) resetTransactionForm(); persist(); render(); }
});
elements.goalForm.addEventListener("submit", event => {
    event.preventDefault(); const category = elements.goalCategory.value; const limit = Number(elements.goalLimit.value); if (limit <= 0) return;
    const existing = goals.find(goal => goal.month === elements.month.value && goal.category === category);
    goals = existing
        ? goals.map(goal => goal.id === existing.id ? { ...goal, limit } : goal)
        : [...goals, { id: createId(), month: elements.month.value, category, limit }];
    persist(); elements.goalForm.reset(); render();
});
elements.month.addEventListener("change", render); elements.typeFilter.addEventListener("change", render);
elements.search.addEventListener("input", render); elements.exportCsv.addEventListener("click", exportCsv);
elements.themeChoices.forEach(button => button.addEventListener("click", () => { applyTheme(button.dataset.themeChoice); elements.appearanceMenu.open = false; }));
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if ((localStorage.getItem(THEME_KEY) || "system") === "system") applyTheme("system"); });
document.addEventListener("click", event => { if (!elements.appearanceMenu.contains(event.target)) elements.appearanceMenu.open = false; });
document.addEventListener("keydown", event => { if (event.key === "Escape") elements.appearanceMenu.open = false; });
window.addEventListener("resize", () => { window.clearTimeout(window.chartTimer); window.chartTimer = window.setTimeout(() => { drawFlowChart(); drawCategoryChart(); drawEvolutionChart(); }, 120); });

elements.month.value = currentMonth(); elements.date.value = today(); updateCategories(); populateGoalCategories(); applyTheme(localStorage.getItem(THEME_KEY) || "system", false); render();
