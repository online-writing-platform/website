import { Router } from "express";

import multer from "multer";

import env from "../../../config/env.js";

import { uploadRateLimiter } from "../../../middlewares/rate-limit.middleware.js";

import { validateParams } from "../../../middlewares/validate.middleware.js";

import { authenticate, requireVerifiedEmail } from "../../auth/index.js";

import {
    getOwnedMedia,
    getPublicMedia,
    uploadStoryCover,
} from "./media.controller.js";

import {
    mediaAssetParamsSchema,
    storyCoverParamsSchema,
} from "./media.schema.js";

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
