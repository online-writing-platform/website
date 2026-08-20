import AppError from "../../errors/app-error.js";

export const IMAGE_LIMITS = Object.freeze({
    maximumEncodedBytes: 5_000_000,
    minimumDimension: 200,
    maximumDimension: 8_000,
    maximumPixels: 40_000_000,
    maximumPages: 1,
    allowedFormats: new Set(["jpeg", "png"]),
});

export interface DecodedImageMetadata {
    width: number;
    height: number;
    pages: number;
    format: string;
    encodedBytes: number;
}

export function assertDecodedImageWithinLimits(
    metadata: DecodedImageMetadata,
): void {
    const dimensionsValid =
        Number.isInteger(metadata.width) &&
        Number.isInteger(metadata.height) &&
        metadata.width >= IMAGE_LIMITS.minimumDimension &&
        metadata.height >= IMAGE_LIMITS.minimumDimension &&
        metadata.width <= IMAGE_LIMITS.maximumDimension &&
        metadata.height <= IMAGE_LIMITS.maximumDimension;
    const pixels = metadata.width * metadata.height;

    if (
        metadata.encodedBytes < 1 ||
        metadata.encodedBytes > IMAGE_LIMITS.maximumEncodedBytes ||
        !dimensionsValid ||
        !Number.isSafeInteger(pixels) ||
        pixels > IMAGE_LIMITS.maximumPixels ||
        metadata.pages !== IMAGE_LIMITS.maximumPages ||
        !IMAGE_LIMITS.allowedFormats.has(metadata.format)
    ) {
        throw AppError.badRequest(
            "The decoded image exceeds the accepted format or resource limits.",
            "IMAGE_LIMIT_EXCEEDED",
        );
    }
}
