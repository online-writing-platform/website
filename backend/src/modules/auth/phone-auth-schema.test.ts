import assert from "node:assert/strict";
import test from "node:test";

import { requestPhoneOtpSchema } from "./auth.schema.js";

void test("accepts a normal Iranian mobile number", () => {
    const result = requestPhoneOtpSchema.parse({
        phoneNumber: "09123456789",
    });

    assert.equal(result.phoneNumber, "09123456789");
});

void test("normalizes +98 phone format", () => {
    const result = requestPhoneOtpSchema.parse({
        phoneNumber: "+989123456789",
    });

    assert.equal(result.phoneNumber, "09123456789");
});

void test("rejects Iranian landlines", () => {
    const result = requestPhoneOtpSchema.safeParse({
        phoneNumber: "02188776655",
    });

    assert.equal(result.success, false);
});

void test("rejects foreign phone numbers", () => {
    const result = requestPhoneOtpSchema.safeParse({
        phoneNumber: "+33612345678",
    });

    assert.equal(result.success, false);
});

void test("rejects unknown fields", () => {
    const result = requestPhoneOtpSchema.safeParse({
        phoneNumber: "09123456789",
        admin: true,
    });

    assert.equal(result.success, false);
});