import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
        response.status(400).json({
            error: "Dados inválidos.",
            details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message }))
        });
        return;
    }
    if (error instanceof HttpError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
    }
    console.error(error);
    response.status(500).json({ error: "Ocorreu um erro interno." });
};
