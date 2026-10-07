import { Router } from "express";
import { getNewsFeed } from "../controllers/newsController.js";
import { marketRateLimit } from "../middleware/marketRateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const newsRoutes = Router();
newsRoutes.use(marketRateLimit);
newsRoutes.get("/", asyncHandler(getNewsFeed));
