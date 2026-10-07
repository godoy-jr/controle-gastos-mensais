import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
    getCategories,
    getTransactionSummary,
    getTransactions,
    patchTransaction,
    postCategory,
    postTransaction,
    removeTransaction
} from "../controllers/transactionController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const transactionRoutes = Router();
transactionRoutes.use(requireAuth);
transactionRoutes.get("/", asyncHandler(getTransactions));
transactionRoutes.post("/", asyncHandler(postTransaction));
transactionRoutes.patch("/:id", asyncHandler(patchTransaction));
transactionRoutes.delete("/:id", asyncHandler(removeTransaction));
transactionRoutes.get("/summary", asyncHandler(getTransactionSummary));
transactionRoutes.get("/categories", asyncHandler(getCategories));
transactionRoutes.post("/categories", asyncHandler(postCategory));
