import assert from "node:assert/strict";
import test from "node:test";

import { nextRetryAt } from "./retry.js";

void test("retry delay grows exponentially and is capped", () => {
    const now = new Date("2026-08-13T00:00:00.000Z");
    assert.equal(nextRetryAt(now, 1, 1_000, 60_000).getTime(), now.getTime() + 1_000);
    assert.equal(nextRetryAt(now, 4, 1_000, 60_000).getTime(), now.getTime() + 8_000);
    assert.equal(nextRetryAt(now, 20, 1_000, 60_000).getTime(), now.getTime() + 60_000);
});
