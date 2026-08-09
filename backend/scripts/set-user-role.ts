import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";

const [, , emailInput, roleInput] = process.argv;

if (!emailInput || !roleInput) {
    throw new Error("Usage: tsx scripts/set-user-role.ts <email> <USER|MODERATOR|ADMIN>");
}

const role = roleInput.toUpperCase();
if (role !== "USER" && role !== "MODERATOR" && role !== "ADMIN") {
    throw new Error("Role must be USER, MODERATOR, or ADMIN.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

try {
    const email = emailInput.trim().toLowerCase();
    const user = await prisma.user.update({
        where: { email },
        data: { role },
        select: { id: true, email: true, username: true, role: true },
    });

    await prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    console.log(JSON.stringify(user, null, 2));
    console.log("All active sessions were revoked. The user must sign in again.");
} finally {
    await prisma.$disconnect();
}
