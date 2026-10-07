import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { assistantRoutes } from "./routes/assistantRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { currencyRoutes } from "./routes/currencyRoutes.js";
import { newsRoutes } from "./routes/newsRoutes.js";
import { transactionRoutes } from "./routes/transactionRoutes.js";

export const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json({ limit: "32kb" }));
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/currencies", currencyRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/assistant", assistantRoutes);
app.use((_request, response) => response.status(404).json({ error: "Rota não encontrada." }));
app.use(errorHandler);
