import assert from "node:assert/strict";
import test from "node:test";

import AppError from "../../../errors/app-error.js";
import { inspectImage } from "./image.js";

function minimalPng(width: number, height: number): Buffer {
    const bytes = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(
        bytes,
        0,
    );
    bytes.writeUInt32BE(width, 16);
    bytes.writeUInt32BE(height, 20);
    return bytes;
}

void test("image validation reads dimensions from PNG bytes instead of trusting MIME metadata", () => {
    const info = inspectImage(minimalPng(800, 1200));

    assert.deepEqual(info, {
        mimeType: "image/png",
        extension: "png",
        width: 800,
        height: 1200,
    });
});

void test("image validation rejects spoofed or unsupported bytes", () => {
    assert.throws(
        () => inspectImage(Buffer.from("not-an-image")),
        (error: unknown) => {
            if (!(error instanceof AppError)) return false;
            assert.equal(error.code, "UNSUPPORTED_IMAGE");
            return true;
        },
    );
});
