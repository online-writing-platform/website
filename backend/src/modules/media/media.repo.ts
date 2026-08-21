import { prisma } from "../../db/index.js";

import type { MediaStore } from "./media.types.js";

export class MediaRepository implements MediaStore {
  public findOwnedStory(ownerId: string, storyId: string) {
    return prisma.story.findFirst({
      where: {
        id: storyId,

        authorId: ownerId,

        deletedAt: null,
      },

      select: {
        id: true,

        coverAssetId: true,
      },
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
        where: {
          id: input.storyId,
        },

        data: {
          coverAssetId: input.assetId,

          coverUrl: input.publicUrl,
        },
      });

      if (story.coverAsset) {
        await transaction.mediaAsset.updateMany({
          where: {
            id: story.coverAsset.id,

            deletedAt: null,
          },

          data: {
            deletedAt: new Date(),
          },
        });
      }

      return {
        publicUrl: input.publicUrl,

        previousAsset: story.coverAsset,
      };
    });
  }

  public async attachProfileImage(input: {
    assetId: string;
    ownerId: string;
    provider: "LOCAL" | "S3";
    objectKey: string;
    publicUrl: string;
    mimeType: string;
    byteSize: number;
    width: number;
    height: number;
  }) {
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: {
          id: input.ownerId,

          status: "ACTIVE",
        },

        select: {
          avatarUrl: true,
        },
      });

      if (!user) {
        return null;
      }

      const previousAsset = user.avatarUrl
        ? await transaction.mediaAsset.findFirst({
            where: {
              ownerId: input.ownerId,

              publicUrl: user.avatarUrl,

              objectKey: {
                startsWith: "avatars/",
              },

              deletedAt: null,
            },

            select: {
              id: true,

              provider: true,

              objectKey: true,
            },
          })
        : null;

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

      await transaction.user.update({
        where: {
          id: input.ownerId,
        },

        data: {
          avatarUrl: input.publicUrl,
        },
      });

      if (previousAsset) {
        await transaction.mediaAsset.updateMany({
          where: {
            id: previousAsset.id,

            deletedAt: null,
          },

          data: {
            deletedAt: new Date(),
          },
        });
      }

      return {
        publicUrl: input.publicUrl,

        previousAsset,
      };
    });
  }

  public async findPublicAsset(assetId: string) {
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        id: assetId,

        deletedAt: null,
      },

      select: {
        provider: true,

        objectKey: true,

        publicUrl: true,

        mimeType: true,

        owner: {
          select: {
            status: true,

            avatarUrl: true,
          },
        },

        coveredStories: {
          where: {
            deletedAt: null,

            moderationState: "VISIBLE",

            visibility: {
              in: ["PUBLIC", "UNLISTED"],
            },

            publishedAt: {
              not: null,
            },

            author: {
              status: "ACTIVE",
            },
          },

          select: {
            id: true,
          },

          take: 1,
        },
      },
    });

    if (!asset) {
      return null;
    }

    const isPublishedCover = asset.coveredStories.length > 0;

    const isCurrentProfileImage =
      asset.objectKey.startsWith("avatars/") &&
      asset.owner.status === "ACTIVE" &&
      asset.owner.avatarUrl === asset.publicUrl;

    if (!isPublishedCover && !isCurrentProfileImage) {
      return null;
    }

    return {
      provider: asset.provider,

      objectKey: asset.objectKey,

      mimeType: asset.mimeType,
    };
  }

  public findOwnedAsset(ownerId: string, assetId: string) {
    return prisma.mediaAsset.findFirst({
      where: {
        id: assetId,

        ownerId,

        deletedAt: null,
      },

      select: {
        provider: true,

        objectKey: true,

        mimeType: true,
      },
    });
  }
}
