import assert from "node:assert/strict";
import test from "node:test";

import { countWords } from "./story.policy.js";

void test("counts whitespace-separated words", () => {
    assert.equal(countWords("one two\nthree"), 3);
});

void test("returns zero for empty chapter content", () => {
    assert.equal(countWords("   \n\t  "), 0);
});

void test("counts Persian text without requiring locale-specific tokenization", () => {
    assert.equal(countWords("سلام دنیا این یک تست است"), 6);
});
