import env from "../../config/env.js";
import logger from "../../config/logger.js";
import AppError from "../../errors/app-error.js";
import { decodeAndSanitizeImage } from "./image-processor.js";
import { LocalMediaProvider } from "./local-media.provider.js";
import { MediaRepository } from "./media.repo.js";
import { type MediaStorageProvider, type MediaStore } from "./media.types.js";
import { S3MediaProvider } from "./s3-media.provider.js";
import { randomUUID } from "node:crypto";

export class MediaService {
  public constructor(
    private readonly store: MediaStore,

    private readonly provider: MediaStorageProvider,
  ) {}

  public async uploadStoryCover(
    ownerId: string,
    storyId: string,
    bytes: Buffer,
  ) {
    if (bytes.length === 0) {
      throw AppError.badRequest("Image is empty.", "EMPTY_UPLOAD");
    }

    const story = await this.store.findOwnedStory(ownerId, storyId);

    if (!story) {
      throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
    }

    const image = await decodeAndSanitizeImage(bytes);

    const assetId = randomUUID();

    const stored = await this.provider.put({
      assetId,

      bytes: image.bytes,

      mimeType: image.mimeType,

      extension: image.extension,

      folder: "covers",
    });

    try {
      const result = await this.store.attachStoryCover({
        assetId,

        ownerId,

        storyId,

        provider: this.provider.provider,

        objectKey: stored.objectKey,

        publicUrl: stored.publicUrl,

        mimeType: image.mimeType,

        byteSize: image.bytes.length,

        width: image.width,

        height: image.height,
      });

      if (
        result.previousAsset &&
        result.previousAsset.provider === this.provider.provider
      ) {
        void this.provider
          .delete(result.previousAsset.objectKey)
          .catch((error: unknown) => {
            logger.warn(
              {
                err: error,

                assetId: result.previousAsset?.id,
              },

              "Old cover cleanup failed",
            );
          });
      }

      return {
        assetId,

        url: stored.ownerUrl,

        width: image.width,

        height: image.height,
      };
    } catch (error) {
      await this.provider.delete(stored.objectKey).catch(() => undefined);

      throw error;
    }
  }

  public async uploadProfileImage(ownerId: string, bytes: Buffer) {
    if (bytes.length === 0) {
      throw AppError.badRequest("Image is empty.", "EMPTY_UPLOAD");
    }

    const image = await decodeAndSanitizeImage(bytes);

    const assetId = randomUUID();

    const stored = await this.provider.put({
      assetId,

      bytes: image.bytes,

      mimeType: image.mimeType,

      extension: image.extension,

      folder: "avatars",
    });

    try {
      const result = await this.store.attachProfileImage({
        assetId,

        ownerId,

        provider: this.provider.provider,

        objectKey: stored.objectKey,

        publicUrl: stored.publicUrl,

        mimeType: image.mimeType,

        byteSize: image.bytes.length,

        width: image.width,

        height: image.height,
      });

      if (!result) {
        throw AppError.notFound(
          "The user account was not found.",
          "USER_NOT_FOUND",
        );
      }

      if (
        result.previousAsset &&
        result.previousAsset.provider === this.provider.provider
      ) {
        void this.provider
          .delete(result.previousAsset.objectKey)
          .catch((error: unknown) => {
            logger.warn(
              {
                err: error,

                assetId: result.previousAsset?.id,
              },

              "Old profile image cleanup failed",
            );
          });
      }

      return {
        assetId,

        url: result.publicUrl,

        width: image.width,

        height: image.height,
      };
    } catch (error) {
      await this.provider.delete(stored.objectKey).catch(() => undefined);

      throw error;
    }
  }

  public async readPublicAsset(assetId: string) {
    const asset = await this.store.findPublicAsset(assetId);

    return this.readAsset(asset);
  }

  public async readOwnedAsset(ownerId: string, assetId: string) {
    const asset = await this.store.findOwnedAsset(ownerId, assetId);

    return this.readAsset(asset);
  }

  private async readAsset(
    asset: {
      provider: "LOCAL" | "S3";

      objectKey: string;

      mimeType: string;
    } | null,
  ) {
    if (
      !asset ||
      asset.provider !== this.provider.provider ||
      !this.provider.read
    ) {
      throw AppError.notFound(
        "The media asset was not found.",
        "MEDIA_NOT_FOUND",
      );
    }

    const bytes = await this.provider.read(asset.objectKey);

    if (!bytes) {
      throw AppError.notFound(
        "The media asset was not found.",
        "MEDIA_NOT_FOUND",
      );
    }

    return {
      bytes,

      mimeType: asset.mimeType,
    };
  }
}

const store = new MediaRepository();

const provider =
  env.mediaProvider === "s3"
    ? new S3MediaProvider({
        bucket: env.s3Bucket,
        region: env.s3Region,
        publicApiUrl: env.publicApiUrl,
        ...(env.s3Endpoint ? { endpoint: env.s3Endpoint } : {}),
        ...(env.s3AccessKeyId ? { accessKeyId: env.s3AccessKeyId } : {}),
        ...(env.s3SecretAccessKey
          ? { secretAccessKey: env.s3SecretAccessKey }
          : {}),
      })
    : new LocalMediaProvider(env.mediaLocalRoot, env.publicApiUrl);

export const mediaServices = {
  service: new MediaService(store, provider),
};
