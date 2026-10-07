import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const transactionInclude = { category: { select: { id: true, name: true, type: true } } } as const;

export const transactionRepository = {
    list(userId: string, month?: string) {
        let monthFilter = {};
        if (month) {
            const start = new Date(`${month}-01T00:00:00.000Z`);
            const end = new Date(start);
            end.setUTCMonth(end.getUTCMonth() + 1);
            monthFilter = { date: { gte: start, lt: end } };
        }
        return prisma.transaction.findMany({
            where: { userId, ...monthFilter },
            include: transactionInclude,
            orderBy: [{ date: "desc" }, { createdAt: "desc" }]
        });
    },
    create(data: Prisma.TransactionUncheckedCreateInput) {
        return prisma.transaction.create({ data, include: transactionInclude });
    },
    findById(userId: string, id: string) {
        return prisma.transaction.findFirst({ where: { userId, id } });
    },
    update(userId: string, id: string, data: Prisma.TransactionUncheckedUpdateInput) {
        return prisma.transaction.updateMany({ where: { userId, id }, data });
    },
    delete(userId: string, id: string) {
        return prisma.transaction.deleteMany({ where: { userId, id } });
    },
    async categoryBelongsToUser(userId: string, categoryId: string, type: TransactionType) {
        return Boolean(await prisma.category.findFirst({ where: { id: categoryId, userId, type } }));
    },
    async listCategories(userId: string) {
        return prisma.category.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { name: "asc" }] });
    },
    async createCategory(userId: string, name: string, type: TransactionType) {
        return prisma.category.create({ data: { userId, name, type } });
    },
    async getMonthlySummary(userId: string, startDate: Date, endDate: Date) {
        return prisma.transaction.groupBy({
            by: ["type"],
            where: { userId, date: { gte: startDate, lt: endDate } },
            _sum: { amount: true }
        });
    },
    async getRecentCategoryExpenses(userId: string, startDate: Date, endDate: Date) {
        const rows = await prisma.transaction.groupBy({
            by: ["categoryId"],
            where: { userId, type: "EXPENSE", date: { gte: startDate, lt: endDate }, categoryId: { not: null } },
            _sum: { amount: true }
        });
        const categoryIds = rows.flatMap(row => row.categoryId ? [row.categoryId] : []);
        const categories = await prisma.category.findMany({
            where: { userId, id: { in: categoryIds } },
            select: { id: true, name: true }
        });
        return rows.map(row => ({
            category: categories.find(category => category.id === row.categoryId)?.name || "Sem categoria",
            amount: row._sum.amount?.toString() || "0"
        }));
    }
};
