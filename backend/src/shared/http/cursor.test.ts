import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { createCursorCodec } from "./cursor.js";

void test("cursor authenticates the full ordering tuple and rejects tampering", () => {
    const codec = createCursorCodec("a-secure-test-secret-that-is-long-enough");
    const schema = z.object({ at: z.string().datetime(), id: z.string().uuid() });
    const cursor = codec.encode({ at: "2026-08-13T00:00:00.000Z", id: "8b5ae79f-5870-4e23-af77-672095412618" });
    assert.deepEqual(codec.decode(cursor, schema), {
        at: "2026-08-13T00:00:00.000Z",
        id: "8b5ae79f-5870-4e23-af77-672095412618",
    });
    assert.throws(() => codec.decode(`${cursor}x`, schema));
});
