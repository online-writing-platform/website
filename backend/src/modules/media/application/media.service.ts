import { randomUUID } from "node:crypto";

import AppError from "../../../errors/app-error.js";
import logger from "../../../config/logger.js";
import { inspectImage } from "../domain/image.js";

import type {
    MediaStorageProvider,
    MediaStore,
} from "./media.ports.js";

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
            throw AppError.notFound(
                "The story was not found.",
                "STORY_NOT_FOUND",
            );
        }

        const image = inspectImage(bytes);
        const assetId = randomUUID();

        const stored = await this.provider.put({
            assetId,
            bytes,
            mimeType: image.mimeType,
            extension: image.extension,
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
                byteSize: bytes.length,
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

        return { bytes, mimeType: asset.mimeType };
    }
}
