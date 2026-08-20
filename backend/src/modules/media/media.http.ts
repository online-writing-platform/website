import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { mediaServices } from "./media.service.js";
import type { MediaAssetParams, StoryCoverParams } from "./media.schema.js";
import { Router } from "express";
import multer from "multer";
import env from "../../config/env.js";
import { uploadRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validateParams } from "../../middlewares/validate.middleware.js";
import { authenticate, requireVerifiedEmail } from "../auth/auth.middleware.js";
import {
    mediaAssetParamsSchema,
    storyCoverParamsSchema,
} from "./media.schema.js";

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

    const media = await mediaServices.service.uploadStoryCover(
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
    const asset = await mediaServices.service.readPublicAsset(
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
    const asset = await mediaServices.service.readOwnedAsset(
        requireUserId(request),

        request.params.assetId,
    );

    response.setHeader("Content-Type", asset.mimeType);

    response.setHeader("Cache-Control", "private, no-store");

    response.setHeader("X-Content-Type-Options", "nosniff");

    response.status(200).send(asset.bytes);
}

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: env.mediaMaxBytes,

        files: 1,

        fields: 0,
    },
});

router.get(
    "/public/:assetId",

    validateParams(mediaAssetParamsSchema),

    getPublicMedia,
);

router.get(
    "/owned/:assetId",

    authenticate,

    validateParams(mediaAssetParamsSchema),

    getOwnedMedia,
);

router.post(
    "/story-covers/:storyId",

    uploadRateLimiter,

    authenticate,

    requireVerifiedEmail,

    validateParams(storyCoverParamsSchema),

    upload.single("file"),

    uploadStoryCover,
);

export default router;
