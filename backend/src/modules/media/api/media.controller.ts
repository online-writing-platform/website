import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";

import { mediaModule } from "../media.module.js";

import type { MediaAssetParams, StoryCoverParams } from "./media.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

export async function uploadStoryCover(
    request: Request<StoryCoverParams>,

    response: Response,
): Promise<void> {
    if (!request.file) {
        throw AppError.badRequest(
            "A cover image is required.",
            "IMAGE_REQUIRED",
        );
    }

    const media = await mediaModule.service.uploadStoryCover(
        requireUserId(request),

        request.params.storyId,

        request.file.buffer,
    );

    response.status(201).json({
        data: {
            media,
        },
    });
}

export async function getPublicMedia(
    request: Request<MediaAssetParams>,

    response: Response,
): Promise<void> {
    const asset = await mediaModule.service.readPublicAsset(
        request.params.assetId,
    );

    response.setHeader("Content-Type", asset.mimeType);

    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    response.setHeader("X-Content-Type-Options", "nosniff");

    response.status(200).send(asset.bytes);
}

export async function getOwnedMedia(
    request: Request<MediaAssetParams>,

    response: Response,
): Promise<void> {
    const asset = await mediaModule.service.readOwnedAsset(
        requireUserId(request),

        request.params.assetId,
    );

    response.setHeader("Content-Type", asset.mimeType);

    response.setHeader("Cache-Control", "private, no-store");

    response.setHeader("X-Content-Type-Options", "nosniff");

    response.status(200).send(asset.bytes);
}
