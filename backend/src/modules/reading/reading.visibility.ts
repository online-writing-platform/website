import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/index.js";
import { isAtLeastAge } from "../stories/stories.policy.js";

export const storySummarySelect = {
    id: true,
    slug: true,
    title: true,
    coverUrl: true,
    status: true,
    isMature: true,
    author: {
        select: {
            username: true,
            displayName: true,
        },
    },
} satisfies Prisma.StorySelect;

export async function buildVisibleStoryWhere(
    viewerId: string | undefined,
    visibility: Prisma.StoryWhereInput["visibility"] = {
        in: ["PUBLIC", "UNLISTED"],
    },
): Promise<Prisma.StoryWhereInput> {
    if (!viewerId) {
        return {
            deletedAt: null,
            moderationState: "VISIBLE",
            visibility,
            publishedAt: { not: null },
            status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
            isMature: false,
            author: { status: "ACTIVE" },
        };
    }

    const [viewer, blocks] = await Promise.all([
        prisma.user.findUnique({
            where: { id: viewerId },
            select: {
                birthDate: true,
                preferences: {
                    select: { allowMatureContent: true },
                },
            },
        }),
        prisma.block.findMany({
            where: {
                OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
            },
            select: { blockerId: true, blockedId: true },
        }),
    ]);

    const includeMature =
        viewer !== null &&
        viewer.preferences?.allowMatureContent === true &&
        isAtLeastAge(viewer.birthDate, 18, new Date());
    const blockedIds = blocks.map((block) =>
        block.blockerId === viewerId ? block.blockedId : block.blockerId,
    );

    return {
        deletedAt: null,
        moderationState: "VISIBLE",
        visibility,
        publishedAt: { not: null },
        status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
        ...(includeMature ? {} : { isMature: false }),
        ...(blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {}),
        author: { status: "ACTIVE" },
    };
}

