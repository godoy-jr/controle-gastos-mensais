import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    GEMINI_API_KEY: z.string().optional().default(""),
    GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
    PORT: z.coerce.number().int().positive().default(3001),
    FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173")
});

export const env = envSchema.parse(process.env);
