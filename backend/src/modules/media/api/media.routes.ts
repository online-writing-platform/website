import { Router } from "express";
import multer from "multer";

import env from "../../../config/env.js";
import { contentWriteRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { validateParams } from "../../../middlewares/validate.middleware.js";
import {
    authenticate,
    requireVerifiedEmail,
} from "../../auth/index.js";
import {
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

router.post(
    "/story-covers/:storyId",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyCoverParamsSchema),
    upload.single("file"),
    uploadStoryCover,
);

export default router;
