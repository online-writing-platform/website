import { prisma } from "../../../db/index.js";

import type { MediaStore } from "../application/media.ports.js";

export class PrismaMediaStore implements MediaStore {
    public findOwnedStory(ownerId: string, storyId: string) {
        return prisma.story.findFirst({
            where: { id: storyId, authorId: ownerId, deletedAt: null },
            select: { id: true, coverAssetId: true },
        });
    }

    public async attachStoryCover(input: {
        assetId: string;
        ownerId: string;
        storyId: string;
        provider: "LOCAL" | "S3";
        objectKey: string;
        publicUrl: string;
        mimeType: string;
        byteSize: number;
        width: number;
        height: number;
    }) {
        return prisma.$transaction(async (transaction) => {
            const story = await transaction.story.findFirst({
                where: {
                    id: input.storyId,
                    authorId: input.ownerId,
                    deletedAt: null,
                },
                select: {
                    coverAsset: {
                        select: {
                            id: true,
                            provider: true,
                            objectKey: true,
                        },
                    },
                },
            });

            if (!story) {
                throw new Error("Story ownership changed during media upload.");
            }

            await transaction.mediaAsset.create({
                data: {
                    id: input.assetId,
                    ownerId: input.ownerId,
                    provider: input.provider,
                    objectKey: input.objectKey,
                    publicUrl: input.publicUrl,
                    mimeType: input.mimeType,
                    byteSize: input.byteSize,
                    width: input.width,
                    height: input.height,
                },
            });

            await transaction.story.update({
                where: { id: input.storyId },
                data: {
                    coverAssetId: input.assetId,
                    coverUrl: input.publicUrl,
                },
            });

            if (story.coverAsset) {
                await transaction.mediaAsset.updateMany({
                    where: { id: story.coverAsset.id, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
            }

            return {
                publicUrl: input.publicUrl,
                previousAsset: story.coverAsset,
            };
        });
    }

    public findPublicAsset(assetId: string) {
        return prisma.mediaAsset.findFirst({
            where: {
                id: assetId,
                deletedAt: null,
                coveredStories: {
                    some: {
                        deletedAt: null,
                        moderationState: "VISIBLE",
                        visibility: { in: ["PUBLIC", "UNLISTED"] },
                        publishedAt: { not: null },
                        author: { status: "ACTIVE" },
                    },
                },
            },
            select: {
                provider: true,
                objectKey: true,
                mimeType: true,
            },
        });
    }
}
