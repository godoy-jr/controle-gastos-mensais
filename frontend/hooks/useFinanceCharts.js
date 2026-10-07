import { useEffect } from "react";
import { CHART_COLORS } from "../constants/finance.js";
import { formatMoney, prepareCanvas, shiftMonth, totalsForMonth } from "../utils/finance.js";

export default function useFinanceCharts({
    flowCanvas,
    categoryCanvas,
    evolutionCanvas,
    transactions,
    totals,
    categoryExpenses,
    month,
    resolvedTheme,
    activePage
}) {
    useEffect(() => {
        const drawCharts = () => {
            const dark = resolvedTheme === "dark";
            const textColor = dark ? "#f5f4ff" : "#15172d";
            const mutedColor = dark ? "#a7a7ba" : "#74758a";
            const flow = flowCanvas.current;
            const categoryChart = categoryCanvas.current;
            const evolution = evolutionCanvas.current;
            if (!flow && !categoryChart && !evolution) return;

            if (flow) {
                const { context: ctx, width } = prepareCanvas(flow);
                const max = Math.max(totals.income, totals.expense, 1);
                const bars = [
                    { label: "Entradas", value: totals.income, color: "#17b890" },
                    { label: "Saídas", value: totals.expense, color: "#ef6079" }
                ];
                ctx.font = "600 12px Inter";
                ctx.textAlign = "center";
                bars.forEach((bar, index) => {
                    const barWidth = Math.min(110, width / 4);
                    const x = width * (index ? 0.65 : 0.35) - barWidth / 2;
                    const barHeight = (bar.value / max) * 145;
                    ctx.fillStyle = "#eeedf4";
                    ctx.beginPath();
                    ctx.roundRect(x, 42, barWidth, 150, 14);
                    ctx.fill();
                    ctx.fillStyle = bar.color;
                    ctx.beginPath();
                    ctx.roundRect(x, 192 - barHeight, barWidth, barHeight, 14);
                    ctx.fill();
                    ctx.fillStyle = textColor;
                    ctx.fillText(bar.label, x + barWidth / 2, 218);
                    ctx.fillStyle = mutedColor;
                    ctx.font = "500 11px Inter";
                    ctx.fillText(formatMoney(bar.value), x + barWidth / 2, 238);
                    ctx.font = "600 12px Inter";
                });
            }

            if (categoryChart) {
                const { context: ctx, width } = prepareCanvas(categoryChart);
                const entries = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
                const total = entries.reduce((sum, [, value]) => sum + value, 0);
                if (!total) {
                    ctx.fillStyle = mutedColor;
                    ctx.font = "500 12px Inter";
                    ctx.textAlign = "center";
                    ctx.fillText("Registre despesas para visualizar a distribuição", width / 2, 132);
                } else {
                    const centerX = Math.min(width * 0.32, 165);
                    const centerY = 125;
                    let angle = -Math.PI / 2;
                    entries.forEach(([label, value], index) => {
                        const slice = (value / total) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 78, angle, angle + slice);
                        ctx.arc(centerX, centerY, 43, angle + slice, angle, true);
                        ctx.closePath();
                        ctx.fillStyle = CHART_COLORS[index % CHART_COLORS.length];
                        ctx.fill();
                        angle += slice;
                        if (index < 5) {
                            const y = 65 + index * 31;
                            ctx.fillStyle = CHART_COLORS[index % CHART_COLORS.length];
                            ctx.fillRect(width * 0.58, y - 9, 10, 10);
                            ctx.fillStyle = textColor;
                            ctx.font = "600 11px Inter";
                            ctx.textAlign = "left";
                            ctx.fillText(label, width * 0.58 + 17, y);
                        }
                    });
                    ctx.fillStyle = textColor;
                    ctx.font = "700 14px Inter";
                    ctx.textAlign = "center";
                    ctx.fillText(formatMoney(total), centerX, centerY + 5);
                }
            }

            if (evolution) {
                const { context: ctx, width } = prepareCanvas(evolution);
                const months = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5));
                const series = months.map(value => ({ month: value, ...totalsForMonth(transactions, value) }));
                const max = Math.max(...series.flatMap(item => [item.income, item.expense]), 1);
                const left = 42;
                const right = width - 20;
                const top = 30;
                const bottom = 205;
                const step = (right - left) / 5;
                ctx.strokeStyle = dark ? "#343750" : "#e9e7f1";
                ctx.lineWidth = 1;
                for (let line = 0; line < 4; line += 1) {
                    const y = top + ((bottom - top) / 3) * line;
                    ctx.beginPath();
                    ctx.moveTo(left, y);
                    ctx.lineTo(right, y);
                    ctx.stroke();
                }
                const drawLine = (key, color) => {
                    ctx.beginPath();
                    series.forEach((item, index) => {
                        const x = left + step * index;
                        const y = bottom - (item[key] / max) * (bottom - top);
                        index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                    });
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    series.forEach((item, index) => {
                        const x = left + step * index;
                        const y = bottom - (item[key] / max) * (bottom - top);
                        ctx.beginPath();
                        ctx.arc(x, y, 4, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                    });
                };
                drawLine("income", "#17b890");
                drawLine("expense", "#ef6079");
                ctx.fillStyle = mutedColor;
                ctx.font = "500 10px Inter";
                ctx.textAlign = "center";
                series.forEach((item, index) => {
                    const label = new Date(`${item.month}-02T12:00:00`)
                        .toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
                    ctx.fillText(label, left + step * index, 232);
                });
            }
        };

        drawCharts();
        const timer = window.setTimeout(drawCharts, 120);
        window.addEventListener("resize", drawCharts);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("resize", drawCharts);
        };
    }, [transactions, totals, categoryExpenses, month, resolvedTheme, activePage]);
}
