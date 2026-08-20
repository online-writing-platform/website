import { prisma } from "../../db/index.js";
import { isAtLeastAge } from "./stories.policy.js";
async function viewerCanReadMatureContent(
    viewerId: string | undefined,
): Promise<boolean> {
    if (!viewerId) return false;

    const viewer = await prisma.user.findUnique({
        where: { id: viewerId },
        select: {
            birthDate: true,
            status: true,
            preferences: {
                select: { allowMatureContent: true },
            },
        },
    });

    if (
        !viewer ||
        viewer.status !== "ACTIVE" ||
        viewer.preferences?.allowMatureContent !== true
    ) {
        return false;
    }

    return isAtLeastAge(viewer.birthDate, 18, new Date());
}

export class StoryAccessRepository {
    public async findReadableStoryById(storyId: string, viewerId?: string) {
        const canReadMature = await viewerCanReadMatureContent(viewerId);

        return prisma.story.findFirst({
            where: {
                id: storyId,
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: { in: ["PUBLIC", "UNLISTED"] },
                publishedAt: { not: null },
                status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                author: {
                    status: "ACTIVE",
                    ...(viewerId
                        ? {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          }
                        : {}),
                },
                ...(canReadMature ? {} : { isMature: false }),
            },
            select: {
                id: true,
                slug: true,
                authorId: true,
                title: true,
            },
        });
    }

    public async findReadableChapterById(chapterId: string, viewerId?: string) {
        const canReadMature = await viewerCanReadMatureContent(viewerId);

        const row = await prisma.chapter.findFirst({
            where: {
                id: chapterId,
                deletedAt: null,
                moderationState: "VISIBLE",
                status: "PUBLISHED",
                publishedAt: { not: null },
                story: {
                    deletedAt: null,
                    moderationState: "VISIBLE",
                    visibility: { in: ["PUBLIC", "UNLISTED"] },
                    publishedAt: { not: null },
                    status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                    author: {
                        status: "ACTIVE",
                        ...(viewerId
                            ? {
                                  blocksCreated: {
                                      none: { blockedId: viewerId },
                                  },
                                  blocksReceived: {
                                      none: { blockerId: viewerId },
                                  },
                              }
                            : {}),
                    },
                    ...(canReadMature ? {} : { isMature: false }),
                },
            },
            select: {
                id: true,
                storyId: true,
                title: true,
                story: {
                    select: {
                        slug: true,
                        title: true,
                        authorId: true,
                    },
                },
            },
        });

        return row
            ? {
                  id: row.id,
                  storyId: row.storyId,
                  storySlug: row.story.slug,
                  storyTitle: row.story.title,
                  authorId: row.story.authorId,
                  title: row.title,
              }
            : null;
    }
}
