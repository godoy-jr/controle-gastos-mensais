import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { login, register } from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRoutes = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

authRoutes.post("/register", authLimiter, asyncHandler(register));
authRoutes.post("/login", authLimiter, asyncHandler(login));
