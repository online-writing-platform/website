import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the database.");
}

const adapter = new PrismaPg({
    connectionString: databaseUrl,
});

const prisma = new PrismaClient({
    adapter,
});

const genres = [
    ["romance", "Romance"],
    ["fantasy", "Fantasy"],
    ["science-fiction", "Science Fiction"],
    ["mystery", "Mystery"],
    ["thriller", "Thriller"],
    ["horror", "Horror"],
    ["adventure", "Adventure"],
    ["historical-fiction", "Historical Fiction"],
    ["young-adult", "Young Adult"],
    ["humor", "Humor"],
    ["poetry", "Poetry"],
    ["fan-fiction", "Fan Fiction"],
    ["non-fiction", "Non-fiction"],
    ["short-story", "Short Story"],
] as const;

async function main(): Promise<void> {
    for (const [index, [slug, name]] of genres.entries()) {
        await prisma.genre.upsert({
            where: {
                slug,
            },
            update: {
                name,
                isActive: true,
                sortOrder: index,
            },
            create: {
                slug,
                name,
                sortOrder: index,
            },
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error: unknown) => {
        console.error(error);
        await prisma.$disconnect();
        process.exitCode = 1;
    });
