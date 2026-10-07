import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import { askFinancialAssistant } from "../services/assistantService.js";

const chatSchema = z.object({
    message: z.string().trim().min(1).max(1500),
    financeSummary: z.object({
        income: z.number().nonnegative().max(1_000_000_000_000),
        expenses: z.number().nonnegative().max(1_000_000_000_000),
        investments: z.number().nonnegative().max(1_000_000_000_000),
        expensesByCategory: z.array(z.object({
            category: z.string().trim().min(1).max(60),
            amount: z.number().nonnegative().max(1_000_000_000_000)
        })).max(20)
    }).optional()
});

export async function postChatMessage(request: Request, response: Response) {
    const { message, financeSummary } = chatSchema.parse(request.body);
    const userId = (request as AuthenticatedRequest).userId;
    response.json(await askFinancialAssistant(userId, message, financeSummary));
}
