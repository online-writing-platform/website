import { prisma } from "../../db/index.js";
import { buildCursorPage } from "../../shared/pagination/page.js";
import { buildVisibleStoryWhere, storySummarySelect } from "./reading.visibility.js";

export class LibraryRepository {
    public async addLibraryEntry(
        userId: string,
        storyId: string,
    ): Promise<void> {
        await prisma.libraryEntry.upsert({
            where: {
                userId_storyId: {
                    userId,
                    storyId,
                },
            },
            create: {
                userId,
                storyId,
            },
            update: {},
        });
    }

    public async removeLibraryEntry(
        userId: string,
        storyId: string,
    ): Promise<void> {
        await prisma.libraryEntry.deleteMany({
            where: {
                userId,
                storyId,
            },
        });
    }

    public async hasLibraryEntry(
        userId: string,
        storyId: string,
    ): Promise<boolean> {
        const entry = await prisma.libraryEntry.findUnique({
            where: {
                userId_storyId: {
                    userId,
                    storyId,
                },
            },
            select: {
                storyId: true,
            },
        });

        return entry !== null;
    }

    public async listLibrary(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const visibleStoryWhere = await buildVisibleStoryWhere(userId);
        const rows = await prisma.libraryEntry.findMany({
            where: {
                userId,
                story: visibleStoryWhere,
            },
            orderBy: [{ addedAt: "desc" }, { storyId: "desc" }],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: {
                          userId_storyId: {
                              userId,
                              storyId: cursor,
                          },
                      },
                      skip: 1,
                  }
                : {}),
            select: {
                addedAt: true,
                storyId: true,
                story: {
                    select: storySummarySelect,
                },
            },
        });

        const page = buildCursorPage(rows, limit, (row) => row.storyId);

        return {
            entries: page.items.map((row) => ({
                addedAt: row.addedAt,
                story: row.story,
            })),
            pagination: page.pagination,
        };
    }
}
