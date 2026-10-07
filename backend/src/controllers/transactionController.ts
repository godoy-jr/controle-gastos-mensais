import type { Request, Response } from "express";
import { z } from "zod";
import { transactionRepository } from "../repositories/transactionRepository.js";
import {
    createCategory,
    createTransaction,
    deleteTransaction,
    listCategories,
    listTransactions,
    updateTransaction
} from "../services/transactionService.js";
import { HttpError } from "../utils/httpError.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

const transactionTypeSchema = z.enum(["INCOME", "EXPENSE", "INVESTMENT"]);
const transactionSchema = z.object({
    description: z.string().trim().min(1).max(120),
    amount: z.number().positive().max(999999999999),
    type: transactionTypeSchema,
    date: z.iso.date(),
    categoryId: z.string().min(1).nullable().optional()
});

const categorySchema = z.object({
    name: z.string().trim().min(1).max(60),
    type: transactionTypeSchema
});

const userId = (request: Request) => (request as AuthenticatedRequest).userId;

export async function getTransactions(request: Request, response: Response) {
    const query = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }).parse(request.query);
    response.json(await listTransactions(userId(request), query.month));
}

export async function postTransaction(request: Request, response: Response) {
    response.status(201).json(await createTransaction(userId(request), transactionSchema.parse(request.body)));
}

export async function patchTransaction(request: Request, response: Response) {
    const id = z.string().min(1).parse(request.params.id);
    response.json(await updateTransaction(userId(request), id, transactionSchema.partial().parse(request.body)));
}

export async function removeTransaction(request: Request, response: Response) {
    const id = z.string().min(1).parse(request.params.id);
    await deleteTransaction(userId(request), id);
    response.status(204).end();
}

export async function getCategories(request: Request, response: Response) {
    response.json(await listCategories(userId(request)));
}

export async function postCategory(request: Request, response: Response) {
    const input = categorySchema.parse(request.body);
    try {
        response.status(201).json(await createCategory(userId(request), input.name, input.type));
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
            throw new HttpError(409, "Esta categoria já existe para o tipo selecionado.");
        }
        throw error;
    }
}

export async function getTransactionSummary(request: Request, response: Response) {
    const query = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).parse(request.query);
    const start = new Date(`${query.month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const rows = await transactionRepository.getMonthlySummary(userId(request), start, end);
    response.json({
        month: query.month,
        totals: Object.fromEntries(rows.map(row => [row.type, row._sum.amount?.toString() || "0"]))
    });
}
