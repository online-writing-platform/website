import assert from "node:assert/strict";
import test from "node:test";

import { DefaultAuthSecurity } from "../auth.security.js";

void test("email verification codes are six digits and hashes are scoped to the email", () => {
    const security = new DefaultAuthSecurity() as DefaultAuthSecurity & {
        generateVerificationCode(): string;
        hashVerificationCode(email: string, code: string): string;
    };

    assert.equal(typeof security.generateVerificationCode, "function");
    assert.equal(typeof security.hashVerificationCode, "function");

    const code = security.generateVerificationCode();
    assert.match(code, /^\d{6}$/u);
    assert.notEqual(
        security.hashVerificationCode("first@example.com", code),
        security.hashVerificationCode("second@example.com", code),
    );
});

void test("phone OTP hashes are scoped to the phone number", () => {
    const security = new DefaultAuthSecurity();

    const code = "123456";

    const firstHash = security.hashPhoneOtpCode(
        "09123456789",
        code,
    );

    const secondHash = security.hashPhoneOtpCode(
        "09901234567",
        code,
    );

    assert.notEqual(firstHash, secondHash);
});
