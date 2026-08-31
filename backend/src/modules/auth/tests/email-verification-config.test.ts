import assert from "node:assert/strict";
import test from "node:test";

void test("email verification codes expire after the configured number of minutes", async () => {
    process.env.EMAIL_VERIFICATION_TTL_MINUTES = "10";

    const { default: env } = await import("../../../config/env.js");

    assert.equal(
        (env as unknown as Record<string, unknown>)
            .emailVerificationTtlMinutes,
        10,
    );
});
