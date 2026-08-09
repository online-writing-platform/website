import AppError from "../../../errors/app-error.js";

export interface ImageInfo {
    mimeType: "image/jpeg" | "image/png";
    extension: "jpg" | "png";
    width: number;
    height: number;
}

function pngInfo(bytes: Buffer): ImageInfo | null {
    const signature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
        return null;
    }

    return {
        mimeType: "image/png",
        extension: "png",
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
    };
}

function jpegInfo(bytes: Buffer): ImageInfo | null {
    if (
        bytes.length < 4 ||
        bytes[0] !== 0xff ||
        bytes[1] !== 0xd8
    ) {
        return null;
    }

    let offset = 2;
    while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            offset += 1;
            continue;
        }

        const marker = bytes[offset + 1];
        offset += 2;

        if (marker === undefined) return null;
        if (marker === 0xd8 || marker === 0xd9) continue;
        if (offset + 2 > bytes.length) return null;

        const segmentLength = bytes.readUInt16BE(offset);
        if (segmentLength < 2 || offset + segmentLength > bytes.length) {
            return null;
        }

        const isStartOfFrame = [
            0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
            0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
        ].includes(marker);

        if (isStartOfFrame && segmentLength >= 7) {
            return {
                mimeType: "image/jpeg",
                extension: "jpg",
                height: bytes.readUInt16BE(offset + 3),
                width: bytes.readUInt16BE(offset + 5),
            };
        }

        offset += segmentLength;
    }

    return null;
}

export function inspectImage(bytes: Buffer): ImageInfo {
    const info = pngInfo(bytes) ?? jpegInfo(bytes);

    if (!info) {
        throw AppError.badRequest(
            "Only genuine JPEG and PNG images are accepted.",
            "UNSUPPORTED_IMAGE",
        );
    }

    if (
        info.width < 200 ||
        info.height < 200 ||
        info.width > 8000 ||
        info.height > 8000
    ) {
        throw AppError.badRequest(
            "Image dimensions must be between 200 and 8000 pixels.",
            "INVALID_IMAGE_DIMENSIONS",
        );
    }

    return info;
}
