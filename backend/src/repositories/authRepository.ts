import { prisma } from "../lib/prisma.js";

export const authRepository = {
    findUserByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
    createUser: (data: { email: string; name: string | undefined; passwordHash: string }) =>
        prisma.user.create({ data, select: { id: true, email: true, name: true, createdAt: true } })
};
