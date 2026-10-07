import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, () => {
    console.info(`Fluxo API listening on port ${env.PORT}`);
});

const shutdown = async (signal: string) => {
    console.info(`Received ${signal}; closing API server.`);
    server.close(async error => {
        await prisma.$disconnect();
        if (error) {
            console.error("Failed to close the API server cleanly.", error);
            process.exitCode = 1;
        }
    });
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
