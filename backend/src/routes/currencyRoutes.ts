import { Router } from "express";
import { getHistory, getRates } from "../controllers/currencyController.js";
import { marketRateLimit } from "../middleware/marketRateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const currencyRoutes = Router();
currencyRoutes.use(marketRateLimit);
currencyRoutes.get("/", asyncHandler(getRates));
currencyRoutes.get("/history", asyncHandler(getHistory));
