import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSearchText } from "./search-normalize.js";

void test("normalizes Persian and Arabic letter and digit variants", () => {
    assert.equal(normalizeSearchText("  ي كۀ ۱۲۳٤٥  "), "ی که 12345");
});

void test("removes combining marks and normalizes English case and whitespace", () => {
    assert.equal(normalizeSearchText("CAFÉ\t Story\n"), "cafe story");
});
