import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIranianMobile } from "./phone-number.js";

void test("accepts normal Iranian mobile format", () => {
    assert.equal(
        normalizeIranianMobile("09123456789"),
        "09123456789",
    );
});

void test("converts +98 format to local format", () => {
    assert.equal(
        normalizeIranianMobile("+989123456789"),
        "09123456789",
    );
}); 

void test("converts 0098 format to local format", () => {
    assert.equal(
        normalizeIranianMobile("00989123456789"),
        "09123456789",
    );
});

void test("converts 98 format to local format", () => {
    assert.equal(
        normalizeIranianMobile("989123456789"),
        "09123456789",
    );
});

void test("rejects non-Iranian numbers", () => {
    assert.equal(
        normalizeIranianMobile("+33612345678"),
        null,
    );
});

void test("rejects Iranian landlines", () => {
    assert.equal(
        normalizeIranianMobile("02188776655"),
        null,
    );
});

void test("rejects malformed mobile numbers", () => {
    assert.equal(
        normalizeIranianMobile("09123"),
        null,
    );
});