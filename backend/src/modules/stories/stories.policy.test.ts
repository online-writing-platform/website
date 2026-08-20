import { isAtLeastAge } from "./stories.policy.js";
import { chapterContentHash, shouldCreateDraftRevision } from "./stories.policy.js";
import { countWords } from "./stories.policy.js";
import assert from "node:assert/strict";
import test from "node:test";

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

void test("counts whitespace-separated words", () => {
    assert.equal(countWords("one two\nthree"), 3);
});

void test("returns zero for empty chapter content", () => {
    assert.equal(countWords("   \n\t  "), 0);
});

void test("counts Persian text without requiring locale-specific tokenization", () => {
    assert.equal(countWords("سلام دنیا این یک تست است"), 6);
});

void test("draft autosaves snapshot only changed content after the fixed interval", () => {
    const now = new Date("2026-08-13T10:10:00.000Z");
    const previousHash = chapterContentHash("Title", "old body");

    assert.equal(
        shouldCreateDraftRevision({
            currentHash: previousHash,
            incomingHash: previousHash,
            lastRevisionAt: new Date("2026-08-13T09:00:00.000Z"),
            now,
            minimumIntervalMs: 5 * 60_000,
        }),
        false,
    );
    assert.equal(
        shouldCreateDraftRevision({
            currentHash: previousHash,
            incomingHash: chapterContentHash("Title", "new body"),
            lastRevisionAt: new Date("2026-08-13T10:08:00.000Z"),
            now,
            minimumIntervalMs: 5 * 60_000,
        }),
        false,
    );
    assert.equal(
        shouldCreateDraftRevision({
            currentHash: previousHash,
            incomingHash: chapterContentHash("Title", "new body"),
            lastRevisionAt: new Date("2026-08-13T10:00:00.000Z"),
            now,
            minimumIntervalMs: 5 * 60_000,
        }),
        true,
    );
});

void test("publish and restore checkpoints are always forced", () => {
    assert.equal(
        shouldCreateDraftRevision({
            currentHash: "same",
            incomingHash: "same",
            lastRevisionAt: new Date(),
            now: new Date(),
            minimumIntervalMs: 300_000,
            force: true,
        }),
        true,
    );
});
