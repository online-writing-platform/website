import assert from "node:assert/strict";
import test from "node:test";

import * as authEmail from "../auth.email.js";

void test("verification email presents the six-digit code without a token link", () => {
    const builder = (
        authEmail as unknown as Record<string, unknown>
    ).buildVerificationCodeEmail;

    assert.equal(typeof builder, "function");

    const build = builder as (code: string) => {
        subject: string;
        text: string;
        html: string;
    };
    const message = build("123456");

    assert.match(message.text, /123456/u);
    assert.match(message.html, /123456/u);
    assert.doesNotMatch(message.text, /verify-email\?token=/u);
    assert.doesNotMatch(message.html, /verify-email\?token=/u);
});
