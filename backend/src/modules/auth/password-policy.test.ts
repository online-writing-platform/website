import assert from "node:assert/strict";
import test from "node:test";

import {
    getPasswordPolicyViolations,
    validateBirthDate,
} from "./auth.security.js";

void test("accepts a password that satisfies the policy", () => {
    assert.deepEqual(
        getPasswordPolicyViolations("Novel@River2026", "RominWriter"),
        [],
    );
});

void test("rejects a password containing the username", () => {
    assert.ok(
        getPasswordPolicyViolations("RominWriter@2026", "RominWriter").includes(
            "CONTAINS_USERNAME",
        ),
    );
});

void test("validates the minimum account age at the birthday boundary", () => {
    const today = new Date(Date.UTC(2026, 7, 9));

    assert.equal(validateBirthDate("2013-08-09", today).valid, true);

    const tooYoung = validateBirthDate("2013-08-10", today);

    assert.deepEqual(tooYoung, {
        valid: false,
        reason: "AGE_REQUIREMENT_NOT_MET",
    });
});
