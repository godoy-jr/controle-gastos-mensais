import { TransactionType } from "@prisma/client";
import { transactionRepository } from "../repositories/transactionRepository.js";
import { HttpError } from "../utils/httpError.js";

type TransactionInput = {
    description: string;
    amount: number;
    type: TransactionType;
    date: string;
    categoryId?: string | null;
};

function asDatabaseData(input: TransactionInput, userId: string) {
    return {
        description: input.description,
        amount: input.amount,
        type: input.type,
        date: new Date(`${input.date}T00:00:00.000Z`),
        userId,
        categoryId: input.categoryId || null
    };
}

async function validateCategory(userId: string, categoryId: string | null | undefined, type: TransactionType) {
    if (categoryId && !(await transactionRepository.categoryBelongsToUser(userId, categoryId, type))) {
        throw new HttpError(400, "A categoria informada não pertence a esta conta ou ao tipo selecionado.");
    }
}

export async function listTransactions(userId: string, month?: string) {
    return transactionRepository.list(userId, month);
}

export async function createTransaction(userId: string, input: TransactionInput) {
    await validateCategory(userId, input.categoryId, input.type);
    return transactionRepository.create(asDatabaseData(input, userId));
}

export async function updateTransaction(userId: string, id: string, input: Partial<TransactionInput>) {
    const existing = await transactionRepository.findById(userId, id);
    if (!existing) throw new HttpError(404, "Movimentação não encontrada.");
    const type = input.type || existing.type;
    if (input.categoryId !== undefined) {
        await validateCategory(userId, input.categoryId, type);
    } else if (input.type && input.type !== existing.type && existing.categoryId) {
        await validateCategory(userId, existing.categoryId, type);
    }
    const data: Record<string, unknown> = { ...input };
    if (input.date) data.date = new Date(`${input.date}T00:00:00.000Z`);
    if (input.categoryId !== undefined) data.categoryId = input.categoryId || null;
    const updated = await transactionRepository.update(userId, id, data);
    if (!updated.count) throw new HttpError(404, "Movimentação não encontrada.");
    return transactionRepository.findById(userId, id);
}

export async function deleteTransaction(userId: string, id: string) {
    const deleted = await transactionRepository.delete(userId, id);
    if (!deleted.count) throw new HttpError(404, "Movimentação não encontrada.");
}

export async function listCategories(userId: string) {
    return transactionRepository.listCategories(userId);
}

export async function createCategory(userId: string, name: string, type: TransactionType) {
    return transactionRepository.createCategory(userId, name, type);
}
