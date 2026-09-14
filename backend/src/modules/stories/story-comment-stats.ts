import type { Prisma } from "../../generated/prisma/client.js";

/**
 * Keeps the cached public comment count aligned with the comments that can
 * actually contribute to discovery and search results.
 */
export async function reconcileStoryCommentCount(
    transaction: Prisma.TransactionClient,
    storyId: string,
): Promise<void> {
    await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${storyId}, 5))
    `;

    const commentCount = await transaction.comment.count({
        where: {
            status: "ACTIVE",
            OR: [
                { parentId: null },
                { parent: { status: { not: "HIDDEN" } } },
            ],
            chapter: {
                storyId,
                deletedAt: null,
                status: "PUBLISHED",
                moderationState: "VISIBLE",
            },
        },
    });

    await transaction.storyStats.upsert({
        where: { storyId },
        create: { storyId, commentCount },
        update: { commentCount },
    });
}
