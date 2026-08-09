import assert from "node:assert/strict";
import test from "node:test";

import { isAtLeastAge } from "./mature.policy.js";

void test("age policy accepts an account on its eighteenth birthday", () => {
    assert.equal(
        isAtLeastAge(
            new Date("2008-08-09T00:00:00.000Z"),
            18,
            new Date("2026-08-09T12:00:00.000Z"),
        ),
        true,
    );
});

void test("age policy rejects an account one day before its eighteenth birthday", () => {
    assert.equal(
        isAtLeastAge(
            new Date("2008-08-10T00:00:00.000Z"),
            18,
            new Date("2026-08-09T12:00:00.000Z"),
        ),
        false,
    );
});

void test("age policy handles leap-day birthdays without granting access early", () => {
    assert.equal(
        isAtLeastAge(
            new Date("2008-02-29T00:00:00.000Z"),
            18,
            new Date("2026-02-28T12:00:00.000Z"),
        ),
        false,
    );
    assert.equal(
        isAtLeastAge(
            new Date("2008-02-29T00:00:00.000Z"),
            18,
            new Date("2026-03-01T00:00:00.000Z"),
        ),
        true,
    );
});
