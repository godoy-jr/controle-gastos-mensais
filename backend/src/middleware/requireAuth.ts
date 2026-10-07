import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export type AuthenticatedRequest = Request & { userId: string };

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
    const header = request.header("authorization");
    if (!header?.startsWith("Bearer ")) {
        next(new HttpError(401, "Autenticação necessária."));
        return;
    }

    try {
        const claims = jwt.verify(header.slice(7), env.JWT_SECRET);
        if (typeof claims === "string" || typeof claims.sub !== "string") {
            throw new HttpError(401, "Token inválido.");
        }
        (request as AuthenticatedRequest).userId = claims.sub;
        next();
    } catch (error) {
        next(error instanceof HttpError ? error : new HttpError(401, "Token inválido ou expirado."));
    }
}
