import sharp from "sharp";

import env from "../../config/env.js";
import AppError from "../../errors/app-error.js";
import {
    assertDecodedImageWithinLimits,
    IMAGE_LIMITS,
} from "./image-limits.js";

sharp.cache({ memory: 32, files: 0, items: 32 });
sharp.concurrency(2);

export interface SanitizedImage {
    bytes: Buffer;
    mimeType: "image/jpeg";
    extension: "jpg";
    width: number;
    height: number;
}

export async function decodeAndSanitizeImage(input: Buffer): Promise<SanitizedImage> {
    if (input.length === 0) throw AppError.badRequest("Image is empty.", "EMPTY_UPLOAD");
    if (input.length > env.mediaMaxBytes) {
        throw AppError.tooLarge("Uploaded image is too large.", "UPLOAD_TOO_LARGE");
    }

    const pipeline = sharp(input, {
        failOn: "warning",
        limitInputPixels: Math.min(env.mediaMaxPixels, IMAGE_LIMITS.maximumPixels),
        sequentialRead: true,
        animated: false,
    });
    let metadata;
    try {
        metadata = await pipeline.metadata();
    } catch (_error) {
        throw AppError.badRequest(
            "The image could not be decoded safely.",
            "INVALID_IMAGE",
        );
    }

    assertDecodedImageWithinLimits({
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        pages: metadata.pages ?? 1,
        format: metadata.format ?? "",
        encodedBytes: input.length,
    });

    const output = await pipeline
        .rotate()
        .jpeg({ quality: 86, mozjpeg: true, progressive: true })
        .toBuffer({ resolveWithObject: true });

    assertDecodedImageWithinLimits({
        width: output.info.width,
        height: output.info.height,
        pages: 1,
        format: "jpeg",
        encodedBytes: output.data.length,
    });

    return {
        bytes: output.data,
        mimeType: "image/jpeg",
        extension: "jpg",
        width: output.info.width,
        height: output.info.height,
    };
}
