import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { authRepository } from "../repositories/authRepository.js";
import { HttpError } from "../utils/httpError.js";

type Credentials = { email: string; password: string };
type Registration = Credentials & { name?: string };

function issueToken(userId: string): string {
    return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: "7d" });
}

export async function registerUser(input: Registration) {
    try {
        if (await authRepository.findUserByEmail(input.email)) {
            throw new HttpError(409, "Já existe uma conta com este e-mail.");
        }
        const user = await authRepository.createUser({
            email: input.email,
            name: input.name,
            passwordHash: await bcrypt.hash(input.password, 12)
        });
        return { user, token: issueToken(user.id) };
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
            throw new HttpError(409, "Já existe uma conta com este e-mail.");
        }
        throw error;
    }
}

export async function authenticateUser(input: Credentials) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new HttpError(401, "E-mail ou senha incorretos.");
    }
    return {
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
        token: issueToken(user.id)
    };
}
