import { PrismaPg } from "@prisma/adapter-pg";

import env from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
    max: env.databasePoolMax,
    connectionTimeoutMillis: env.databaseConnectionTimeoutMs,
    idleTimeoutMillis: env.databaseIdleTimeoutMs,
});

export const prisma = new PrismaClient({
    adapter,
});

interface DatabaseTimeRow {
    currentTime: Date;
}

export async function checkDatabaseConnection(): Promise<Date> {
    const rows = await prisma.$queryRaw<DatabaseTimeRow[]>`
        SELECT NOW() AS "currentTime"
    `;

    const firstRow = rows.at(0);

    if (firstRow === undefined || !(firstRow.currentTime instanceof Date)) {
        throw new Error("Database health check returned an invalid value");
    }

    return firstRow.currentTime;
}

export async function connectDatabase(): Promise<void> {
    await prisma.$connect();
}

export async function closeDatabaseConnection(): Promise<void> {
    await prisma.$disconnect();
}
