import assert from "node:assert/strict";
import test from "node:test";

import * as authSchemas from "./auth.schema.js";

void test("email verification accepts only a normalized email and six-digit code", () => {
    assert.equal(
        authSchemas.verifyEmailSchema.safeParse({
            email: "Writer@Example.com",
            code: "123456",
        }).success,
        true,
    );
    assert.equal(
        authSchemas.verifyEmailSchema.safeParse({
            email: "writer@example.com",
            code: "12345",
        }).success,
        false,
    );
    assert.equal(
        authSchemas.verifyEmailSchema.safeParse({ token: "a".repeat(64) })
            .success,
        false,
    );
});

void test("verification resend requires an email rather than an authenticated session", () => {
    const resendSchema = (
        authSchemas as unknown as Record<string, unknown>
    ).resendVerificationEmailSchema;

    assert.equal(typeof resendSchema, "object");

    const schema = resendSchema as {
        safeParse(input: unknown): { success: boolean };
    };
    assert.equal(
        schema.safeParse({ email: "Writer@Example.com" }).success,
        true,
    );
    assert.equal(schema.safeParse({}).success, false);
});
