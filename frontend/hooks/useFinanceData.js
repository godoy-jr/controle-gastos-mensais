import { useMemo, useState } from "react";
import { STORAGE_KEYS } from "../constants/finance.js";
import useStoredArray from "./useStoredArray.js";
import { getCurrentMonth, shiftMonth, totalsForMonth, formatMoney } from "../utils/finance.js";

export default function useFinanceData() {
    const [transactions, setTransactions] = useStoredArray(STORAGE_KEYS.transactions);
    const [goals, setGoals] = useStoredArray(STORAGE_KEYS.goals);
    const [month, setMonth] = useState(getCurrentMonth);
    const [typeFilter, setTypeFilter] = useState("all");
    const [search, setSearch] = useState("");

    const monthlyTransactions = useMemo(
        () => transactions.filter(item => item.date.startsWith(month)),
        [transactions, month]
    );
    const totals = useMemo(() => totalsForMonth(transactions, month), [transactions, month]);
    const categoryExpenses = useMemo(() => monthlyTransactions
        .filter(item => item.type === "expense")
        .reduce((summary, item) => ({
            ...summary,
            [item.category]: (summary[item.category] || 0) + item.amount
        }), {}), [monthlyTransactions]);
    const visibleTransactions = useMemo(() => {
        const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
        return monthlyTransactions
            .filter(item => typeFilter === "all" || item.type === typeFilter)
            .filter(item => !searchTerm || `${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(searchTerm))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [monthlyTransactions, search, typeFilter]);
    const monthlyGoals = goals.filter(goal => goal.month === month);
    const previousTotals = totalsForMonth(transactions, shiftMonth(month, -1));
    const balance = totals.income - totals.expense;
    const savingsRate = totals.income ? (balance / totals.income) * 100 : 0;

    const insights = useMemo(() => {
        if (!monthlyTransactions.length) return [];
        const ranking = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
        const result = [];
        if (ranking[0]) result.push(["◈", `${ranking[0][0]} é sua maior categoria de gastos, com ${formatMoney(ranking[0][1])}.`]);
        result.push(balance >= 0
            ? ["↗", `Você manteve ${formatMoney(balance)} após todas as saídas.`]
            : ["!", `Faltam ${formatMoney(Math.abs(balance))} para equilibrar o mês.`]);
        if (savingsRate < 20 && totals.income > 0) {
            result.push(["✦", "Tente reservar 20% das entradas para emergências e objetivos futuros."]);
        }
        const exceeded = monthlyGoals.filter(goal => (categoryExpenses[goal.category] || 0) > goal.limit);
        if (exceeded.length) {
            result.push(["!", `${exceeded.length} ${exceeded.length === 1 ? "meta foi ultrapassada" : "metas foram ultrapassadas"}. Revise os gastos dessas categorias.`]);
        }
        return result;
    }, [monthlyTransactions, categoryExpenses, balance, savingsRate, totals.income, monthlyGoals]);

    return {
        transactions,
        setTransactions,
        goals,
        setGoals,
        month,
        setMonth,
        typeFilter,
        setTypeFilter,
        search,
        setSearch,
        monthlyTransactions,
        totals,
        categoryExpenses,
        visibleTransactions,
        monthlyGoals,
        previousTotals,
        balance,
        savingsRate,
        insights
    };
}
