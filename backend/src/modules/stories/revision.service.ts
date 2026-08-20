import { prisma } from "../../db/index.js";
import AppError from "../../errors/app-error.js";
import { countWords } from "./stories.policy.js";
import { chapterContentHash } from "./stories.policy.js";

const REVISION_RETENTION = 100;

export class RevisionService {
    public async list(
        authorId: string,
        storyId: string,
        chapterId: string,
        beforeRevision: number | undefined,
        limit: number,
    ) {
        const chapter = await prisma.chapter.findFirst({
            where: { id: chapterId, storyId, deletedAt: null, story: { authorId, deletedAt: null } },
            select: { id: true },
        });
        if (!chapter) throw AppError.notFound("The chapter was not found.", "CHAPTER_NOT_FOUND");

        const rows = await prisma.chapterRevision.findMany({
            where: {
                chapterId,
                ...(beforeRevision ? { revisionNumber: { lt: beforeRevision } } : {}),
            },
            orderBy: { revisionNumber: "desc" },
            take: limit + 1,
            select: {
                id: true,
                revisionNumber: true,
                sourceVersion: true,
                title: true,
                wordCount: true,
                reason: true,
                protected: true,
                restoredFromId: true,
                createdAt: true,
            },
        });
        const hasMore = rows.length > limit;
        const items = rows.slice(0, limit);
        return {
            items,
            pagination: {
                hasMore,
                nextCursor: hasMore ? String(items.at(-1)?.revisionNumber ?? "") : null,
            },
        };
    }

    public async restore(
        authorId: string,
        storyId: string,
        chapterId: string,
        revisionId: string,
        expectedVersion: number,
    ) {
        return prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`
                SELECT pg_advisory_xact_lock(hashtextextended(${chapterId}, 1))
            `;
            const current = await transaction.chapter.findFirst({
                where: { id: chapterId, storyId, deletedAt: null, story: { authorId, deletedAt: null } },
                select: { id: true, version: true, title: true, content: true, contentHash: true, wordCount: true },
            });
            if (!current) throw AppError.notFound("The chapter was not found.", "CHAPTER_NOT_FOUND");
            if (current.version !== expectedVersion) {
                throw AppError.conflict(
                    "This chapter was updated by another editor session.",
                    "VERSION_CONFLICT",
                    { currentVersion: current.version },
                );
            }
            const selected = await transaction.chapterRevision.findFirst({
                where: { id: revisionId, chapterId },
                select: { id: true, title: true, content: true, contentHash: true, wordCount: true },
            });
            if (!selected) throw AppError.notFound("The revision was not found.", "REVISION_NOT_FOUND");

            const aggregate = await transaction.chapterRevision.aggregate({
                where: { chapterId },
                _max: { revisionNumber: true },
            });
            let revisionNumber = (aggregate._max.revisionNumber ?? 0) + 1;
            await transaction.chapterRevision.create({
                data: {
                    chapterId,
                    createdBy: authorId,
                    revisionNumber,
                    sourceVersion: current.version,
                    title: current.title,
                    content: current.content,
                    contentHash: current.contentHash || chapterContentHash(current.title, current.content),
                    wordCount: current.wordCount,
                    reason: "RESTORE_SOURCE",
                    protected: true,
                    restoredFromId: selected.id,
                },
            });

            const chapter = await transaction.chapter.update({
                where: { id: chapterId },
                data: {
                    title: selected.title,
                    content: selected.content,
                    contentHash: selected.contentHash,
                    wordCount: countWords(selected.content),
                    version: { increment: 1 },
                },
                select: { id: true, title: true, content: true, wordCount: true, version: true, updatedAt: true },
            });
            revisionNumber += 1;
            await transaction.chapterRevision.create({
                data: {
                    chapterId,
                    createdBy: authorId,
                    revisionNumber,
                    sourceVersion: chapter.version,
                    title: chapter.title,
                    content: chapter.content,
                    contentHash: selected.contentHash,
                    wordCount: chapter.wordCount,
                    reason: "RESTORED",
                    protected: true,
                    restoredFromId: selected.id,
                },
            });

            const removable = await transaction.chapterRevision.findMany({
                where: { chapterId, protected: false },
                orderBy: { revisionNumber: "desc" },
                skip: REVISION_RETENTION,
                select: { id: true },
            });
            if (removable.length > 0) {
                await transaction.chapterRevision.deleteMany({
                    where: { id: { in: removable.map(({ id }) => id) } },
                });
            }
            return chapter;
        });
    }
}
