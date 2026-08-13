import assert from "node:assert/strict";
import test from "node:test";

import {
    chapterContentHash,
    shouldCreateDraftRevision,
} from "./revision-policy.js";

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
