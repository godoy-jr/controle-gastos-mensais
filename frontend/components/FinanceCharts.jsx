import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { CHART_COLORS } from "../constants/finance.js";
import { formatMoney, shiftMonth, totalsForMonth } from "../utils/finance.js";

const tooltipStyle = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--surface)",
    color: "var(--navy)",
    fontSize: 11
};

function FlowChart({ totals }) {
    const data = [
        { name: "Entradas", amount: totals.income, fill: "#17b890" },
        { name: "Saídas", amount: totals.expense, fill: "#ef6079" }
    ];
    return (
        <div className="recharts-canvas">
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={value => formatMoney(value)} tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} width={74} />
                    <Tooltip formatter={value => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                    <Bar dataKey="amount" name="Total" radius={[9, 9, 0, 0]} maxBarSize={80}>
                        {data.map(item => <Cell key={item.name} fill={item.fill} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function CategoryChart({ categoryExpenses }) {
    const data = Object.entries(categoryExpenses)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    if (!data.length) {
        return <div className="chart-empty">Registre despesas para visualizar a distribuição</div>;
    }
    return (
        <div className="recharts-canvas">
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                        {data.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={value => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                </PieChart>
            </ResponsiveContainer>
            <div className="recharts-legend">
                {data.slice(0, 5).map((item, index) => (
                    <span key={item.name}>
                        <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                        {item.name}
                    </span>
                ))}
            </div>
        </div>
    );
}

function EvolutionChart({ transactions, month }) {
    const data = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5))
        .map(value => ({
            month: new Date(`${value}-02T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
            ...totalsForMonth(transactions, value)
        }));
    return (
        <div className="recharts-canvas evolution-recharts">
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 16, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={value => formatMoney(value)} tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} width={74} />
                    <Tooltip formatter={value => formatMoney(Number(value))} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="income" name="Entradas" stroke="#17b890" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expense" name="Saídas" stroke="#ef6079" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function FinanceCharts({ variant, totals, categoryExpenses, transactions, month }) {
    if (variant === "flow") return <FlowChart totals={totals} />;
    if (variant === "category") return <CategoryChart categoryExpenses={categoryExpenses} />;
    return <EvolutionChart transactions={transactions} month={month} />;
}
