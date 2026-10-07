import { rateLimit } from "express-rate-limit";

export const marketRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de consultas de mercado atingido. Tente novamente mais tarde." }
});
