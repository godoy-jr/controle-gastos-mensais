import type { Request, Response } from "express";
import { z } from "zod";
import { authenticateUser, registerUser } from "../services/authService.js";

const credentialsSchema = z.object({
    email: z.email().max(254).transform(value => value.toLowerCase()),
    password: z.string().min(8).max(128)
});

const registrationSchema = credentialsSchema.extend({
    name: z.string().trim().min(1).max(80).optional()
});

export async function register(request: Request, response: Response) {
    const input = registrationSchema.parse(request.body);
    response.status(201).json(await registerUser(input));
}

export async function login(request: Request, response: Response) {
    const input = credentialsSchema.parse(request.body);
    response.json(await authenticateUser(input));
}
