import assert from "node:assert/strict";
import test from "node:test";

import { assertDecodedImageWithinLimits } from "./image-limits.js";

void test("decoded image policy rejects bombs, extra frames, and unsupported formats", () => {
    assert.throws(() =>
        assertDecodedImageWithinLimits({
            width: 50_000,
            height: 50_000,
            pages: 1,
            format: "png",
            encodedBytes: 1_000,
        }),
    );
    assert.throws(() =>
        assertDecodedImageWithinLimits({
            width: 1_000,
            height: 1_000,
            pages: 2,
            format: "png",
            encodedBytes: 1_000,
        }),
    );
    assert.throws(() =>
        assertDecodedImageWithinLimits({
            width: 1_000,
            height: 1_000,
            pages: 1,
            format: "gif",
            encodedBytes: 1_000,
        }),
    );
});

void test("decoded image policy accepts a bounded JPEG", () => {
    assert.doesNotThrow(() =>
        assertDecodedImageWithinLimits({
            width: 1_600,
            height: 2_400,
            pages: 1,
            format: "jpeg",
            encodedBytes: 1_000_000,
        }),
    );
});
