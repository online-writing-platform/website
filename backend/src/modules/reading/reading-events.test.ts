import assert from "node:assert/strict";
import test from "node:test";

import {
    readSignalBucket,
    shouldRecordMeaningfulHistory,
} from "./reading-events.js";

void test("history records chapter transitions, long resumes, and completion only", () => {
    const now = new Date("2026-08-13T12:00:00.000Z");
    assert.equal(
        shouldRecordMeaningfulHistory({
            previousChapterId: "a",
            nextChapterId: "a",
            previousReadAt: new Date("2026-08-13T11:58:00.000Z"),
            now,
            completed: false,
        }),
        false,
    );
    assert.equal(
        shouldRecordMeaningfulHistory({
            previousChapterId: "a",
            nextChapterId: "b",
            previousReadAt: new Date("2026-08-13T11:58:00.000Z"),
            now,
            completed: false,
        }),
        true,
    );
    assert.equal(
        shouldRecordMeaningfulHistory({
            previousChapterId: "a",
            nextChapterId: "a",
            previousReadAt: new Date("2026-08-12T11:00:00.000Z"),
            now,
            completed: false,
        }),
        true,
    );
    assert.equal(
        shouldRecordMeaningfulHistory({
            previousChapterId: "a",
            nextChapterId: "a",
            previousReadAt: new Date("2026-08-13T11:58:00.000Z"),
            now,
            completed: true,
        }),
        true,
    );
});

void test("qualified views deduplicate into deterministic time buckets", () => {
    assert.equal(
        readSignalBucket(new Date("2026-08-13T12:14:59.999Z"), 15),
        "2026-08-13T12:00:00.000Z",
    );
    assert.equal(
        readSignalBucket(new Date("2026-08-13T12:15:00.000Z"), 15),
        "2026-08-13T12:15:00.000Z",
    );
});
