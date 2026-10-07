import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { postChatMessage } from "../controllers/assistantController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const assistantRoutes = Router();
assistantRoutes.use(requireAuth);
assistantRoutes.post("/chat", rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
}), asyncHandler(postChatMessage));
